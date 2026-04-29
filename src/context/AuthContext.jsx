import { createContext, useContext, useState, useEffect } from "react";
import { gmailSignupErrorMessage, isGmailAddress } from "../lib/emailPolicy";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { collection, doc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { auth, db, isFirebaseConfigured } from "../lib/firebase";
import { triggerVerifiedOnboardingEmails } from "../lib/emailService";
import { createProfileAfterSignup, getProfileByEmail, getProfileForUser } from "../lib/profileService";

const AuthContext = createContext(null);
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "jiyanshudhaka20@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

function getCachedSessionUser() {
  if (isFirebaseConfigured) return null;
  try {
    const cached = sessionStorage.getItem("moveasy_session_user");
    return cached ? JSON.parse(cached) : null;
  } catch {
    sessionStorage.removeItem("moveasy_session_user");
    return null;
  }
}

function ensureLocalAccounts() {
  const users = getUsers();
  for (const adminEmail of ADMIN_EMAILS) {
    users[adminEmail] = { ...(users[adminEmail] || {}), name: users[adminEmail]?.name || "MovEasy Admin", role: "admin" };
  }
  saveUsers(users);
  return users;
}

function getUsers() {
  try { return JSON.parse(localStorage.getItem("moveasy_users") || "{}"); } catch { return {}; }
}
function saveUsers(users) { localStorage.setItem("moveasy_users", JSON.stringify(users)); }
function getSellerRequests() {
  try { return JSON.parse(localStorage.getItem("moveasy_seller_requests") || "[]"); } catch { return []; }
}
function saveSellerRequests(r) { localStorage.setItem("moveasy_seller_requests", JSON.stringify(r)); }

function normalizeSellerBadgeStatus(value) {
  if (value === "verified") return "verified";
  if (value === "pending") return "pending";
  if (value === "rejected") return "rejected";
  return "none";
}

function isE2EAuthBypassEnabled() {
  return import.meta.env.MODE !== "production" && localStorage.getItem("moveasy_e2e_auth_bypass") === "1";
}

function getE2EVerifiedAccounts() {
  try { return JSON.parse(localStorage.getItem("moveasy_e2e_verified") || "{}"); } catch { return {}; }
}

function saveE2EVerifiedAccounts(value) {
  localStorage.setItem("moveasy_e2e_verified", JSON.stringify(value));
}

function normalizeFirebaseError(error) {
  const code = error?.code || "";
  if (code === "auth/invalid-credential" || code === "auth/wrong-password" || code === "auth/user-not-found") {
    return "Invalid email or password.";
  }
  if (code === "auth/email-already-in-use") return "Email already in use. Please login.";
  if (code === "auth/invalid-email") return "Invalid email address.";
  if (code === "auth/weak-password") return "Password is too weak.";
  if (code === "auth/too-many-requests") return "Too many attempts. Try again later.";
  return error?.message || "Authentication failed. Please try again.";
}


export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getCachedSessionUser());
  const [loading, setLoading] = useState(() => isFirebaseConfigured);
  const [pendingSellerBadgeApplications, setPendingSellerBadgeApplications] = useState([]);

  const loadPendingSellerBadgeApplications = async () => {
    if (!isFirebaseConfigured) return;
    const badgeQuery = query(collection(db, "userProfiles"), where("sellerBadgeStatus", "==", "pending"));
    const snap = await getDocs(badgeQuery);
    setPendingSellerBadgeApplications(snap.docs.map((profileDoc) => {
      const data = profileDoc.data();
      return { uid: profileDoc.id, email: data.email, name: data.name || String(data.email || "seller").split("@")[0], application: data.sellerBadgeApplication || null };
    }));
  };

  useEffect(() => {
    if (!isFirebaseConfigured) {
      ensureLocalAccounts();
      setLoading(false);
      return undefined;
    }
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser || !firebaseUser.emailVerified) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const profile = await getProfileForUser(firebaseUser);
        setUser({ email: profile.email, role: profile.role || "customer", name: profile.name });
        if (profile.role === "admin") loadPendingSellerBadgeApplications();
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const login = async (email, password) => {
    const e = email.toLowerCase().trim();

    if (isE2EAuthBypassEnabled()) {
      const users = getUsers();
      const verified = getE2EVerifiedAccounts();
      if (!users[e]) return { success: false, error: "Invalid email or password." };
      if (!verified[e]) {
        return {
          success: false,
          error: "Please verify your email first. Check your inbox and spam for a message from Firebase / Google.",
          unverified: true,
        };
      }
      const u = { email: e, role: users[e].role || "customer", name: users[e].name || e.split("@")[0] };
      setUser(u);
      return { success: true, role: u.role };
    }
    
    if (!isFirebaseConfigured) {
      const users = ensureLocalAccounts();
      const local = users[e];
      if (!local || local.password !== password) return { success: false, error: "Invalid email or password." };
      const u = { email: e, role: local.role || "customer", name: local.name || e.split("@")[0] };
      setUser(u);
      sessionStorage.setItem("moveasy_session_user", JSON.stringify(u));
      return { success: true, role: u.role };
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, e, password);
      if (!cred.user.emailVerified) {
        await signOut(auth);
        return {
          success: false,
          error: "Please verify your email first. Check your inbox and spam for a message from Firebase / Google.",
          unverified: true,
        };
      }
      const profile = await getProfileForUser(cred.user);
      const u = { email: e, role: profile.role || "customer", name: profile.name || e.split("@")[0] };
      setUser(u);
      const onboardingEmail = await triggerVerifiedOnboardingEmails({ firebaseUser: cred.user, profile });
      return {
        success: true,
        role: u.role,
        emailWarning: onboardingEmail.ok || onboardingEmail.alreadySent
          ? ""
          : onboardingEmail.error || "Welcome email is queued for retry.",
      };
    } catch (error) {
      return { success: false, error: normalizeFirebaseError(error) };
    }
  };

  const resendVerificationEmail = async (email, password) => {
    const e = email.toLowerCase().trim();
    if (isE2EAuthBypassEnabled()) {
      const verified = getE2EVerifiedAccounts();
      verified[e] = true;
      saveE2EVerifiedAccounts(verified);
      return { success: true, info: "We sent another verification email. Check spam if you do not see it." };
    }
    if (!isFirebaseConfigured) {
      return { success: false, error: "Firebase is not configured." };
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, e, password);
      if (cred.user.emailVerified) {
        await signOut(auth);
        return { success: false, error: "This account is already verified. Sign in normally." };
      }
      await sendEmailVerification(cred.user);
      await signOut(auth);
      return { success: true, info: "We sent another verification email. Check spam if you do not see it." };
    } catch (error) {
      return { success: false, error: normalizeFirebaseError(error) };
    }
  };

  const signup = async (email, password, name, role = "customer") => {
    const e = email.toLowerCase().trim();
    if (!isGmailAddress(e)) return { success: false, error: gmailSignupErrorMessage() };
    const users = getUsers();
    const normalizedRole = role === "seller" ? "seller" : "customer";
    if (isE2EAuthBypassEnabled()) {
      if (users[e]) return { success: false, error: "Account already exists. Please login." };
      users[e] = {
        name: name || e.split("@")[0],
        role: normalizedRole,
        sellerBadgeStatus: normalizedRole === "seller" ? "none" : undefined,
      };
      saveUsers(users);
      return {
        success: true,
        requiresVerification: true,
        info: "We sent a verification link to your email (from Firebase). Open it, then return here and sign in.",
      };
    }
    if (!isFirebaseConfigured) {
      if (users[e]) return { success: false, error: "Account already exists. Please login." };
      users[e] = {
        name: name || e.split("@")[0],
        role: normalizedRole,
        password,
        sellerBadgeStatus: normalizedRole === "seller" ? "none" : undefined,
      };
      saveUsers(users);
      const u = { email: e, role: normalizedRole, name: users[e].name };
      setUser(u);
      sessionStorage.setItem("moveasy_session_user", JSON.stringify(u));
      return { success: true, role: normalizedRole };
    }
    try {
      const cred = await createUserWithEmailAndPassword(auth, e, password);
      await createProfileAfterSignup({ firebaseUser: cred.user, name: name || e.split("@")[0], role: normalizedRole });
      await sendEmailVerification(cred.user);
      await signOut(auth);
      return {
        success: true,
        requiresVerification: true,
        info: "We sent a verification link to your email (from Firebase). Open it, then return here and sign in.",
      };
    } catch (error) {
      return { success: false, error: normalizeFirebaseError(error) };
    }
  };

  const getPendingSellerBadgeApplications = () => {
    if (isFirebaseConfigured) return pendingSellerBadgeApplications;
    const users = getUsers();
    return Object.entries(users)
      .filter(([, value]) => (value.role || "customer") === "seller" && normalizeSellerBadgeStatus(value.sellerBadgeStatus) === "pending")
      .map(([email, value]) => ({
        email,
        name: value.name || email.split("@")[0],
        application: value.sellerBadgeApplication || null,
      }));
  };

  const submitSellerBadgeApplication = async ({ phone, businessName, gst }) => {
    if (!user?.email) return { success: false, error: "Not signed in." };
    if (isFirebaseConfigured) {
      const profile = await getProfileByEmail(user.email);
      if (!profile || profile.role !== "seller") return { success: false, error: "Only seller accounts can request a verified badge." };
      if (normalizeSellerBadgeStatus(profile.sellerBadgeStatus) === "verified") return { success: false, error: "You are already verified." };
      if (!String(phone || "").trim() || !String(businessName || "").trim()) return { success: false, error: "Business name and phone are required." };
      await updateDoc(doc(db, "userProfiles", profile.uid), {
        sellerBadgeStatus: "pending",
        sellerBadgeApplication: { phone: String(phone).trim(), businessName: String(businessName).trim(), gst: String(gst || "").trim(), submittedAt: new Date().toISOString() },
        updatedAt: serverTimestamp(),
      });
      return { success: true };
    }
    const users = getUsers();
    const row = users[user.email];
    if (!row || (row.role || "customer") !== "seller") {
      return { success: false, error: "Only seller accounts can request a verified badge." };
    }
    if (normalizeSellerBadgeStatus(row.sellerBadgeStatus) === "verified") {
      return { success: false, error: "You are already verified." };
    }
    if (!String(phone || "").trim() || !String(businessName || "").trim()) {
      return { success: false, error: "Business name and phone are required." };
    }
    users[user.email] = {
      ...row,
      sellerBadgeStatus: "pending",
      sellerBadgeApplication: {
        phone: String(phone).trim(),
        businessName: String(businessName).trim(),
        gst: String(gst || "").trim(),
        submittedAt: new Date().toISOString(),
      },
    };
    saveUsers(users);
    return { success: true };
  };

  const approveSellerBadge = async (email) => {
    const e = String(email).toLowerCase().trim();
    if (isFirebaseConfigured) {
      const profile = await getProfileByEmail(e);
      if (!profile) return false;
      await updateDoc(doc(db, "userProfiles", profile.uid), { sellerBadgeStatus: "verified", sellerBadgeVerifiedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await loadPendingSellerBadgeApplications();
      return true;
    }
    const users = getUsers();
    if (!users[e]) return false;
    users[e] = {
      ...users[e],
      sellerBadgeStatus: "verified",
      sellerBadgeVerifiedAt: new Date().toISOString(),
    };
    saveUsers(users);
    return true;
  };

  const rejectSellerBadge = async (email) => {
    const e = String(email).toLowerCase().trim();
    if (isFirebaseConfigured) {
      const profile = await getProfileByEmail(e);
      if (!profile) return false;
      await updateDoc(doc(db, "userProfiles", profile.uid), { sellerBadgeStatus: "rejected", sellerBadgeRejectedAt: serverTimestamp(), updatedAt: serverTimestamp() });
      await loadPendingSellerBadgeApplications();
      return true;
    }
    const users = getUsers();
    if (!users[e]) return false;
    users[e] = {
      ...users[e],
      sellerBadgeStatus: "rejected",
      sellerBadgeRejectedAt: new Date().toISOString(),
    };
    saveUsers(users);
    return true;
  };

  const requestSeller = () => {
    if (!user) return;
    const requests = getSellerRequests();
    if (requests.find((r) => r.email === user.email)) return;
    requests.push({ email: user.email, name: user.name, date: new Date().toISOString(), status: "pending" });
    saveSellerRequests(requests);
  };

  const approveSeller = async (email) => {
    const e = String(email).toLowerCase().trim();
    if (isFirebaseConfigured) {
      const profile = await getProfileByEmail(e);
      if (profile) await setDoc(doc(db, "userRoles", profile.uid), { uid: profile.uid, email: e, role: "seller", updatedAt: serverTimestamp() }, { merge: true });
      return;
    }
    const users = getUsers();
    if (users[e]) { users[e].role = "seller"; saveUsers(users); }
    const requests = getSellerRequests();
    saveSellerRequests(requests.map((r) => r.email === e ? { ...r, status: "approved" } : r));
  };

  const rejectSeller = (email) => {
    const e = String(email).toLowerCase().trim();
    const requests = getSellerRequests();
    saveSellerRequests(requests.map((r) => r.email === e ? { ...r, status: "rejected" } : r));
  };

  const logout = async () => {
    setUser(null);
    sessionStorage.removeItem("moveasy_session_user");
    if (isFirebaseConfigured) {
      try { await signOut(auth); } catch { /* noop */ }
    }
  };

  const refreshRole = () => {
    if (!user) return;
    if (isFirebaseConfigured) {
      auth.currentUser && getProfileForUser(auth.currentUser).then((profile) => {
        if (profile.role !== user.role) setUser({ email: profile.email, role: profile.role, name: profile.name });
      }).catch(() => undefined);
      return;
    }
    const users = getUsers();
    const u = users[user.email];
    if (u && u.role !== user.role) {
      const updated = { ...user, role: u.role };
      setUser(updated);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
      resendVerificationEmail,
      logout,
      requestSeller,
      approveSeller,
      rejectSeller,
      refreshRole,
      getSellerRequests,
      getPendingSellerBadgeApplications,
      submitSellerBadgeApplication,
      approveSellerBadge,
      rejectSellerBadge,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

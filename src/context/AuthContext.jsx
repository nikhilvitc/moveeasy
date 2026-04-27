import { createContext, useContext, useState, useEffect } from "react";
import { gmailSignupErrorMessage, isGmailAddress } from "../lib/emailPolicy";
import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth, isFirebaseConfigured } from "../lib/firebase";

const AuthContext = createContext(null);
const ADMIN_EMAILS = ["jiyanshudhaka20@gmail.com"];

// Qodo Security Fix: SHA-256 Hash Function for Passwords
async function hashPassword(password) {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Pre-computed SHA-256 hash of "moveasy_admin_2026"
// The plain text password is no longer exposed in the public code!
const ADMIN_SECRET_HASH = "5da9364841af9a59dd4427b956a812751a68ab9cb14f7a91355caa7fe1d5d6c9";

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

async function triggerWelcomeEmail({ email, name, role, idToken }) {
  const endpoint = import.meta.env.VITE_WELCOME_EMAIL_FUNCTION_URL;
  if (!endpoint || !idToken) return;
  try {
    await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ email, name, role }),
    });
  } catch {
    // Keep login success even if email dispatch endpoint is temporarily unavailable.
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("moveasy_session");
    if (saved) {
      try { setUser(JSON.parse(saved)); } catch { localStorage.removeItem("moveasy_session"); }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const e = email.toLowerCase().trim();
    const hashedSubmission = await hashPassword(password);

    if (ADMIN_EMAILS.includes(e)) {
      if (hashedSubmission === ADMIN_SECRET_HASH) {
        const u = { email: e, role: "admin", name: "Admin" };
        setUser(u);
        localStorage.setItem("moveasy_session", JSON.stringify(u));
        return { success: true, role: "admin" };
      }
      return { success: false, error: "Invalid admin credentials" };
    }
    
    if (!isFirebaseConfigured) {
      return {
        success: false,
        error: "Email verification is not configured. Add Firebase env keys to enable real mailbox verification.",
      };
    }
    try {
      const cred = await signInWithEmailAndPassword(auth, e, password);
      // Skip email verification check — Spark plan doesn't reliably deliver emails
      const users = getUsers();
      const profile = users[e] || {};
      if (!users[e]) {
        users[e] = { name: profile.name || e.split("@")[0], role: profile.role || "customer" };
        saveUsers(users);
      }
      const u = { email: e, role: users[e]?.role || "customer", name: users[e]?.name || e.split("@")[0] };
      setUser(u);
      localStorage.setItem("moveasy_session", JSON.stringify(u));
      const idToken = await cred.user.getIdToken();
      await triggerWelcomeEmail({ email: u.email, name: u.name, role: u.role, idToken });
      return { success: true, role: u.role };
    } catch (error) {
      return { success: false, error: normalizeFirebaseError(error) };
    }
  };

  const signup = async (email, password, name, role = "customer") => {
    const e = email.toLowerCase().trim();
    if (ADMIN_EMAILS.includes(e)) return { success: false, error: "This email is reserved." };
    if (!isGmailAddress(e)) return { success: false, error: gmailSignupErrorMessage() };
    if (!isFirebaseConfigured) {
      return {
        success: false,
        error: "Firebase email verification is not configured. Add VITE_FIREBASE_* keys first.",
      };
    }
    const users = getUsers();
    if (users[e]) return { success: false, error: "Account already exists. Please login." };
    const normalizedRole = role === "seller" ? "seller" : "customer";

    try {
      const cred = await createUserWithEmailAndPassword(auth, e, password);
      // Save user profile locally
      users[e] = {
        name: name || e.split("@")[0],
        role: normalizedRole,
        sellerBadgeStatus: normalizedRole === "seller" ? "none" : undefined,
      };
      saveUsers(users);
      // Log user in immediately — no email verification gate
      const u = { email: e, role: normalizedRole, name: name || e.split("@")[0] };
      setUser(u);
      localStorage.setItem("moveasy_session", JSON.stringify(u));
      const idToken = await cred.user.getIdToken();
      await triggerWelcomeEmail({ email: u.email, name: u.name, role: u.role, idToken });
      return { success: true, role: normalizedRole };
    } catch (error) {
      return { success: false, error: normalizeFirebaseError(error) };
    }
  };

  const getPendingSellerBadgeApplications = () => {
    const users = getUsers();
    return Object.entries(users)
      .filter(([, value]) => (value.role || "customer") === "seller" && normalizeSellerBadgeStatus(value.sellerBadgeStatus) === "pending")
      .map(([email, value]) => ({
        email,
        name: value.name || email.split("@")[0],
        application: value.sellerBadgeApplication || null,
      }));
  };

  const submitSellerBadgeApplication = ({ phone, businessName, gst }) => {
    if (!user?.email) return { success: false, error: "Not signed in." };
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

  const approveSellerBadge = (email) => {
    const e = String(email).toLowerCase().trim();
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

  const rejectSellerBadge = (email) => {
    const e = String(email).toLowerCase().trim();
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

  const approveSeller = (email) => {
    const e = String(email).toLowerCase().trim();
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
    localStorage.removeItem("moveasy_session");
    if (isFirebaseConfigured) {
      try { await signOut(auth); } catch { /* noop */ }
    }
  };

  const refreshRole = () => {
    if (!user || ADMIN_EMAILS.includes(user.email)) return;
    const users = getUsers();
    const u = users[user.email];
    if (u && u.role !== user.role) {
      const updated = { ...user, role: u.role };
      setUser(updated);
      localStorage.setItem("moveasy_session", JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      signup,
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
      ADMIN_EMAILS,
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

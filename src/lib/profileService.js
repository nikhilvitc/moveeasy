import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";

const PROFILE_FUNCTION_URL = import.meta.env.VITE_CREATE_PROFILE_FUNCTION_URL || "";
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "jiyanshudhaka20@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

export async function createProfileAfterSignup({ firebaseUser, name, role }) {
  const email = firebaseUser.email.toLowerCase().trim();
  const normalizedRole = role === "seller" ? "seller" : "customer";

  if (PROFILE_FUNCTION_URL) {
    const token = await firebaseUser.getIdToken(true);
    const res = await fetch(PROFILE_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, role: normalizedRole }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Profile service returned ${res.status}`);
  } else {
    await Promise.all([
      setDoc(doc(db, "userProfiles", firebaseUser.uid), {
        uid: firebaseUser.uid,
        email,
        name: name || email.split("@")[0],
        sellerBadgeStatus: normalizedRole === "seller" ? "none" : null,
        updatedAt: serverTimestamp(),
      }, { merge: true }),
      setDoc(doc(db, "userRoles", firebaseUser.uid), {
        uid: firebaseUser.uid,
        email,
        role: normalizedRole,
        updatedAt: serverTimestamp(),
      }, { merge: true }),
    ]);
  }

}

export async function getProfileForUser(firebaseUser) {
  const email = firebaseUser.email.toLowerCase().trim();
  if (ADMIN_EMAILS.includes(email)) {
    return { email, name: "MovEasy Admin", role: "admin", sellerBadgeStatus: null };
  }

  const [profileSnap, roleSnap] = await Promise.all([
    getDoc(doc(db, "userProfiles", firebaseUser.uid)),
    getDoc(doc(db, "userRoles", firebaseUser.uid)),
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const roleRow = roleSnap.exists() ? roleSnap.data() : {};
  const role = ["admin", "seller", "customer"].includes(roleRow.role) ? roleRow.role : "customer";
  const name = profile.name || firebaseUser.displayName || email.split("@")[0];

  return { email, name, role, sellerBadgeStatus: profile.sellerBadgeStatus ?? null };
}

export async function getProfileByEmail(email) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return null;
  const profileQuery = query(collection(db, "userProfiles"), where("email", "==", normalized));
  const profileSnap = await getDocs(profileQuery);
  if (profileSnap.empty) return null;
  const profileDoc = profileSnap.docs[0];
  const roleSnap = await getDoc(doc(db, "userRoles", profileDoc.id));
  const profile = profileDoc.data();
  const roleRow = roleSnap.exists() ? roleSnap.data() : {};
  return { uid: profileDoc.id, email: normalized, name: profile.name || normalized.split("@")[0], role: roleRow.role || "customer", ...profile };
}

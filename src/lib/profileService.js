import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { db } from "./firebase";

const PROFILE_FUNCTION_URL = import.meta.env.VITE_CREATE_PROFILE_FUNCTION_URL || "";
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "jiyanshudhaka20@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

export async function createProfileAfterSignup({ firebaseUser, name, role, phone }) {
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
      body: JSON.stringify({ name, role: normalizedRole, phone }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Profile service returned ${res.status}`);
  } else {
    await Promise.all([
      setDoc(doc(db, "userProfiles", firebaseUser.uid), {
        uid: firebaseUser.uid,
        email,
        name: name || email.split("@")[0],
        phone: phone || "",
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
    return { email, name: "MovEasy Admin", role: "admin", sellerBadgeStatus: null, phone: "", uid: firebaseUser.uid };
  }

  const [profileSnap, roleSnap] = await Promise.all([
    getDoc(doc(db, "userProfiles", firebaseUser.uid)),
    getDoc(doc(db, "userRoles", firebaseUser.uid)),
  ]);

  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const roleRow = roleSnap.exists() ? roleSnap.data() : {};
  const role = ["admin", "seller", "customer"].includes(roleRow.role) ? roleRow.role : "customer";
  const name = profile.name || firebaseUser.displayName || email.split("@")[0];
  const phone = profile.phone || firebaseUser.phoneNumber || "";

  return { uid: firebaseUser.uid, email, name, role, phone, sellerBadgeStatus: profile.sellerBadgeStatus ?? null };
}

/**
 * Every verified sign-in should have userProfiles + userRoles so Admin "User Management" lists customers.
 * Accounts created before this fix, or outside the signup flow, may be missing these docs.
 */
export async function ensureUserProfileDocuments(firebaseUser) {
  if (!firebaseUser?.email) return;
  const email = firebaseUser.email.toLowerCase().trim();
  const uid = firebaseUser.uid;
  const [profileSnap, roleSnap] = await Promise.all([
    getDoc(doc(db, "userProfiles", uid)),
    getDoc(doc(db, "userRoles", uid)),
  ]);

  if (ADMIN_EMAILS.includes(email)) {
    const profile = profileSnap.exists() ? profileSnap.data() : {};
    await setDoc(
      doc(db, "userRoles", uid),
      { uid, email, role: "admin", updatedAt: serverTimestamp() },
      { merge: true }
    );
    await setDoc(
      doc(db, "userProfiles", uid),
      {
        uid,
        email,
        name: profile.name || firebaseUser.displayName || email.split("@")[0],
        phone: profile.phone || "",
        sellerBadgeStatus: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    return;
  }

  const profile = profileSnap.exists() ? profileSnap.data() : {};
  const roleRow = roleSnap.exists() ? roleSnap.data() : {};
  const roleFromDb = ["admin", "seller", "customer"].includes(roleRow.role) ? roleRow.role : null;
  const role = roleFromDb || "customer";
  const name = profile.name || firebaseUser.displayName || email.split("@")[0];
  const phone = profile.phone || firebaseUser.phoneNumber || "";

  const writes = [];
  if (!profileSnap.exists()) {
    writes.push(
      setDoc(
        doc(db, "userProfiles", uid),
        {
          uid,
          email,
          name,
          phone,
          sellerBadgeStatus: role === "seller" ? "none" : null,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
  } else if (!String(profile.phone || "").trim() && firebaseUser.phoneNumber) {
    writes.push(
      setDoc(
        doc(db, "userProfiles", uid),
        { phone: firebaseUser.phoneNumber, updatedAt: serverTimestamp() },
        { merge: true }
      )
    );
  }

  if (!roleSnap.exists()) {
    writes.push(
      setDoc(
        doc(db, "userRoles", uid),
        {
          uid,
          email,
          role,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    );
  }

  if (writes.length) await Promise.all(writes);
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

import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { getProfileByEmail } from "./profileService";
import listingsData from "../data/listingsData";

const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "jiyanshudhaka20@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

export async function uploadListingFiles(files = [], listingId = crypto.randomUUID()) {
  const uploads = Array.from(files).filter(Boolean).map(async (file) => {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
    const fileRef = ref(storage, `listing-images/${listingId}/${Date.now()}-${safeName}`);
    await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
    return getDownloadURL(fileRef);
  });
  return Promise.all(uploads);
}

export async function getListingsData() {
  const snap = await getDocs(query(collection(db, "listings"), orderBy("updatedAt", "desc")));
  const firestoreListings = snap.docs.map((listingDoc) => ({ id: listingDoc.id, ...listingDoc.data() }));
  // Always include the 50+ sample listings from the Lovable prototype
  return [...firestoreListings, ...listingsData];
}

export async function upsertListingData(listing, actor) {
  const id = String(listing.id || crypto.randomUUID());
  const payload = {
    ...listing,
    id,
    ownerEmail: listing.ownerEmail || listing.sellerEmail || actor?.email || "",
    sellerEmail: listing.sellerEmail || actor?.email || "",
    lat: Number(listing.lat || 12.9716),
    lng: Number(listing.lng || 77.5946),
    monthlyRent: Number(listing.monthlyRent || 0),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "listings", id), payload, { merge: true });
  return { ...payload, updatedAt: new Date().toISOString() };
}

export async function removeListingData(id) {
  await deleteDoc(doc(db, "listings", String(id)));
}

export async function getAssignmentsData() {
  const snap = await getDocs(query(collection(db, "assignments"), orderBy("createdAt", "desc")));
  return snap.docs.map((assignmentDoc) => ({ id: assignmentDoc.id, ...assignmentDoc.data() }));
}

export async function addAssignmentData({ listingId, customerEmail, sellerEmail, notes, createdBy }) {
  const record = { listingId: String(listingId), customerEmail, sellerEmail, notes: notes || "", status: "assigned", createdBy, createdAt: serverTimestamp() };
  const refDoc = await addDoc(collection(db, "assignments"), record);
  await updateDoc(doc(db, "listings", String(listingId)), { assignedCustomerEmail: customerEmail, assignedSellerEmail: sellerEmail, updatedAt: serverTimestamp() });
  return { id: refDoc.id, ...record, createdAt: new Date().toISOString() };
}

export async function getAllUsersData() {
  const [profilesSnap, rolesSnap] = await Promise.all([getDocs(collection(db, "userProfiles")), getDocs(collection(db, "userRoles"))]);
  const roles = new Map(rolesSnap.docs.map((roleDoc) => [roleDoc.id, roleDoc.data().role || "customer"]));
  return [
    ...ADMIN_EMAILS.map((email) => ({ uid: "reserved-admin", email, name: "MovEasy Admin", role: "admin" })),
    ...profilesSnap.docs.map((profileDoc) => {
      const profile = profileDoc.data();
      return { uid: profileDoc.id, email: profile.email, name: profile.name || String(profile.email || "user").split("@")[0], role: roles.get(profileDoc.id) || "customer", ...profile };
    }),
  ];
}

export async function addUserProfileData(email, name, role) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return;
  const existing = await getProfileByEmail(normalized);
  const uid = existing?.uid || crypto.randomUUID();
  await Promise.all([
    setDoc(doc(db, "userProfiles", uid), { uid, email: normalized, name: name || normalized.split("@")[0], sellerBadgeStatus: role === "seller" ? "none" : null, updatedAt: serverTimestamp() }, { merge: true }),
    setDoc(doc(db, "userRoles", uid), { uid, email: normalized, role: role === "admin" ? "admin" : role === "seller" ? "seller" : "customer", updatedAt: serverTimestamp() }, { merge: true }),
  ]);
}

export async function removeUserProfileData(email) {
  const profile = await getProfileByEmail(email);
  if (!profile) return;
  await Promise.all([deleteDoc(doc(db, "userProfiles", profile.uid)), deleteDoc(doc(db, "userRoles", profile.uid))]);
}

export async function getSellerRequestsData() {
  const snap = await getDocs(query(collection(db, "sellerRequests"), where("status", "==", "pending")));
  return snap.docs.map((requestDoc) => ({ id: requestDoc.id, ...requestDoc.data() }));
}

export async function addSellerRequestData(user) {
  if (!user?.email) return;
  await setDoc(doc(db, "sellerRequests", user.email), { email: user.email, name: user.name || user.email.split("@")[0], status: "pending", updatedAt: serverTimestamp() }, { merge: true });
}

export async function getVisitsData() {
  const snap = await getDocs(query(collection(db, "visits"), orderBy("createdAt", "desc")));
  return snap.docs.map((visitDoc) => ({ id: visitDoc.id, ...visitDoc.data() }));
}

export async function addVisitRequestData({ listingId, customerEmail, customerPhone, sellerEmail, visitTime, notes }) {
  const record = {
    listingId: String(listingId),
    customerEmail,
    customerPhone: customerPhone || "",
    sellerEmail,
    visitTime: visitTime || "",
    notes: notes || "",
    status: "pending",
    createdAt: serverTimestamp(),
  };
  const refDoc = await addDoc(collection(db, "visits"), record);
  return { id: refDoc.id, ...record, createdAt: new Date().toISOString() };
}

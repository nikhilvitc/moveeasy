import { addDoc, collection, deleteDoc, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { getProfileByEmail } from "./profileService";
import listingsData from "../data/listingsData";

const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "jiyanshudhaka20@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

/** Shown on map / discovery; withdrawn = off-market (seller hid listing; admin can still delete doc). */
export function isListingPubliclyVisible(listing) {
  const s = String(listing?.marketStatus || "published").toLowerCase();
  return s !== "withdrawn" && s !== "archived";
}

export async function uploadListingFiles(files = [], listingId = crypto.randomUUID()) {
  const uploads = Array.from(files).filter(Boolean).map(async (file) => {
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, "-").toLowerCase();
    const fileRef = ref(storage, `listing-images/${listingId}/${Date.now()}-${safeName}`);
    await uploadBytes(fileRef, file, { contentType: file.type || "application/octet-stream" });
    return getDownloadURL(fileRef);
  });
  return Promise.all(uploads);
}

export async function getListingsData(options = {}) {
  const { limitCount = 100, bhk, maxRent } = options;

  const col = collection(db, "listings");
  const published = where("marketStatus", "==", "published");
  /** Default UI max is 100k = "no cap"; only apply server rent cap when user tightens the slider. */
  const hasRentCap =
    maxRent != null && Number.isFinite(Number(maxRent)) && Number(maxRent) > 0 && Number(maxRent) < 100000;

  const constraints = [published];
  if (bhk) constraints.push(where("bhk", "==", bhk));
  if (hasRentCap) constraints.push(where("monthlyRent", "<=", Number(maxRent)));

  // Firestore: if a query uses range/inequality on a field, the first orderBy must be that field.
  if (hasRentCap) {
    constraints.push(orderBy("monthlyRent", "desc"));
  } else {
    constraints.push(orderBy("updatedAt", "desc"));
  }
  constraints.push(limit(limitCount));

  const q = query(col, ...constraints);
  const snap = await getDocs(q);
  const firestoreListings = snap.docs.map((listingDoc) => ({ id: listingDoc.id, ...listingDoc.data() }));
  
  // If we have few results from Firestore, supplement with sample data for the demo feel
  const combined = [...firestoreListings];
  if (combined.length < limitCount) {
    const remaining = limitCount - combined.length;
    combined.push(...listingsData.slice(0, remaining));
  }
  
  return combined;
}

function normalizeAuthEmail(email) {
  return String(email || "").toLowerCase().trim();
}

/** All of a seller's listings (any marketStatus). Email must match Firestore `sellerEmail` (lowercase). */
export async function getListingsForSellerEmail(sellerEmail) {
  const em = normalizeAuthEmail(sellerEmail);
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "listings"), where("sellerEmail", "==", em), limit(100)));
  const rows = snap.docs.map((listingDoc) => ({ id: listingDoc.id, ...listingDoc.data() }));
  rows.sort((a, b) => {
    const ta = a.updatedAt?.toMillis?.() ?? (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
    const tb = b.updatedAt?.toMillis?.() ?? (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
    return tb - ta;
  });
  return rows;
}

export async function upsertListingData(listing, actor) {
  const id = String(listing.id || crypto.randomUUID());
  const rawStatus = String(listing.marketStatus || "published").toLowerCase();
  const marketStatus = rawStatus === "withdrawn" || rawStatus === "archived" ? rawStatus : "published";
  const actorEmail = normalizeAuthEmail(listing.sellerEmail || listing.ownerEmail || actor?.email || "");
  const payload = {
    ...listing,
    id,
    ownerEmail: actorEmail,
    sellerEmail: actorEmail,
    lat: Number(listing.lat || 12.9716),
    lng: Number(listing.lng || 77.5946),
    monthlyRent: Number(listing.monthlyRent || 0),
    marketStatus,
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, "listings", id), payload, { merge: true });
  return { ...payload, updatedAt: new Date().toISOString() };
}

/** Seller: hide listing from search/map (no document delete). */
export async function withdrawListingBySeller(listingId) {
  await updateDoc(doc(db, "listings", String(listingId)), {
    marketStatus: "withdrawn",
    withdrawnAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Seller: show listing again on map/search. */
export async function republishListingBySeller(listingId) {
  await updateDoc(doc(db, "listings", String(listingId)), {
    marketStatus: "published",
    withdrawnAt: null,
    updatedAt: serverTimestamp(),
  });
}

/** Admin-only hard delete (sellers cannot remove Firestore rows). */
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
  const adminEmailSet = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase().trim()));
  const fromProfiles = profilesSnap.docs
    .map((profileDoc) => {
      const profile = profileDoc.data();
      const email = String(profile.email || "").toLowerCase().trim();
      return {
        uid: profileDoc.id,
        email: profile.email,
        name: profile.name || String(profile.email || "user").split("@")[0],
        role: roles.get(profileDoc.id) || "customer",
        phone: profile.phone || "",
        sellerBadgeStatus: profile.sellerBadgeStatus ?? null,
        sellerBadgeApplication: profile.sellerBadgeApplication || null,
        ...profile,
      };
    })
    .filter((row) => !adminEmailSet.has(String(row.email || "").toLowerCase().trim()));

  return [
    ...ADMIN_EMAILS.map((email) => ({ uid: `reserved-admin-${email}`, email, name: "MovEasy Admin", role: "admin", phone: "" })),
    ...fromProfiles,
  ];
}

export async function addUserProfileData(email, name, role, phone = "") {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return;
  const existing = await getProfileByEmail(normalized);
  const uid = existing?.uid || crypto.randomUUID();
  await Promise.all([
    setDoc(
      doc(db, "userProfiles", uid),
      {
        uid,
        email: normalized,
        name: name || normalized.split("@")[0],
        phone: String(phone || "").trim(),
        sellerBadgeStatus: role === "seller" ? "none" : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    setDoc(
      doc(db, "userRoles", uid),
      {
        uid,
        email: normalized,
        role: role === "admin" ? "admin" : role === "seller" ? "seller" : "customer",
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
  ]);
}

export async function updateUserProfileData(email, updates) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return;
  const existing = await getProfileByEmail(normalized);
  if (!existing) return;
  
  const profileUpdates = { updatedAt: serverTimestamp() };
  if (updates.name !== undefined) profileUpdates.name = updates.name;
  if (updates.phone !== undefined) profileUpdates.phone = updates.phone;

  const promises = [setDoc(doc(db, "userProfiles", existing.uid), profileUpdates, { merge: true })];

  if (updates.role !== undefined) {
    promises.push(setDoc(doc(db, "userRoles", existing.uid), { role: updates.role, updatedAt: serverTimestamp() }, { merge: true }));
  }

  await Promise.all(promises);
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
  try {
    await addDoc(collection(db, "notifications"), {
      audience: "admin",
      targetEmail: "",
      title: "New visit request",
      body: `${customerEmail} requested a visit for listing #${listingId}.`,
      type: "visit_request",
      read: false,
      meta: { listingId: String(listingId), customerEmail, sellerEmail },
      createdAt: serverTimestamp(),
    });
    const se = String(sellerEmail || "").trim().toLowerCase();
    if (se.includes("@")) {
      await addDoc(collection(db, "notifications"), {
        audience: "seller",
        targetEmail: se,
        title: "Visit request on your listing",
        body: `${customerEmail} asked to visit listing #${listingId}.`,
        type: "visit_request",
        read: false,
        meta: { listingId: String(listingId), customerEmail },
        createdAt: serverTimestamp(),
      });
    }
  } catch {
    /* non-fatal */
  }
  return { id: refDoc.id, ...record, createdAt: new Date().toISOString() };
}

/** --- Listing interest / applications (CRM) --- */

export async function addInterestRequestData(payload) {
  const record = {
    ...payload,
    listingId: String(payload.listingId || ""),
    status: payload.status || "new",
    createdAt: serverTimestamp(),
  };
  const refDoc = await addDoc(collection(db, "interests"), record);
  return refDoc.id;
}

export async function getInterestsData() {
  const snap = await getDocs(query(collection(db, "interests"), limit(200)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

/** Scoped queries for production Firestore rules (no full-table read for sellers/customers). */
export async function getInterestsForCustomerEmail(customerEmail) {
  const em = String(customerEmail || "").toLowerCase().trim();
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "interests"), where("customerEmail", "==", em), limit(200)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function getInterestsForSellerEmail(sellerEmail) {
  const em = String(sellerEmail || "").toLowerCase().trim();
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "interests"), where("sellerEmail", "==", em), limit(200)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function getAssignmentsForCustomerEmail(customerEmail) {
  const em = String(customerEmail || "").toLowerCase().trim();
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "assignments"), where("customerEmail", "==", em), limit(80)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function getAssignmentsForSellerEmail(sellerEmail) {
  const em = String(sellerEmail || "").toLowerCase().trim();
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "assignments"), where("sellerEmail", "==", em), limit(80)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function getVisitsForSellerEmail(sellerEmail) {
  const em = String(sellerEmail || "").toLowerCase().trim();
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "visits"), where("sellerEmail", "==", em), limit(120)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function updateInterestStatusData(id, status) {
  await updateDoc(doc(db, "interests", String(id)), { status, updatedAt: serverTimestamp() });
}

/** --- In-app notifications --- */

export async function addNotificationData({ audience, targetEmail = "", title, body, type = "info", meta = {} }) {
  await addDoc(collection(db, "notifications"), {
    audience: audience || "admin",
    targetEmail: String(targetEmail || "").toLowerCase().trim(),
    title: String(title || "").slice(0, 200),
    body: String(body || "").slice(0, 2000),
    type,
    meta,
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function getAdminNotificationsData() {
  const snap = await getDocs(query(collection(db, "notifications"), where("audience", "==", "admin"), limit(120)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return tb - ta;
  });
  return rows;
}

export async function getSellerNotificationsData(email) {
  const n = String(email || "").toLowerCase().trim();
  if (!n) return [];
  const snap = await getDocs(query(collection(db, "notifications"), where("targetEmail", "==", n), limit(150)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.audience === "seller");
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function getCustomerNotificationsData(email) {
  const n = String(email || "").toLowerCase().trim();
  if (!n) return [];
  const snap = await getDocs(query(collection(db, "notifications"), where("targetEmail", "==", n), limit(150)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.audience === "customer");
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

export async function markNotificationReadData(id) {
  await updateDoc(doc(db, "notifications", String(id)), { read: true, readAt: serverTimestamp() });
}

/** --- Per-user activity timeline (admin drill-down) --- */

export async function addActivityEventData({ actorEmail, type, summary, meta = {} }) {
  const email = String(actorEmail || "").toLowerCase().trim() || "guest@local.moveasy";
  await addDoc(collection(db, "activityEvents"), {
    actorEmail: email,
    type: String(type || "event"),
    summary: String(summary || "").slice(0, 400),
    meta,
    createdAt: serverTimestamp(),
  });
}

export async function getActivityEventsForEmail(email) {
  const n = String(email || "").toLowerCase().trim();
  if (!n) return [];
  const snap = await getDocs(query(collection(db, "activityEvents"), where("actorEmail", "==", n), limit(200)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

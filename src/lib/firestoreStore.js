import {
  addDoc,
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "./firebase";
import { getProfileByEmail } from "./profileService";
import { sanitizePublicListing } from "./accessControl";
import listingsData from "../data/listingsData";

const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || "jiyanshudhaka20@gmail.com")
  .split(",")
  .map((e) => e.toLowerCase().trim())
  .filter(Boolean);

/** Canonical role for UI filters (userRoles / profiles may store mixed casing). */
function normalizeUserRole(value) {
  const r = String(value ?? "")
    .toLowerCase()
    .trim();
  if (r === "admin") return "admin";
  if (r === "seller") return "seller";
  if (r === "consultant") return "consultant";
  if (r === "sub_admin") return "sub_admin";
  return "customer";
}

const ENABLE_SEED_LISTINGS =
  import.meta.env.DEV || String(import.meta.env.VITE_ENABLE_SEED_LISTINGS || "") === "1";

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
  const { limitCount = 500, bhk, maxRent } = options;

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
  const cap = Math.min(Math.max(Number(limitCount) || 500, 1), 500);
  constraints.push(limit(cap));

  const q = query(col, ...constraints);
  const snap = await getDocs(q);
  const firestoreListings = snap.docs.map((listingDoc) => sanitizePublicListing({ id: listingDoc.id, ...listingDoc.data() }));

  if (!ENABLE_SEED_LISTINGS) return firestoreListings;

  // Dev/demo only: if we have few results from Firestore, supplement with sample data for the demo feel.
  const combined = [...firestoreListings];
  if (combined.length < limitCount) {
    const remaining = limitCount - combined.length;
    combined.push(...listingsData.slice(0, remaining).map((row) => sanitizePublicListing(row)));
  }

  return combined;
}

/**
 * Map/discovery merges published Firestore rows with bundled `listingsData` seeds.
 * Admin must see the same demos to edit or "promote" into real Firestore docs.
 * Rows already in Firestore (same `id`) win; others get `_seedFromStatic: true`.
 */
export function mergeAdminListingsWithSeedData(firestoreRows) {
  if (!ENABLE_SEED_LISTINGS) return Array.isArray(firestoreRows) ? firestoreRows.map((r) => sanitizePublicListing(r)) : [];
  const fs = Array.isArray(firestoreRows) ? [...firestoreRows] : [];
  const fsIds = new Set(fs.map((r) => String(r?.id ?? "")));
  const seeds = listingsData
    .filter((r) => r != null && !fsIds.has(String(r.id)))
    .map((r) => sanitizePublicListing({ ...r, _seedFromStatic: true }));
  return [...fs.map((r) => sanitizePublicListing(r)), ...seeds];
}

/**
 * Admin dashboard: read all listing documents (any `marketStatus`).
 * `getListingsData` only returns `marketStatus === "published"`, so legacy rows
 * without that field never appear for admins and looked like "empty listings".
 */
export async function getAdminListingsData(limitCount = 500) {
  const cap = Math.min(Math.max(Number(limitCount) || 500, 1), 500);
  const snap = await getDocs(query(collection(db, "listings"), limit(cap)));
  const rows = snap.docs.map((listingDoc) => sanitizePublicListing({ id: listingDoc.id, ...listingDoc.data() }));
  rows.sort((a, b) => {
    const ta = a.updatedAt?.toMillis?.() ?? (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
    const tb = b.updatedAt?.toMillis?.() ?? (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
    return tb - ta;
  });
  return mergeAdminListingsWithSeedData(rows);
}

function normalizeAuthEmail(email) {
  return String(email || "").toLowerCase().trim();
}

/** Firestore rejects `undefined` field values; strip before writes. */
function shallowOmitUndefined(obj) {
  if (obj == null || typeof obj !== "object") return obj;
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function makePublicListingId(id) {
  const base = String(id || "").replace(/[^a-z0-9]/gi, "").toUpperCase();
  if (!base) return `MZ-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return `MZ-${base.slice(0, 8)}`;
}

export async function upsertListingPrivateData(listingId, privateFields, actor) {
  const id = String(listingId || "");
  if (!id) throw new Error("listingId is required");
  const actorEmail = normalizeAuthEmail(actor?.email || "");
  const payload = shallowOmitUndefined({
    ...privateFields,
    listingId: id,
    ownerEmail: actorEmail,
    updatedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "listingPrivate", id), payload, { merge: true });
  return payload;
}

/** Broker / owner numbers (not on public listing docs). Caller must satisfy Firestore rules. */
export async function getListingPrivateData(listingId) {
  const id = String(listingId || "");
  if (!id) return null;
  const snap = await getDoc(doc(db, "listingPrivate", id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/** All of a seller's listings (any marketStatus). Email must match Firestore `sellerEmail` (lowercase). */
export async function getListingsForSellerEmail(sellerEmail) {
  const em = normalizeAuthEmail(sellerEmail);
  if (!em) return [];
  const snap = await getDocs(query(collection(db, "listings"), where("sellerEmail", "==", em), limit(100)));
  const rows = snap.docs.map((listingDoc) => sanitizePublicListing({ id: listingDoc.id, ...listingDoc.data() }));
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
  const actorEmail = normalizeAuthEmail(actor?.email || listing.ownerEmail || listing.sellerEmail || "");
  const requestedSellerEmail = normalizeAuthEmail(listing.sellerEmail || actor?.email || "");
  const role = String(actor?.role || "").toLowerCase();
  const isActorAdmin = role === "admin" || role === "sub_admin";
  const sellerEmail = isActorAdmin ? (requestedSellerEmail || actorEmail) : actorEmail;
  const latN = Number(listing.lat);
  const lngN = Number(listing.lng);
  const rentN = Number(listing.monthlyRent);
  const publicListingId = String(listing.publicListingId || listing.publicId || "").trim() || makePublicListingId(id);
  const payload = shallowOmitUndefined({
    ...listing,
    id,
    publicListingId,
    ownerEmail: actorEmail,
    sellerEmail,
    lat: Number.isFinite(latN) ? latN : 12.9716,
    lng: Number.isFinite(lngN) ? lngN : 77.5946,
    monthlyRent: Number.isFinite(rentN) ? rentN : 0,
    marketStatus,
    updatedAt: serverTimestamp(),
  });
  // Never persist broker/owner phone on the world-readable `listings` document.
  delete payload.contact;
  payload.contact = deleteField();
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

export async function addAssignmentData({
  listingId,
  customerEmail,
  customerName = "",
  customerPhone = "",
  sellerEmail,
  sellerName = "",
  sellerContactPhone = "",
  listingTitle = "",
  notes = "",
  createdBy,
}) {
  const record = {
    listingId: String(listingId),
    listingTitle: String(listingTitle || "").slice(0, 200),
    customerEmail: String(customerEmail || "").trim().toLowerCase(),
    customerName: String(customerName || "").trim().slice(0, 120),
    customerPhone: String(customerPhone || "").trim().slice(0, 40),
    sellerEmail: String(sellerEmail || "").trim().toLowerCase(),
    sellerName: String(sellerName || "").trim().slice(0, 120),
    sellerContactPhone: String(sellerContactPhone || "").trim().slice(0, 40),
    notes: String(notes || "").slice(0, 2000),
    status: "assigned",
    createdBy: createdBy || "",
    createdAt: serverTimestamp(),
  };
  const refDoc = await addDoc(collection(db, "assignments"), record);
  await updateDoc(doc(db, "listings", String(listingId)), {
    assignedCustomerEmail: record.customerEmail,
    assignedCustomerName: record.customerName || null,
    assignedCustomerPhone: record.customerPhone || null,
    assignedSellerEmail: record.sellerEmail,
    updatedAt: serverTimestamp(),
  });
  return { id: refDoc.id, ...record, createdAt: new Date().toISOString() };
}

export async function getAllUsersData() {
  const [profilesSnap, rolesSnap] = await Promise.all([getDocs(collection(db, "userProfiles")), getDocs(collection(db, "userRoles"))]);
  const rolesByUid = new Map(rolesSnap.docs.map((roleDoc) => [roleDoc.id, normalizeUserRole(roleDoc.data()?.role)]));
  const adminEmailSet = new Set(ADMIN_EMAILS.map((e) => e.toLowerCase().trim()));
  const fromProfiles = profilesSnap.docs
    .map((profileDoc) => {
      const profile = profileDoc.data();
      const uid = profileDoc.id;
      const roleFromUserRolesDoc = rolesByUid.has(uid) ? rolesByUid.get(uid) : normalizeUserRole(profile.role);
      return {
        ...profile,
        uid,
        email: profile.email,
        name: profile.name || String(profile.email || "user").split("@")[0],
        phone: profile.phone || "",
        sellerBadgeStatus: profile.sellerBadgeStatus ?? null,
        sellerBadgeApplication: profile.sellerBadgeApplication || null,
        role: roleFromUserRolesDoc,
      };
    })
    .filter((row) => !adminEmailSet.has(String(row.email || "").toLowerCase().trim()));

  return [
    ...ADMIN_EMAILS.map((email) => ({ uid: `reserved-admin-${email}`, email, name: "Moveazy Admin", role: "admin", phone: "" })),
    ...fromProfiles,
  ];
}

export async function addUserProfileData(email, name, role, phone = "") {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return;
  const normalizedRole =
    role === "admin"
      ? "admin"
      : role === "seller"
        ? "seller"
        : role === "consultant"
          ? "consultant"
          : role === "sub_admin"
            ? "sub_admin"
            : "customer";
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
        role: normalizedRole,
        sellerBadgeStatus: normalizedRole === "seller" ? "none" : null,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    setDoc(
      doc(db, "userRoles", uid),
      {
        uid,
        email: normalized,
        role: normalizedRole,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ),
    setDoc(
      doc(db, "emailRoles", normalized),
      {
        email: normalized,
        role: normalizedRole,
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
    const normalizedRole =
      updates.role === "admin"
        ? "admin"
        : updates.role === "seller"
          ? "seller"
          : updates.role === "consultant"
            ? "consultant"
            : updates.role === "sub_admin"
              ? "sub_admin"
              : "customer";
    promises.push(setDoc(doc(db, "userRoles", existing.uid), { role: normalizedRole, updatedAt: serverTimestamp() }, { merge: true }));
    promises.push(setDoc(doc(db, "emailRoles", normalized), { email: normalized, role: normalizedRole, updatedAt: serverTimestamp() }, { merge: true }));
    profileUpdates.role = normalizedRole;
    if (normalizedRole !== "seller") profileUpdates.sellerBadgeStatus = null;
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

/** Seller-only: private notes on a lead (Firestore rules enforce field allow-list). */
export async function updateInterestSellerNotesData(interestId, sellerNotes) {
  await updateDoc(doc(db, "interests", String(interestId)), {
    sellerNotes: String(sellerNotes || "").slice(0, 4000),
    sellerNotesUpdatedAt: serverTimestamp(),
  });
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

/** --- Staff CRM (admin + consultant / sub-admin only) --- */

export async function getCrmLeadsForStaff(actor) {
  const em = String(actor?.email || "").toLowerCase().trim();
  const role = normalizeUserRole(actor?.role);
  if (role === "admin") {
    const snap = await getDocs(query(collection(db, "crmLeads"), orderBy("updatedAt", "desc"), limit(250)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  if ((role === "sub_admin" || role === "consultant") && em) {
    const snap = await getDocs(query(collection(db, "crmLeads"), where("assigneeEmail", "==", em), limit(250)));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (b.updatedAt?.toMillis?.() ?? 0) - (a.updatedAt?.toMillis?.() ?? 0));
    return rows;
  }
  return [];
}

export async function createCrmLeadData(payload, actor) {
  const assignee = String(payload.assigneeEmail || "").toLowerCase().trim();
  const row = {
    customerName: String(payload.customerName || "").trim(),
    customerEmail: String(payload.customerEmail || "").toLowerCase().trim(),
    customerPhone: String(payload.customerPhone || "").trim(),
    assigneeEmail: assignee,
    assigneeName: String(payload.assigneeName || "").trim(),
    status: String(payload.status || "new").slice(0, 64),
    visitStatus: String(payload.visitStatus || "not_visited").slice(0, 32),
    listingVisitedId: String(payload.listingVisitedId || "").trim(),
    listingVisitedTitle: String(payload.listingVisitedTitle || "").slice(0, 400),
    requirements: String(payload.requirements || "").slice(0, 8000),
    adminNotes: String(payload.adminNotes || "").slice(0, 8000),
    consultantNotes: String(payload.consultantNotes || "").slice(0, 8000),
    lastContactAt: payload.lastContactAt || null,
    nextFollowUpAt: payload.nextFollowUpAt
      ? payload.nextFollowUpAt instanceof Date
        ? payload.nextFollowUpAt
        : new Date(payload.nextFollowUpAt)
      : null,
    /** Extra fields for Base44 / sheet imports — keep flat for simple rules & admin UI. */
    budgetMin: Number(payload.budgetMin) > 0 ? Number(payload.budgetMin) : null,
    budgetMax: Number(payload.budgetMax) > 0 ? Number(payload.budgetMax) : null,
    preferredAreas: String(payload.preferredAreas || "").trim().slice(0, 2000),
    moveTimeline: String(payload.moveTimeline || "").trim().slice(0, 200),
    sourceChannel: String(payload.sourceChannel || "").trim().slice(0, 120),
    externalRef: String(payload.externalRef || "").trim().slice(0, 200),
    alternatePhone: String(payload.alternatePhone || "").trim().slice(0, 40),
    customerCompany: String(payload.customerCompany || "").trim().slice(0, 200),
    createdByEmail: String(actor?.email || "").toLowerCase().trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const refDoc = await addDoc(collection(db, "crmLeads"), row);
  return { id: refDoc.id, ...row };
}

export async function updateCrmLeadData(leadId, patch, actor) {
  const id = String(leadId || "");
  if (!id) throw new Error("leadId required");
  const payload = shallowOmitUndefined({
    ...patch,
    updatedAt: serverTimestamp(),
    lastUpdatedByEmail: String(actor?.email || "").toLowerCase().trim(),
  });
  await updateDoc(doc(db, "crmLeads", id), payload);
}

export async function getCrmTasksForStaff(actor) {
  const em = String(actor?.email || "").toLowerCase().trim();
  const role = normalizeUserRole(actor?.role);
  if (role === "admin") {
    const snap = await getDocs(query(collection(db, "crmTasks"), orderBy("createdAt", "desc"), limit(300)));
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  if ((role === "sub_admin" || role === "consultant") && em) {
    const snap = await getDocs(query(collection(db, "crmTasks"), where("assigneeEmail", "==", em), limit(300)));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    rows.sort((a, b) => (b.dueAt?.toMillis?.() ?? 0) - (a.dueAt?.toMillis?.() ?? 0));
    return rows;
  }
  return [];
}

export async function addCrmTaskData({ leadId, title, dueAt, assigneeEmail }, actor) {
  const row = {
    leadId: String(leadId || ""),
    title: String(title || "Follow up").slice(0, 200),
    dueAt: dueAt || null,
    assigneeEmail: String(assigneeEmail || "").toLowerCase().trim(),
    completed: false,
    createdByEmail: String(actor?.email || "").toLowerCase().trim(),
    createdAt: serverTimestamp(),
  };
  const refDoc = await addDoc(collection(db, "crmTasks"), row);
  return { id: refDoc.id, ...row };
}

export async function setCrmTaskCompletedData(taskId, completed, actor) {
  await updateDoc(doc(db, "crmTasks", String(taskId)), {
    completed: Boolean(completed),
    completedAt: completed ? serverTimestamp() : null,
    completedByEmail: completed ? String(actor?.email || "").toLowerCase().trim() : null,
    updatedAt: serverTimestamp(),
  });
}

export async function getConsultantNotificationsData(email) {
  const n = String(email || "").toLowerCase().trim();
  if (!n) return [];
  const snap = await getDocs(query(collection(db, "notifications"), where("targetEmail", "==", n), limit(150)));
  const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((r) => r.audience === "consultant");
  rows.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
  return rows;
}

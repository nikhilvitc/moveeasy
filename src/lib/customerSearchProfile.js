import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export const EMPTY_SEARCH_PROFILE = {
  preferredAreas: [],
  budgetMin: null,
  budgetMax: null,
  bhk: "",
  propertyType: "",
  furnishing: "",
  moveInDate: "",
  commuteTo: "",
  maxCommuteMins: null,
  mustHaves: "",
  dealBreakers: "",
  pets: "",
  parking: "",
  notes: "",
};

function toList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || "").trim()).filter(Boolean).slice(0, 24);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 24);
  }
  return [];
}

function numOrNull(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function normalizeSearchProfile(raw) {
  const r = raw || {};
  const areasInput = r.preferredAreas;
  const preferredAreas =
    typeof areasInput === "string" ? toList(areasInput) : toList(areasInput);
  return {
    preferredAreas,
    budgetMin: numOrNull(r.budgetMin),
    budgetMax: numOrNull(r.budgetMax),
    bhk: String(r.bhk || "").trim().slice(0, 40),
    propertyType: String(r.propertyType || "").trim().slice(0, 80),
    furnishing: String(r.furnishing || "").trim().slice(0, 80),
    moveInDate: String(r.moveInDate || "").trim().slice(0, 40),
    commuteTo: String(r.commuteTo || "").trim().slice(0, 120),
    maxCommuteMins: numOrNull(r.maxCommuteMins),
    mustHaves: String(r.mustHaves || "").trim().slice(0, 500),
    dealBreakers: String(r.dealBreakers || "").trim().slice(0, 500),
    pets: String(r.pets || "").trim().slice(0, 120),
    parking: String(r.parking || "").trim().slice(0, 120),
    notes: String(r.notes || "").trim().slice(0, 800),
  };
}

/** Enough for a useful broker intro on WhatsApp. */
export function isSearchProfileComplete(profile) {
  const p = normalizeSearchProfile(profile);
  const hasArea = p.preferredAreas.length > 0;
  const hasBudget = p.budgetMin != null || p.budgetMax != null;
  const hasBrief = Boolean(p.bhk || p.propertyType || p.mustHaves || p.notes);
  return hasArea && (hasBudget || hasBrief);
}

export async function fetchCustomerSearchProfile(uid) {
  if (!isFirebaseConfigured || !uid) return { ...EMPTY_SEARCH_PROFILE };
  try {
    const snap = await getDoc(doc(db, "customerSearchProfiles", uid));
    if (!snap.exists()) return { ...EMPTY_SEARCH_PROFILE };
    return normalizeSearchProfile(snap.data());
  } catch {
    return { ...EMPTY_SEARCH_PROFILE };
  }
}

export async function saveCustomerSearchProfile(uid, draft) {
  if (!isFirebaseConfigured || !uid) throw new Error("Firebase is not configured");
  const profile = normalizeSearchProfile(draft);
  await setDoc(
    doc(db, "customerSearchProfiles", uid),
    {
      ...profile,
      uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return profile;
}

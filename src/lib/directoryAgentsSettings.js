import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { AGENTS as SEED_AGENTS } from "../data/agentsDirectory";
import { db, isFirebaseConfigured } from "./firebase";

const DOC_ID = "directoryAgents";
const MAX_AGENTS = 48;

function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function toList(value) {
  if (Array.isArray(value)) return value.map((x) => String(x || "").trim()).filter(Boolean);
  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeAgent(raw, index) {
  const tab = raw?.tab === "brokers" ? "brokers" : "experts";
  const name = String(raw?.name || "")
    .trim()
    .slice(0, 80);
  if (!name) return null;
  const budgetTier = [1, 2, 3, 4].includes(Number(raw?.budgetTier)) ? Number(raw.budgetTier) : 2;
  const ratingManual = raw?.rating != null && Number.isFinite(Number(raw.rating)) ? Number(raw.rating) : null;
  const ratingAvg = raw?.ratingAvg != null && Number.isFinite(Number(raw.ratingAvg)) ? Number(raw.ratingAvg) : null;
  const ratingCount = Number.isFinite(Number(raw?.ratingCount)) && Number(raw.ratingCount) > 0 ? Number(raw.ratingCount) : 0;
  return {
    id: String(raw?.id || `agent-${index + 1}`).slice(0, 64),
    tab,
    name,
    initials:
      String(raw?.initials || "")
        .trim()
        .slice(0, 3)
        .toUpperCase() || initials(name),
    team: Boolean(raw?.team),
    brokerage: String(raw?.brokerage || "").trim().slice(0, 120),
    priceRangeLabel: String(raw?.priceRangeLabel || "").trim().slice(0, 120),
    recentActivity: String(raw?.recentActivity || "").trim().slice(0, 120),
    localExpertise: String(raw?.localExpertise || "").trim().slice(0, 160),
    specialties: toList(raw?.specialties).slice(0, 8),
    languages: toList(raw?.languages).slice(0, 8),
    areas: toList(raw?.areas).slice(0, 12),
    rentFocus: raw?.rentFocus !== false,
    buyFocus: Boolean(raw?.buyFocus),
    budgetTier,
    rating: ratingAvg ?? ratingManual,
    ratingCount,
    sortOrder: Number.isFinite(raw?.sortOrder) ? raw.sortOrder : index,
    phone: String(raw?.phone || "").trim(),
  };
}

function stripLegacyFields(agent) {
  const { reviewCount, topRated, ...rest } = agent || {};
  void reviewCount;
  void topRated;
  return rest;
}

export function getDefaultDirectoryAgents() {
  return SEED_AGENTS.map((a, i) => normalizeAgent(stripLegacyFields({ ...a, sortOrder: i }), i)).filter(Boolean);
}

function normalizeAgentsArray(arr) {
  if (!Array.isArray(arr)) return null;
  const out = arr
    .slice(0, MAX_AGENTS)
    .map((a, i) => normalizeAgent(stripLegacyFields(a), i))
    .filter(Boolean);
  return out.sort((a, b) => a.sortOrder - b.sortOrder);
}

async function fetchBrokersAsAgents() {
  try {
    const q = query(collection(db, "brokers"), orderBy("order", "asc"));
    const snap = await getDocs(q);
    if (snap.empty) return [];
    return snap.docs.map((d, i) => {
      const b = d.data();
      const name = String(b.name || "").trim();
      if (!name) return null;
      return normalizeAgent({
        id: d.id,
        tab: "brokers",
        name,
        phone: String(b.phone || "").trim(),
        localExpertise: String(b.area || "").trim(),
        areas: b.area ? [String(b.area).trim()] : [],
        specialties: ["Rentals"],
        languages: ["English", "Hindi", "Kannada"],
        rentFocus: true,
        buyFocus: false,
        budgetTier: 2,
        rating: b.ratingAvg ?? b.rating ?? null,
        ratingCount: b.ratingCount ?? 0,
        sortOrder: Number.isFinite(b.order) ? b.order : i,
      }, i);
    }).filter(Boolean);
  } catch (e) {
    console.error("[fetchBrokersAsAgents]", e);
    return [];
  }
}

export async function fetchDirectoryAgents() {
  if (!isFirebaseConfigured) return getDefaultDirectoryAgents();

  // Fetch both sources in parallel
  const [fromBrokers, siteSnap] = await Promise.all([
    fetchBrokersAsAgents().catch(() => []),
    getDoc(doc(db, "siteSettings", DOC_ID)).catch(() => null),
  ]);

  const siteAgents = siteSnap?.exists()
    ? normalizeAgentsArray(siteSnap.data()?.agents) ?? []
    : [];

  if (siteAgents.length > 0) {
    // Always append brokers not already represented in siteSettings
    const siteIds = new Set(siteAgents.map((a) => a.id));
    const extraBrokers = fromBrokers.filter((b) => !siteIds.has(b.id));
    return [...siteAgents, ...extraBrokers];
  }

  return fromBrokers.length ? fromBrokers : getDefaultDirectoryAgents();
}

export function normalizeDirectoryAgentsForSave(draft) {
  const normalized = normalizeAgentsArray(draft);
  return normalized?.length ? normalized : getDefaultDirectoryAgents();
}

export async function saveDirectoryAgents(draft) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
  const agents = normalizeDirectoryAgentsForSave(draft).map((a, i) => ({ ...a, sortOrder: i }));
  await setDoc(
    doc(db, "siteSettings", DOC_ID),
    {
      agents,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return agents;
}

/**
 * Firestore service for Facebook-scraped rental properties.
 *
 * Collection: facebookProperties
 * All reads are public (no auth). Writes are admin-only (enforced by Firestore rules).
 *
 * Document schema:
 * {
 *   bhkType:          "1BHK" | "2BHK" | "3BHK" | "4BHK" | "Studio" | "PG"
 *   area:             string   — locality / neighbourhood (e.g. "Koramangala")
 *   rent:             number   — monthly rent in ₹
 *   deposit:          number   — security deposit in ₹ (0 if unknown)
 *   furnishing:       "Fully Furnished" | "Semi Furnished" | "Unfurnished"
 *   amenities:        string[] — e.g. ["WiFi", "AC", "Parking", "Gym"]
 *   location:         string   — street / landmark / full address
 *   description:      string   — GPT-summarised text from the Facebook post
 *   contactName:      string
 *   contactPhone:     string   — include country code
 *   preferredTenants: "Any" | "Bachelors" | "Family" | "Girls" | "Boys"
 *   availableFrom:    string   — ISO date or human-readable "Immediate"
 *   source:           "facebook"
 *   sourcePostUrl:    string   — original FB post URL (optional)
 *   isActive:         boolean  — false = soft-deleted / hidden
 *   postedAt:         Timestamp — when the FB post was made
 *   createdAt:        Timestamp — when this doc was written to Firestore
 * }
 */

import { db } from "./firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
} from "firebase/firestore";

const COLL = "facebookProperties";
const PAGE_SIZE = 150;

/**
 * Fetch active properties. All client-side filtering avoids needing
 * composite Firestore indexes for the MVP — just swap to server-side
 * query clauses once you need pagination at scale.
 */
export async function fetchFacebookProperties() {
  const q = query(
    collection(db, COLL),
    limit(PAGE_SIZE)
  );
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.isActive !== false)
    .sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}

/** Collect unique areas from a list of property docs (for filter chips). */
export function extractAreas(properties) {
  const set = new Set(properties.map((p) => p.area).filter(Boolean));
  return Array.from(set).sort();
}

/** Apply all active filters to an in-memory list of property docs. */
export function applyFilters(properties, filters) {
  const { bhkType, furnishing, area, minRent, maxRent, search } = filters;
  return properties.filter((p) => {
    if (bhkType && p.bhkType !== bhkType) return false;
    if (furnishing && p.furnishing !== furnishing) return false;
    if (area && p.area !== area) return false;
    if (minRent && (p.rent || 0) < minRent) return false;
    if (maxRent && (p.rent || 0) > maxRent) return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = [p.area, p.location, p.description, p.bhkType]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

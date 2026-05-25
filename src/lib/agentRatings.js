import {
  collection, doc, getDoc, getDocs, query,
  runTransaction, serverTimestamp, where,
} from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

const UNLOCK_MS = 12 * 60 * 60 * 1000;

export function isRatingUnlocked(contactDate) {
  if (!contactDate) return false;
  return Date.now() - new Date(contactDate).getTime() >= UNLOCK_MS;
}

function ratingDocId(clientId, agentId) {
  return `${clientId}_${agentId}`;
}

/** Returns map of agentId → star rating (1–5) for docs already rated by this client. */
export async function fetchMyRatings(clientId, agentIds) {
  if (!isFirebaseConfigured || !clientId || !agentIds.length) return {};
  try {
    const snaps = await Promise.all(
      agentIds.map((id) => getDoc(doc(db, "agentRatings", ratingDocId(clientId, id))))
    );
    const map = {};
    snaps.forEach((snap, i) => { if (snap.exists()) map[agentIds[i]] = snap.data().rating; });
    return map;
  } catch (e) {
    console.warn("[fetchMyRatings]", e);
    return {};
  }
}

/** Returns map of agentId → earliest contact Date for this client (used to check 12-hr unlock). */
export async function fetchMyContacts(clientId) {
  if (!isFirebaseConfigured || !clientId) return {};
  try {
    const q = query(collection(db, "brokerContacts"), where("clientId", "==", clientId));
    const snap = await getDocs(q);
    const map = {};
    snap.docs.forEach((d) => {
      const { brokerId, timestamp } = d.data();
      if (!brokerId) return;
      const ts = timestamp?.toDate?.() ?? null;
      if (ts && (!map[brokerId] || ts < map[brokerId])) map[brokerId] = ts;
    });
    return map;
  } catch (e) {
    console.warn("[fetchMyContacts]", e);
    return {};
  }
}

/**
 * Submit or update a rating. Updates the broker doc's ratingAvg/ratingCount/ratingTotal
 * atomically via a Firestore transaction. Returns the new { ratingAvg, ratingCount }.
 */
export async function submitAgentRating(clientId, agentId, rating) {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured");
  const ratingRef = doc(db, "agentRatings", ratingDocId(clientId, agentId));
  const brokerRef = doc(db, "brokers", agentId);
  let newAvg = rating, newCount = 1;

  await runTransaction(db, async (tx) => {
    const ratingSnap = await tx.get(ratingRef);
    const brokerSnap = await tx.get(brokerRef);

    const isUpdate = ratingSnap.exists();
    const oldRating = isUpdate ? (ratingSnap.data().rating ?? 0) : 0;

    tx.set(ratingRef, {
      clientId,
      agentId,
      rating,
      updatedAt: serverTimestamp(),
      ...(isUpdate ? {} : { createdAt: serverTimestamp() }),
    }, { merge: true });

    const bData = brokerSnap.exists() ? brokerSnap.data() : {};
    const prevCount = bData.ratingCount ?? 0;
    const prevTotal = bData.ratingTotal ?? 0;
    newCount = isUpdate ? prevCount : prevCount + 1;
    const newTotal = isUpdate ? prevTotal - oldRating + rating : prevTotal + rating;
    newAvg = newCount > 0 ? Math.round((newTotal / newCount) * 10) / 10 : rating;

    tx.set(brokerRef, { ratingAvg: newAvg, ratingCount: newCount, ratingTotal: newTotal }, { merge: true });
  });

  return { ratingAvg: newAvg, ratingCount: newCount };
}

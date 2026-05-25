import { addDoc, collection, doc, getDocs, increment, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "./firebase";

export async function logBrokerContact({ clientId, clientEmail, clientName, brokerId, brokerName }) {
  if (!isFirebaseConfigured) return;
  try {
    await addDoc(collection(db, "brokerContacts"), {
      clientId: clientId || "",
      clientEmail: clientEmail || "",
      clientName: clientName || clientEmail || "",
      brokerId: brokerId || "",
      brokerName: brokerName || "",
      timestamp: serverTimestamp(),
    });
  } catch (e) {
    console.warn("[logBrokerContact]", e);
  }
  // Increment live engagement counter on the broker doc
  if (brokerId) {
    try {
      await setDoc(doc(db, "brokers", brokerId), { engagementCount: increment(1) }, { merge: true });
    } catch (e) {
      console.warn("[logBrokerContact] engagementCount increment failed", e);
    }
  }
}

export async function fetchBrokerContacts() {
  if (!isFirebaseConfigured) return [];
  try {
    const q = query(collection(db, "brokerContacts"), orderBy("timestamp", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data(), timestamp: d.data().timestamp?.toDate?.() ?? null }));
  } catch (e) {
    console.warn("[fetchBrokerContacts]", e);
    return [];
  }
}

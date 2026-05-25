import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db, isFirebaseConfigured } from "../lib/firebase";

const FALLBACK_BROKERS = [
  { id: "1", name: "Kuldeep Meena", area: "Koramangala", phone: "+91 70559 54373", rating: 4.9 },
  { id: "2", name: "Suresh Meena",  area: "HSR Layout",  phone: "+91 78179 40441", rating: 4.8 },
];

export function useBrokers() {
  const [brokers, setBrokers] = useState(FALLBACK_BROKERS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) { setLoading(false); return; }
    const q = query(collection(db, "brokers"), orderBy("order", "asc"));
    getDocs(q)
      .then((snap) => {
        if (!snap.empty) {
          setBrokers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { brokers, loading };
}

/**
 * Write default public site settings (Kuldeep + Suresh contacts) to Firestore.
 * Run: node scripts/seed-site-public.mjs
 * Auth: firebase login (ADC) or GOOGLE_APPLICATION_CREDENTIALS
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "moveasy-30eed";

const DEFAULT_CONTACT_TEAM = [
  {
    name: "Kuldeep Meena",
    title: "IITK BS Physics",
    role: "Sales",
    phone: "+91 70559 54373",
    phoneRaw: "917055954373",
    whatsappUrl: "https://wa.me/917055954373",
    avatar: "KM",
    gradient: "from-red-500 to-orange-500",
  },
  {
    name: "Suresh Meena",
    title: "IITK Electrical",
    role: "Sales",
    phone: "+91 78179 40441",
    phoneRaw: "917817940441",
    whatsappUrl: "https://wa.me/917817940441",
    avatar: "SM",
    gradient: "from-blue-600 to-indigo-600",
  },
];

const DEFAULT_SITE_PUBLIC = {
  contacts: DEFAULT_CONTACT_TEAM,
  supportEmail: "support@moveazy.in",
  privacyEmail: "privacy@moveazy.in",
  legalPhoneDisplay: "+91 70559 54373",
  legalPhoneTel: "tel:+917055954373",
};

function mergeDefaultContacts(contacts) {
  const list = Array.isArray(contacts) ? [...contacts] : [];
  const seen = new Set(list.map((c) => c.phoneRaw));
  for (const seed of DEFAULT_CONTACT_TEAM) {
    if (!seen.has(seed.phoneRaw)) {
      list.push({ ...seed });
      seen.add(seed.phoneRaw);
    }
  }
  return list.slice(0, 12);
}

initializeApp({
  credential: applicationDefault(),
  projectId: PROJECT_ID,
});

const db = getFirestore();

async function main() {
  const ref = db.doc("siteSettings/public");
  const snap = await ref.get();
  const existing = snap.exists ? snap.data() : {};
  const payload = {
    contacts: mergeDefaultContacts(existing.contacts),
    supportEmail: String(existing.supportEmail || DEFAULT_SITE_PUBLIC.supportEmail).trim(),
    privacyEmail: String(existing.privacyEmail || DEFAULT_SITE_PUBLIC.privacyEmail).trim(),
    legalPhoneDisplay: String(
      existing.legalPhoneDisplay || DEFAULT_SITE_PUBLIC.legalPhoneDisplay,
    ).trim(),
    legalPhoneTel: String(existing.legalPhoneTel || DEFAULT_SITE_PUBLIC.legalPhoneTel).trim(),
    updatedAt: FieldValue.serverTimestamp(),
  };

  await ref.set(payload, { merge: true });

  console.log(`Wrote siteSettings/public on ${PROJECT_ID}:`);
  console.log(JSON.stringify(payload, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

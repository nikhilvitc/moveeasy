# Production verification (live environment)

Perform these checks **after** deploying so the live Firebase project matches this repo. Git and the Console can drift.

For a broader launch checklist (legal, monitoring, performance), see [PRODUCTION_GO_LIVE_CHECKLIST.md](./PRODUCTION_GO_LIVE_CHECKLIST.md).

---

## 1) Publish Firestore + Storage rules

**Important:** `npm run deploy:hosting` deploys **Hosting only** — it does **not** update Firestore or Storage rules.

From the repo root:

```bash
npm run deploy:rules
```

Equivalent:

```bash
firebase deploy --only firestore:rules,storage --project moveasy-30eed
```

**Verify:** Firebase Console → **Firestore** → **Rules** and **Storage** → **Rules** — compare to `firestore.rules` and `storage.rules` in git.

**Listings policy:** Sellers **withdraw** listings (`marketStatus: withdrawn`) to hide them from the map; **only admins** may **delete** the Firestore document (audit / dispute alignment with large rental marketplaces).

---

## 2) GitHub Actions secrets

The workflow writes `.env` from secrets before `npm run build`. Missing secrets produce **empty** `VITE_*` values and silent failures.

**Minimum checklist:**

- [ ] `FIREBASE_SERVICE_ACCOUNT_MOVEASY_30EED` (deploy action)
- [ ] `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, `VITE_FIREBASE_APP_ID`, `VITE_FIREBASE_MEASUREMENT_ID`
- [ ] `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_TEMPLATE_ID`
- [ ] `VITE_EMAILJS_INTEREST_TEMPLATE_ID`, `VITE_EMAILJS_STATUS_TEMPLATE_ID` (if you use those flows)
- [ ] `VITE_ADMIN_EMAILS`
- [ ] Optional: `VITE_EMAILJS_WELCOME_TEMPLATE_ID`, `VITE_EMAILJS_ADMIN_NOTIFY_TEMPLATE_ID`, `VITE_CREATE_PROFILE_FUNCTION_URL`, `VITE_ONBOARDING_EMAIL_FUNCTION_URL`, `VITE_WELCOME_EMAIL_FUNCTION_URL`

After changing secrets, trigger a **new** workflow run so the bundle is rebuilt.

---

## 3) First admin (`userRoles`)

Firestore security rules enforce roles from `userRoles`. Pick **one** bootstrap path:

**A — Console (always works):** Firebase Console → Firestore → `userRoles` → your user’s document → set `role` to `"admin"`. (Console uses the Admin SDK and **bypasses** client rules.)

**B — App + `bootstrapAdmins`:** Create collection `bootstrapAdmins`, document ID = your **exact** Auth email (lowercase). Sign in; the app can then write your `userRoles` as `admin` per `firestore.rules`. Remove the bootstrap doc when you no longer need it.

---

## 4) Storage rules note (`listing-images`)

Current rules allow **any signed-in user** to **create / update / delete** under `listing-images/{listingId}/**` if they know or guess a `listingId`. That is acceptable only for a **low-risk** launch; for stricter prod, prefer paths scoped by `request.auth.uid` (and update `uploadListingFiles` in `src/lib/firestoreStore.js` to match) or uploads via a **Cloud Function** with ownership checks.

`user-documents/{uid}/**` is correctly scoped to the owning uid.

---

## 5) Live smoke tests

On the **production URL** (not localhost):

- [ ] Auth: register, verify email, sign in
- [ ] Map / listings load; images load from Storage
- [ ] CRM: visit or interest flow; confirm EmailJS (or configured function) if you rely on mail
- [ ] Admin: `/admin`, users/listings as expected
- [ ] Browser **Network** tab: no unexpected `permission-denied` on Firestore/Storage calls

---

## Quick pass line

You are aligned when **published rules = repo rules**, **Hosting is the URL from your pipeline**, **secrets are present**, and **smoke tests pass** on that URL.

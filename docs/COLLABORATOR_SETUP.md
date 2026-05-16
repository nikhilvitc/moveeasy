# Collaborator setup

**Architecture (read first):** [MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md](./MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md) · [AGENTS.md](../AGENTS.md)

Collaborators (e.g. Nikhil working via Antigravity) should align with the documented nav and routes—especially **`/agents`**, **`/plan`**, and **Guarantee** naming—before pushing navbar or route changes.

## Repo

https://github.com/jiyanshud22/MOVEASY-WEBSITE

```bat
git clone https://github.com/jiyanshud22/MOVEASY-WEBSITE.git
cd MOVEASY-WEBSITE
copy .env.collaborator.example .env
npm install
npm run dev
```

## Environment

- Template: `.env.collaborator.example` (in git)
- Real values: team lead sends `.env` **privately** — never commit `.env`
- Firebase Console → project **moveasy-30eed** → Project settings → Web app → copy into `VITE_FIREBASE_*`

## Deploy (maintainers only)

```bat
npm run deploy:hosting
```

Also deploy Cloud Functions after agent WhatsApp changes:

```bat
cd functions
npm ci
cd ..
npx firebase deploy --only functions:createAgentWhatsAppConnect --project moveasy-30eed
```

Or full functions: `npx firebase deploy --only functions --project moveasy-30eed`

## Admin access

1. Add email to `VITE_ADMIN_EMAILS`
2. Firestore: `bootstrapAdmins/{email}` (doc id = lowercase email)
3. Sign in → `/admin`

---

## “Repo collaborator + API shared” but Firestore says permission denied

**GitHub collaborator** = code access only.  
**Firebase web API keys in `.env`** = app can *talk* to the project, not bypass security.

Onboarding (`/onboarding`) saves to Firestore collection **`userProfiles/{your-uid}`**. Rules allow write only when:

1. You are **signed in** (Google or email) on the same Firebase project (`moveasy-30eed`), and  
2. The write is to **your own** `uid`, and  
3. **App Check** is satisfied if enforcement is on in Firebase Console.

### Fix for local dev (most common — Nikhil on `localhost:5173`)

1. In `.env` add:
   ```env
   VITE_APPCHECK_DEBUG_TOKEN=true
   ```
2. Run `npm run dev`, open the site, open browser **Console** — copy the App Check debug token Firebase prints.
3. Firebase Console → **App Check** → **Manage debug tokens** → add that token.
4. Optional: put the fixed token in `.env` instead of `true`.
5. Hard refresh and submit onboarding again.

See [SECURITY_OBSERVABILITY.md](./SECURITY_OBSERVABILITY.md).

### If Nikhil should be **admin** (not just a customer testing onboarding)

Do **all** of these (repo access alone is not enough):

| Step | Where |
|------|--------|
| Add email | `.env` → `VITE_ADMIN_EMAILS=nikhil@example.com` |
| Bootstrap doc | Firestore → `bootstrapAdmins` → doc id = **lowercase email** (empty doc is fine) |
| Sign in | Same email on `/login` (Google or password) |
| Open | `/admin` |

### If Nikhil only tests as a **normal customer**

- Sign in with his Google account on `/login` (no admin steps).
- Complete `/onboarding` after App Check debug token is set (if enforcement is on).
- No GitHub or admin Firestore docs required.

### Firestore rules deploy: `403 The caller does not have permission`

If `firebase deploy --only firestore:rules` fails on `firebaserules.googleapis.com` **even with GCP role “Editor”**:

1. **Use the right project** — production is **`moveasy-30eed`** (live site). `moveazy-34225` is a separate Firebase project; permissions must be granted **per project**.
2. **Owner** adds Nikhil in **both** places (for the project he deploys to):
   - [Firebase Console](https://console.firebase.google.com/) → Project → ⚙️ **Project settings** → **Users and permissions** → Add member → role **Editor** or **Owner**
   - [Google Cloud IAM](https://console.cloud.google.com/iam-admin/iam) → same project → **Add role** → **Firebase Rules Admin** (`roles/firebaserules.admin`) or **Firebase Admin** (`roles/firebase.admin`)
3. Nikhil runs: `firebase login` (same Google account), then  
   `firebase use moveasy-30eed`  
   `firebase deploy --only firestore:rules --project moveasy-30eed`

**Recommended:** collaborators do **not** deploy rules to production. Open a PR → merge to `main` → GitHub Actions deploys hosting + rules automatically.

### GitHub Actions: CI green but “Deploy to Firebase Hosting” red

1. Open **Actions** → failed run → expand the failed step log.
2. **`Resource not accessible by integration`** — deploy workflow uses `firebase-tools` + service account directly (no `action-hosting-deploy`). Re-run workflow after pulling latest `main`.
3. **`firebaseServiceAccount` / permission denied** — repo secret `FIREBASE_SERVICE_ACCOUNT_MOVEASY_30EED` must be valid JSON for a service account with **Firebase Hosting Admin** (and rules deploy if that step runs).
4. **Lint/test failed** — run locally: `npm run lint && npm run test && npm run build`.
5. Collaborators still get latest **code** from `git pull origin main` even when deploy is red; live site updates only after deploy succeeds.

### Quick checklist for project owner (you)

- [ ] Nikhil has correct `.env` pointing to `moveasy-30eed` (not a personal Firebase project).
- [ ] If Nikhil must deploy manually: Firebase Console **Users and permissions** + IAM **Firebase Rules Admin** on that project.
- [ ] Nikhil is signed in (not just viewing the form logged out).
- [ ] App Check debug token registered for his laptop, **or** enforcement temporarily off for Firestore in Console (not recommended long term).
- [ ] If he needs admin: `VITE_ADMIN_EMAILS` + `bootstrapAdmins/{email}`.

# Antigravity — browser & console tasks (MovEazy production)

**Before any task:** read [AGENTS.md](../AGENTS.md) and [MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md](./MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md) (nav, routes, Agents page, Contact/Support). Update the architecture changelog if you change structure.

Copy everything below into Antigravity. **Do not change app code** unless a step fails verification — most work is in Firebase, Razorpay, DNS, and GitHub. **Do not edit navbar link lists in components** — nav is defined in `src/config/navLinks.js` only.

**Repo:** https://github.com/jiyanshud22/MOVEASY-WEBSITE  
**Live:** https://moveeazy.in · https://moveasy-30eed.web.app  
**Firebase project:** `moveasy-30eed`

Code includes: `/agents` (public directory + Admin edit), `/my-search` profile, agent WhatsApp connect (Function deploy), Contact sales/support, Flat Plan `/plan`, Guarantee `/guarantee` (nav label **Guarantee**, not Deposit Saver).

---

## A. Deploy Cloud Function (required for agent WhatsApp)

1. Open terminal in repo root.
2. Run:
   ```bat
   cd functions
   npm ci
   cd ..
   npx firebase deploy --only functions:createAgentWhatsAppConnect,firestore:rules --project moveasy-30eed
   ```
3. In Firebase Console → **Functions**, confirm `createAgentWhatsAppConnect` is active (region `us-central1`).
4. Test signed-in on live site: complete `/my-search` → `/agents` → **Connect on WhatsApp** → WhatsApp opens with MovEazy intro (no phone visible on page).

---

## B. Custom domain `moveazy.in`

1. Firebase Console → **Hosting** → **Add custom domain** → `moveazy.in` (+ `www` if needed).
2. Add DNS records at registrar; wait until Firebase shows **Connected**.
3. **Authentication** → **Settings** → **Authorized domains** → add `moveazy.in` and `www.moveazy.in`.
4. Google Cloud Console → OAuth Web client → add JS origins + redirect URIs for `moveazy.in`.
5. Update production env / GitHub secrets: `VITE_FIREBASE_AUTH_DOMAIN=moveazy.in` (if using custom auth domain flow per `.env.production.example`).
6. Redeploy hosting; open `https://moveazy.in` and sign in with Google.

---

## C. GitHub Actions secrets

Repository → **Settings** → **Secrets and variables** → **Actions**.

Ensure all are set (empty = broken build):

- `FIREBASE_SERVICE_ACCOUNT_MOVEASY_30EED`
- All `VITE_FIREBASE_*`
- `VITE_ADMIN_EMAILS`
- `VITE_EMAILJS_*` (if using email)
- `VITE_RAZORPAY_PAYMENT_LINK`, `VITE_RAZORPAY_PAYMENT_LINK_FLAT`, `VITE_RAZORPAY_PAYMENT_LINK_DEPOSIT`
- `VITE_WHATSAPP_ORDER_E164`
- Optional: `VITE_SENTRY_DSN`, `VITE_APPCHECK_RECAPTCHA_SITE_KEY`

Trigger **Deploy to Firebase Hosting** workflow on `main`; confirm green.

---

## D. Razorpay live setup

1. Razorpay Dashboard → **Live mode**.
2. Payment Pages:
   - Flat Search — **₹1,499**
   - Deposit Saver — **₹1,999**
3. Paste URLs into GitHub secrets (see `docs/PAYMENTS_PRODUCTION.md`).
4. Browser test:
   - `/checkout?sku=flat-search` → Pay on Razorpay → amount correct
   - `/checkout?sku=deposit-saver` → ₹1,999

---

## E. Firebase data bootstrap

1. **Admin → Agents**: add each agent’s **private WhatsApp** (10 digits or +91); Save.
2. Firestore verify: `agentPrivate/{agentId}` has `whatsappE164`; `siteSettings/directoryAgents` has **no** phone fields.
3. `bootstrapAdmins/{your-email}` for each admin.
4. Optional: enable **Firestore daily backups** (Blaze).

---

## F. Monitoring

1. [sentry.io](https://sentry.io) → create project → DSN → `VITE_SENTRY_DSN` in GitHub secrets → redeploy.
2. Firebase → **Analytics** → confirm GA4 linked; test event on live site.

---

## G. Legal & email

1. Review live `/terms` and `/privacy` — company legal name, address, contact.
2. EmailJS templates: replace `firebaseapp.com` / old URLs with `https://moveazy.in/...`.
3. Send test signup + visit-request emails.

---

## H. End-to-end smoke (browser)

Manual checklist:

- [ ] Home loads; navbar **Start my flat search** → checkout ₹1,499
- [ ] Map → listing → visit request → admin sees it
- [ ] `/guarantee` → enroll ₹1,999 checkout
- [ ] `/contact` shows Flat Search ₹1,499
- [ ] `/my-search` save works (signed in)
- [ ] `/agents` Connect works after profile + function deploy
- [ ] Firestore `agentConnectEvents` new doc on each connect (admin read in Console)

Automated (terminal):

```bat
set PLAYWRIGHT_BASE_URL=https://moveasy-30eed.web.app/
npm run e2e -- e2e/smoke.production.spec.js
```

---

## I. App Check (optional hardening)

If enforcing App Check on Firestore/Auth:

1. Firebase → **App Check** → register reCAPTCHA v3 site key.
2. Set `VITE_APPCHECK_RECAPTCHA_SITE_KEY`; redeploy.
3. Add `moveazy.in` to reCAPTCHA allowed domains.

---

## Deliverable

Report back with:

1. Screenshots or URLs proving `moveazy.in` works (or timeline if DNS pending)
2. Razorpay live links configured (yes/no)
3. `createAgentWhatsAppConnect` deployed (yes/no) + one test connect event id
4. GitHub Actions last run status
5. Any blockers

# Production Go-Live Checklist

A comprehensive checklist for moving from a "prototype" to a "business-ready" product.

## Phase 1: Technical Hardening
- [ ] **Custom Domain:** Connect your own domain (e.g. `moveazy.in`) to Firebase Hosting — see **Custom domain (moveazy.in)** below.

### Custom domain (`moveazy.in`) — DNS + Firebase

1. **Own the domain**  
   Buy / manage `moveazy.in` at a registrar (GoDaddy, Namecheap, Cloudflare, Google Domains, etc.).

2. **Firebase Hosting**  
   [Firebase Console](https://console.firebase.google.com/) → your project → **Build → Hosting** → **Add custom domain** → enter `moveazy.in` (and optionally `www.moveazy.in`).  
   Firebase shows **DNS records** (usually **A** / **TXT** for verification). Add those at your registrar, wait for propagation (minutes–48h), then click **Verify** in Firebase until status is connected.

3. **Firebase Authentication — authorized domains**  
   **Build → Authentication → Settings → Authorized domains** → **Add domain** → `moveazy.in` (and `www.moveazy.in` if you use it).  
   Without this, email links and OAuth redirects to your site can fail on the new hostname.

4. **Keep `VITE_FIREBASE_AUTH_DOMAIN` as your Firebase project host**  
   In `.env` / GitHub secrets, `VITE_FIREBASE_AUTH_DOMAIN` should stay **`your-project-id.firebaseapp.com`** (see `.env.production.example`). The **site** opens at `https://moveazy.in`; Auth still uses the Firebase auth host unless you have set up a **custom auth domain** (advanced).

5. **App Check (if enforced)**  
   If App Check is on for Auth/Firestore/Storage, ensure the **production** reCAPTCHA / domain allowlist includes `moveazy.in`.

6. **Deploy**  
   After DNS is green, `firebase deploy --only hosting` (or your CI) serves the same `dist` build at `https://moveazy.in`.

7. **Email / links**  
   Update any hardcoded URLs in EmailJS templates, welcome emails, or marketing to `https://moveazy.in/...`.
- [ ] **Monitoring:** Integrate an error tracking tool like **Sentry** or **LogRocket** to catch client-side crashes.
- [ ] **Analytics:** Setup Google Analytics 4 (GA4) via the Firebase config to track user conversion.
- [ ] **Performance:** Run a Lighthouse audit and optimize image sizes in Storage.

## Phase 2: Operations & Support
- [ ] **Admin Notify:** Ensure `VITE_ADMIN_EMAILS` includes the actual operations team.
- [ ] **Backup Strategy:** Enable automated Firestore backups (requires Blaze plan).
- [ ] **Email Limits:** Verify your EmailJS plan covers your expected launch traffic (Free plan is 200 emails/month).

## Phase 3: Legal & Trust
- [ ] **Privacy Policy:** Update `/privacy` with actual company details.
- [ ] **Terms of Service:** Review `/terms` for liability clauses related to real estate.
- [ ] **Verification Badges:** Define the internal process for verifying sellers before granting the "Verified" badge.

## Phase 4: Final Smoke Test
- [ ] Perform a full end-to-end flow: Search -> Filter -> Visit Request -> Admin Assignment -> Status Update.
- [ ] Verify that all automated emails contain correct links to the live site.

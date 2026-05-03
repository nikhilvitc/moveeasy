# Production Go-Live Checklist

A comprehensive checklist for moving from a "prototype" to a "business-ready" product.

## Phase 1: Technical Hardening
- [ ] **Custom Domain:** Connect your own domain (e.g. `moveazy.in`) to Firebase Hosting.
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

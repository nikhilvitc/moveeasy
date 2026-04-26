# MovEasy Production Go-Live Checklist

This checklist is the minimum required to call the website production-ready.

## A) Authentication and Email (must pass)

- [ ] Set real `VITE_FIREBASE_*` values in deployment environment.
- [ ] Enable Firebase Auth Email/Password sign-in.
- [ ] Configure Firebase email verification template in console.
- [ ] Deploy `sendWelcomeEmail` Cloud Function.
- [ ] Set function secrets: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
- [ ] Set frontend `VITE_WELCOME_EMAIL_FUNCTION_URL` to deployed function URL.
- [ ] Verify flow:
  - signup sends verification mail
  - unverified login is blocked
  - verified login succeeds
  - first verified login sends welcome email

## B) Security and Access Control

- [ ] Keep admin credentials out of repository history (move to secret manager/server-side auth).
- [ ] Add brute-force protections (Firebase/Auth + WAF/rate limits where applicable).
- [ ] Keep seller trust badge review non-blocking for account login.
- [ ] Audit admin actions (listing edits/deletes, badge approvals).

## C) Data and Listings

- [ ] Use authorized partner feeds/MLS/IDX only (no unauthorized scraping).
- [ ] Validate feed schema and deduplicate listing IDs.
- [ ] Add source attribution and `sourceUrl` integrity checks.

## D) Quality Gates

- [ ] CI passes on every push: install + tests + build.
- [ ] Smoke test completed on live URL for customer, seller, and admin flows.
- [ ] Error monitoring and uptime checks configured (Sentry + uptime monitor recommended).

## E) Performance Baseline

- [ ] Capture Lighthouse baseline for home, map, login pages.
- [ ] Add map marker clustering for large listing counts.
- [ ] Run initial load test for API/email endpoints before launch.

## F) Launch Sign-off

- [ ] Founder sign-off on flows, legal text, and contact support email.
- [ ] Backup and rollback plan documented.
- [ ] Final live test evidence stored (screenshots + timestamps).

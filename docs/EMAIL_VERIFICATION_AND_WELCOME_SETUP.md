# Email: verification (free) + welcome / admin (free EmailJS)

## What runs today

1. **Firebase verification (no paid add-on)** — On customer/seller sign-up, the app calls `sendEmailVerification`. The user must click the link in the email from Firebase/Google before sign-in succeeds.
2. **Welcome + admin notification (free tier)** — After the first **verified** sign-in, the app tries **EmailJS** from the browser (no Cloud Function required). If EmailJS env vars are missing, sign-in still works; emails are skipped.

Optional **Cloud Function + SMTP** (`VITE_WELCOME_EMAIL_FUNCTION_URL`) remains available for a server-side welcome path but is not required for the EmailJS flow.

## 1) Firebase Auth env (required)

Copy `.env.example` to `.env` and set all `VITE_FIREBASE_*` keys used by `src/lib/firebase.js`.

In **Firebase Console → Authentication → Templates → Email address verification**, customize the template and authorized domain list so links work from your GitHub Pages URL.

## 2) EmailJS (optional, free tier ~200 emails/month)

1. Create an account at [https://www.emailjs.com/](https://www.emailjs.com/).
2. Add an **email service** (e.g. Gmail) and note **Service ID**.
3. Create two **templates**:
   - **Welcome**: include variables such as `{{to_email}}`, `{{to_name}}`, `{{user_role}}`, `{{message}}`, `{{from_name}}` — set “To” field to `{{to_email}}` in the template UI.
   - **Admin notify**: `{{to_email}}` = your inbox, plus `{{user_email}}`, `{{user_name}}`, `{{user_role}}`, `{{message}}`, `{{from_name}}`.
4. Copy **Public Key** (User ID), template IDs, and service ID into `.env`:

- `VITE_EMAILJS_PUBLIC_KEY`
- `VITE_EMAILJS_SERVICE_ID`
- `VITE_EMAILJS_WELCOME_TEMPLATE_ID`
- `VITE_EMAILJS_ADMIN_NOTIFY_TEMPLATE_ID`
- `VITE_ADMIN_NOTIFY_EMAIL` — inbox that receives “new signup” alerts (defaults in code if unset).

## 3) GitHub Actions / Pages

Add the same variables as **repository secrets** so the deploy workflow can write `.env` before `npm run build`. Names match the `VITE_*` keys above (see `.github/workflows/deploy.yml`).

## 4) Optional: Cloud Function welcome (Blaze + SMTP)

If you deploy `functions/` with SMTP secrets and set `VITE_WELCOME_EMAIL_FUNCTION_URL`, you can extend the client later to call that endpoint; the EmailJS path covers free welcome/admin mail without Firebase billing for Functions.

## 5) Notes

- **Resend verification**: On failed login due to unverified email, use **Resend verification email** (password required) to trigger another Firebase message.
- Welcome/admin EmailJS sends are retried on later logins until at least one send succeeds (localStorage flag).
- For deliverability at scale, consider SendGrid/Postmark/SES later; EmailJS is fine for early traffic.

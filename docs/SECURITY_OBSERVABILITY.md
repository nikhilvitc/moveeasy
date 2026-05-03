# Security and observability (production)

This app supports **Firebase App Check** (abuse reduction), **Sentry** (client errors), and **GCP billing alerts** (cost / abuse signal).

## Firebase App Check (web)

1. In [Firebase Console](https://console.firebase.google.com/) → your project → **Build** → **App Check** → register the **Web** app with **reCAPTCHA v3**.
2. Copy the **site key** into GitHub secret `VITE_APPCHECK_RECAPTCHA_SITE_KEY` and mirror it in `.env` for local production builds if needed.
3. In App Check, enable enforcement for **Firestore**, **Storage**, and **Authentication** only after the production site key is deployed and verified.

**Local development:** set `VITE_APPCHECK_DEBUG_TOKEN=true` in `.env`, run `npm run dev`, open the app, and copy the debug token from the browser console. In Console → App Check → **Manage debug tokens**, add that token. You can then use a fixed literal token in `.env` instead of `true` if you prefer.

If enforcement is on but the build has no site key, legitimate users will be blocked—always ship the site key before turning enforcement on.

## Sentry (client errors)

1. Create a project in [Sentry](https://sentry.io/) for the React browser SDK.
2. Copy the **DSN** into GitHub secret `VITE_SENTRY_DSN`. Omit or leave empty to disable Sentry (no runtime errors).

Session Replay is enabled with conservative sampling in production; adjust rates in `src/lib/sentry.js` if needed.

## GCP billing budgets and alerts

Firebase runs on Google Cloud. Unexpected traffic or misconfiguration can increase cost.

1. Open [Google Cloud Console](https://console.cloud.google.com/) → select the **billing account** linked to the Firebase project.
2. Go to **Billing** → **Budgets & alerts** → **Create budget**.
3. Set scope to the Firebase/GCP project (or folder) for Moveasy, choose amount and alert thresholds (for example 50%, 90%, 100% of budget).
4. Add email (or Pub/Sub) notification channels so you get alerts before spend runs away.

This does not replace App Check or security rules; it gives an operational safety net.

## CI secrets checklist

For GitHub Actions production builds, ensure these exist when you use the feature:

| Secret | Purpose |
|--------|---------|
| `VITE_SENTRY_DSN` | Sentry browser DSN (optional) |
| `VITE_APPCHECK_RECAPTCHA_SITE_KEY` | reCAPTCHA v3 site key for App Check (optional until enforcement) |

See `.env.example` for the full list of `VITE_*` variables.

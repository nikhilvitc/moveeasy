# Email Verification and Welcome Mail Setup

This project now enforces real mailbox verification with Firebase Auth:

1. User signs up with email/password.
2. Firebase sends verification email.
3. Login is blocked until `emailVerified=true`.
4. After verified login, app calls a Cloud Function to send one welcome email.

## 1) Configure Frontend Environment

Copy `.env.example` to `.env` and fill:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_WELCOME_EMAIL_FUNCTION_URL`

Example `VITE_WELCOME_EMAIL_FUNCTION_URL`:

`https://us-central1-<your-project-id>.cloudfunctions.net/sendWelcomeEmail`

## 2) Deploy Cloud Function

From repo root:

```bash
cd functions
npm install
```

Set required Firebase function secrets:

```bash
firebase functions:secrets:set SMTP_HOST
firebase functions:secrets:set SMTP_PORT
firebase functions:secrets:set SMTP_USER
firebase functions:secrets:set SMTP_PASS
firebase functions:secrets:set SMTP_FROM
```

Deploy:

```bash
firebase deploy --only functions
```

## 3) Firebase Console Email Template

In Firebase Console:

- Authentication -> Templates -> Email address verification
- Customize subject/body and support email
- Use production domain links

## 4) Notes

- Welcome email sending is idempotent; function sets custom claim `welcomeEmailSent=true`.
- If SMTP temporarily fails, user can still log in; email send is retried on next login until successful.
- For higher deliverability and analytics, use SES/SendGrid/Postmark SMTP.

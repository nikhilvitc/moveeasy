# Collaborator setup

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

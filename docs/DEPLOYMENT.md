# Deployment (Production-Ready, Deterministic)

This repo is built with **Vite + React** and deployed to **Firebase Hosting** (plus **Firestore rules/indexes** and **Storage rules**).

The goal of this setup is:
- **Repeatable**: same inputs → same output (no “luck-based” deploys).
- **Version controlled**: environment + deploy process is defined in the repo.
- **Automated**: CI builds/tests on every change; deploy is a button.
- **Recoverable**: rollbacks are documented and fast.

---

## What is “infrastructure as code” here?

Firebase resources for this app are defined and deployed from files in the repo:
- **Hosting**: `firebase.json` (rewrites, caching headers, predeploy build)
- **Firestore rules**: `firestore.rules`
- **Firestore indexes**: `firestore.indexes.json` (deployed via `--only firestore`)
- **Storage rules**: `storage.rules`
- **Functions** (optional): `functions/` (not required for basic hosting deploy)

Projects are declared in:
- `.firebaserc`

---

## Environments

This repo supports multiple Firebase projects. See `.firebaserc`.

- **Production**: `moveasy-30eed` (served on `moveazy.in`)
- **Optional**: `moveazy-34225` (alternate project)

You should treat **Production** as protected:
- deploy only from `main`
- use GitHub Actions (not local machines) for consistent deploys
- use “preview channels” for risky changes

---

## Determinism: the non-negotiables

Deploy flakiness usually comes from mismatched toolchain, missing env, or “floating” dependency versions.

This repo makes deploys deterministic by:
- **Pinned install**: `npm ci` uses `package-lock.json`
- **Pinned Node**: `.nvmrc` defines the Node version to use locally and in CI
- **Single build output**: Vite production build → `dist/`
- **Config in files**: `firebase.json`, rules, indexes are in git

If a deploy differs “each time”, it’s almost always one of:
- different Node/npm version
- env vars changed / missing
- `npm install` used instead of `npm ci`
- deploying from a dirty working tree
- deploying from a different Firebase project than intended

---

## Required secrets / environment variables

### Local development

You can run locally with:
- `.env` (developer machine only; **do not commit**)
- start from `.env.example`

### CI / Production deploy

Production deploy is driven by **GitHub Actions**. The deploy workflow writes a `.env` file at build time from GitHub repository secrets (see `.github/workflows/deploy.yml`).

At minimum, production requires all `VITE_FIREBASE_*` keys used by `src/lib/firebase.js`.

Optional (nice-to-have):
- EmailJS keys (`VITE_EMAILJS_*`)
- Sentry (`VITE_SENTRY_DSN`)
- Admin emails list (`VITE_ADMIN_EMAILS`)

---

## CI/CD: how deployments work

### 1) CI (checks)

On every PR/push, CI should run:
- install (via `npm ci`)
- lint (`npm run lint`)
- unit tests (`npm run test`)
- build (`npm run build`)

This prevents “broken main” and catches issues before deploy.

### 2) Deploy (one-click / automated)

On push to `main`, GitHub Actions:
1. installs dependencies (`npm ci`)
2. writes `.env` from secrets
3. runs `npm run build`
4. deploys:
   - Firebase Hosting (live)
   - Firestore rules/indexes
   - Storage rules

The workflow is in:
- `.github/workflows/deploy.yml`

---

## How to deploy manually (fallback only)

Prefer GitHub Actions for production. Manual deploy is only for emergencies.

1. Use the repo’s Node version:
   - install Node matching `.nvmrc`
2. Install deps deterministically:

```bash
npm ci
```

3. Ensure `.env` exists and is correct (start from `.env.example`)
4. Build:

```bash
npm run build
```

5. Deploy:

```bash
npx --yes firebase-tools@13 deploy --only hosting,firestore,storage --project moveasy-30eed
```

---

## Rollback (one-click “boom”)

Firebase Hosting keeps release history.

### Roll back the live site

List recent releases:

```bash
npx --yes firebase-tools@13 hosting:releases:list --project moveasy-30eed
```

Rollback to a previous release:

```bash
npx --yes firebase-tools@13 hosting:rollback --project moveasy-30eed
```

Or rollback to a specific version (recommended when you know the version):

```bash
npx --yes firebase-tools@13 hosting:rollback <version> --project moveasy-30eed
```

### Important note about rules rollbacks

Hosting rollback does **not** automatically roll back Firestore/Storage rules.
If you need “full rollback”, keep rules changes small and deploy them together with app changes (CI does this).

---

## “Deployment shouldn’t require luck” checklist

If something breaks, check in this order:

- **CI status**: did lint/tests/build pass on GitHub?
- **Secrets**: are required `VITE_FIREBASE_*` secrets present in GitHub?
- **Authorized domains**: `moveazy.in` is added in Firebase Auth → Authorized domains
- **Firebase project**: confirm you deployed to `moveasy-30eed`
- **Cache**:
  - `index.html` is `no-cache` (see `firebase.json`)
  - assets are immutable hashed files (`/assets/**`)

---

## Production hardening recommendations (next)

If you want truly “enterprise-grade” deploy safety:
- protect `main` with required CI checks
- require manual approval for the “production” environment in GitHub
- deploy to a **preview channel** first, then promote to `live`
- add Playwright smoke tests to run before deploy (or nightly)


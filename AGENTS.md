# AI agent guide — read this first

**Every automated agent (Cursor, Antigravity, CI bots) must read this file and the architecture doc before changing code or Firebase.**

## Required reading (in order)

1. **[docs/MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md](docs/MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md)** — system design, routes, nav, data model, deploy, naming rules.
2. **[docs/COLLABORATOR_SETUP.md](docs/COLLABORATOR_SETUP.md)** — clone, env, deploy, admin access for collaborators (e.g. Nikhil).
3. Task-specific docs under `docs/` (payments, Antigravity browser tasks, deployment).

## Golden rules

| Rule | Why |
|------|-----|
| **Single source for header/footer nav** | Edit only `src/config/navLinks.js` — never duplicate link lists in `Navbar.jsx`. |
| **Product name: MovEazy** | Not Moveasy / MovEasy in user-facing copy (Firebase project id `moveasy-30eed` is legacy). |
| **Nav label “Guarantee”** | Route `/guarantee`. Do not reintroduce “Deposit Saver” in the header (payment SKU `deposit-saver` is internal only). |
| **`/agents` is a first-class public page** | Route + nav item **Agents** must stay; data from Firestore `siteSettings/directoryAgents` (Admin → Agents tab). |
| **Contact vs Support** | One page: `/contact` with `#sales` and `#support`. `/support` redirects to `/contact#support`. |
| **Flat Plan** | Route `/plan` (iframe → `public/moveazy-plan-page.html`). Nav label **Flat Plan**. |
| **Authorization = Firestore rules** | React `RoleRoute` is UX only; always align rule changes with `firestore.rules`. |
| **Update architecture doc** | After any route, nav, collection, or deploy change, update `docs/MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md` § changelog. |

## Live environments

| URL | Purpose |
|-----|---------|
| https://moveeazy.in | Primary custom domain |
| https://moveasy-30eed.web.app | Firebase Hosting default |
| Firebase project `moveasy-30eed` | Auth, Firestore, Storage, Functions, Hosting |

## Deploy (maintainers)

```bash
npm run deploy:hosting
```

Hard-refresh (**Ctrl+Shift+R**) after deploy — users often see cached JS with old nav (“Deposit Saver”, missing Agents).

## Antigravity

- Browser/console checklist: [docs/ANTIGRAVITY_BROWSER_TASKS.md](docs/ANTIGRAVITY_BROWSER_TASKS.md)
- Prefer Firebase Console / DNS / Razorpay steps there; **coordinate nav/product changes via `navLinks.js` + architecture doc**, not one-off navbar edits.

## Maintainer

- Primary: `jiyanshudhaka20@gmail.com` (admin bootstrap + `VITE_ADMIN_EMAILS`)

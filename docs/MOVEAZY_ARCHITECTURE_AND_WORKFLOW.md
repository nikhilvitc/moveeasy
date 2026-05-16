# MovEazy — Architecture, Workflow & Operations Guide

**Document version:** 2.0 (May 2026)  
**Repository:** [MOVEASY-WEBSITE](https://github.com/jiyanshud22/MOVEASY-WEBSITE)  
**For AI agents:** Read [AGENTS.md](../AGENTS.md) at repo root **before** any code or Firebase change.

---

## Changelog (maintainers: append every structural change)

| Date | Change | Author / tool |
|------|--------|----------------|
| 2026-05 | Onboarding route, App Check / collaborator permission notes in COLLABORATOR_SETUP | Cursor |
| 2026-05 | v2.0: Public routes table, nav canonical config, Agents directory, Contact/Support merge, Guarantee naming, collaborator notes | Cursor |
| 2026-02 | v1.0: Initial architecture (SPA + Firebase) | — |

---

## 1. Executive summary

MovEazy is a **single-page application (SPA)** served as static files. The **browser** runs the UI; **Firebase** provides authentication, Firestore, Storage, Cloud Functions, and Hosting. There is **no traditional Node/Express API** for the main user path—data access is **client → Firestore** under **security rules**.

**Brand:** User-facing name is **MovEazy**. Firebase project id remains `moveasy-30eed` (legacy).

---

## 2. Technology map

| Layer | Technology | Role |
|--------|------------|------|
| **UI** | React 19 + JSX | Components, state |
| **Routing** | React Router v7 | Public + role-gated dashboards |
| **Build** | Vite 8 | `dist/` for Hosting |
| **Styling** | Tailwind CSS 3 | Marketing + dashboards |
| **Maps** | Leaflet + React-Leaflet | `/map`, `/listings` |
| **Animation** | GSAP, Framer Motion | Marketing |
| **Backend** | Firebase (Auth, Firestore, Storage, Functions) | Data + optional callables |
| **Hosting** | Firebase Hosting | SPA rewrite → `index.html` |
| **Rules** | `firestore.rules`, `storage.rules` | **Authorization** |
| **Tests** | Vitest, Playwright | Unit + production smoke |

---

## 3. Public routes (marketing & product)

| Route | Page / asset | Notes |
|-------|----------------|-------|
| `/` | Home | Hero, features, links to plan/guarantee |
| `/services` | Services | Links to `/plan`, `/guarantee` |
| `/guarantee` | Guarantee | Deposit protection product (₹1,999) |
| `/listings` | Redirect → `/map` | Listings discovery |
| `/map` | MapView | Firestore listings |
| `/plan` | MoveazyPlanPage | Iframe → `public/moveazy-plan-page.html?embed=1` |
| **`/agents`** | **AgentsDirectory** | **Editable via Admin → Agents; Firestore `siteSettings/directoryAgents`** |
| `/contact` | Contact | Sales (WhatsApp) + Support (`#support`) |
| `/support` | Redirect → `/contact#support` | Do not add separate Support nav tab |
| `/terms`, `/privacy` | Legal | |
| `/checkout`, `/pay` | Payments | SKUs in `src/config/paymentProducts.js` |
| `/login` | Auth | Email/password + Google |
| `/onboarding` | Onboarding | Writes `userProfiles/{uid}` (+ `userRoles` if missing); requires Auth + App Check when enforced |
| `/my-search` | Customer search profile | Required before agent WhatsApp connect |
| `/customer`, `/seller`, `/admin`, `/crm` | Role dashboards | Gated by `RoleRoute` / `StaffRoute` |

---

## 4. Navigation (canonical — do not duplicate)

**Single source of truth:** `src/config/navLinks.js`

### 4.1 Primary header links (desktop + mobile hamburger)

Both `Navbar.jsx` desktop and mobile menus map **`PRIMARY_NAV_LINKS`** — same list, same order:

1. Services → `/services`  
2. **Guarantee** → `/guarantee` (not “Deposit Saver” in nav)  
3. Listings → `/listings` (active on `/map` too)  
4. **Flat Plan** → `/plan`  
5. **Agents** → `/agents`  
6. Contact → `/contact`  
7. Terms → `/terms`  
8. Privacy → `/privacy`  

### 4.2 CTAs (also in `navLinks.js`)

| Export | Label | Target |
|--------|--------|--------|
| `HEADER_CTA` | Book a Free Consultation Now. | `/contact` |
| `FLAT_SEARCH_CTA` | Start my flat search | `/checkout?sku=flat-search` (₹1,499) |

Footer links: `src/components/layout/Footer.jsx` (`FOOTER_LINKS`) — keep in sync with product intent; includes Agents, Flat Plan, Guarantee.

### 4.3 Stale UI warning

If the mobile menu shows **Deposit Saver**, **Start my flat search** as the only red CTA, or **no Agents / Guarantee / Contact**, the user has a **cached bundle**. Fix: deploy latest hosting, then hard-refresh (Ctrl+Shift+R).

---

## 5. Agents directory

| Concern | Location |
|---------|----------|
| Public UI | `src/pages/AgentsDirectory.jsx` |
| Seed data | `src/data/agentsDirectory.js` |
| Firestore doc | `siteSettings/directoryAgents` |
| Admin CRUD + reorder | Admin dashboard → **Agents** tab (`src/lib/directoryAgentsSettings.js`) |
| WhatsApp connect (no public phone) | Callable `createAgentWhatsAppConnect` + `src/lib/agentWhatsAppConnect.js` |
| Prerequisite | Customer completes `/my-search` profile |

**Do not remove** `/agents` route or **Agents** nav label without explicit product approval.

---

## 6. Contact & public settings

| Concern | Location |
|---------|----------|
| Contact page | `src/pages/Contact.jsx` — `#sales`, `#support` |
| Default team | `src/lib/sitePublicSettings.js` — Kuldeep Meena, Suresh Meena (Sales, WhatsApp) |
| Firestore | `siteSettings/public` (Admin can edit; app merges defaults by phone) |
| WhatsApp helpers | `src/config/contactChannels.js` |
| Seed script (optional) | `scripts/seed-site-public.mjs` (run from `functions/` with firebase-admin) |

---

## 7. Payments & naming

| SKU key (URL) | Customer-facing name | Price |
|---------------|----------------------|-------|
| `flat-search` | MovEazy Flat Search | ₹1,499 |
| `deposit-saver` / `guarantee` | **MovEazy Guarantee** | ₹1,999 |

Config: `src/config/paymentProducts.js`. Internal alias `deposit-saver` → `guarantee` product object is intentional for old links.

---

## 8. End-to-end workflows

### 8.1 First visit → marketing

Hosting serves `index.html` → React Router renders public routes (no auth).

### 8.2 Sign-in

`AuthContext` → Firebase Auth → `userProfiles` / `userRoles` / `emailRoles` (admin promotion by email).

### 8.3 Listings map

`/map` reads Firestore `listings` (published); rules + `sanitizePublicListing` hide private fields.

### 8.4 Staff CRM

`/crm` — `crmLeads`, `crmTasks`, assignee scoping for sub_admin/consultant.

### 8.5 Deploy

```bash
npm run deploy:hosting   # build + hosting + firestore rules
```

Functions: separate `firebase deploy --only functions`. See [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 9. Repository layout

```
AGENTS.md                          # AI agents: read first
src/
  App.jsx                          # All routes
  config/
    navLinks.js                    # ★ Header nav + CTAs
    paymentProducts.js
    contactChannels.js
  pages/
    AgentsDirectory.jsx
    Contact.jsx
    MoveazyPlanPage.jsx
    ...
  lib/
    sitePublicSettings.js
    directoryAgentsSettings.js
    firestoreStore.js
public/
  moveazy-plan-page.html           # Flat Plan iframe content
firestore.rules
storage.rules
functions/src/index.js             # Razorpay, WhatsApp connect, etc.
docs/
  MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md  # ★ This file
  COLLABORATOR_SETUP.md
  ANTIGRAVITY_BROWSER_TASKS.md
```

---

## 10. Collaborators (Antigravity / Nikhil)

- **Goal:** Shared understanding of nav, routes, and Firebase—avoid parallel navbar experiments.
- **Onboarding:** [COLLABORATOR_SETUP.md](./COLLABORATOR_SETUP.md) — clone, `.env.collaborator.example`, no secrets in git.
- **Antigravity:** Use [ANTIGRAVITY_BROWSER_TASKS.md](./ANTIGRAVITY_BROWSER_TASKS.md) for Console/DNS/Razorpay; for **app structure**, follow this doc + `navLinks.js`.
- **Admin access:** `VITE_ADMIN_EMAILS`, `bootstrapAdmins/{email}`, sign-in → `/admin`.
- **After any agent-driven change:** Update § Changelog above and mention in PR/commit.

---

## 11. Security model (short)

- **Auth:** Firebase Auth  
- **Authorization:** Firestore + Storage rules (required)  
- **Client role checks:** UX only  

---

## 12. Related docs

| Doc | Use |
|-----|-----|
| [AGENTS.md](../AGENTS.md) | Mandatory agent preamble |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | CI/CD, rollback |
| [PAYMENTS_PRODUCTION.md](./PAYMENTS_PRODUCTION.md) | Razorpay |
| [ANTIGRAVITY_BROWSER_TASKS.md](./ANTIGRAVITY_BROWSER_TASKS.md) | Production browser checklist |
| [PRODUCTION_GO_LIVE_CHECKLIST.md](./PRODUCTION_GO_LIVE_CHECKLIST.md) | Go-live |

---

*When in doubt: read AGENTS.md → this file → edit `navLinks.js` for nav → update changelog.*

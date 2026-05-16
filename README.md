# MovEazy

A rental and relocation platform: flat search, listing map, deposit **Guarantee**, agent directory, and role-based admin/seller/customer dashboards. Built with React + Firebase.

## For developers & AI agents

**Read before changing code:**

1. **[AGENTS.md](./AGENTS.md)** — mandatory rules for Cursor, Antigravity, and collaborators  
2. **[docs/MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md](./docs/MOVEAZY_ARCHITECTURE_AND_WORKFLOW.md)** — routes, nav, data model, deploy (update changelog when you change structure)

## Tech stack

- React 19, React Router 7, Vite 8, Tailwind CSS  
- Firebase (Auth, Firestore, Storage, Hosting, Functions)  
- Leaflet (map), GSAP / Framer Motion (marketing)

## Quick start

```bash
git clone https://github.com/jiyanshud22/MOVEASY-WEBSITE.git
cd MOVEASY-WEBSITE
copy .env.collaborator.example .env   # Windows; use cp on macOS/Linux
npm install
npm run dev
```

See [docs/COLLABORATOR_SETUP.md](./docs/COLLABORATOR_SETUP.md) for env vars and admin access.

## Key public routes

| Route | Description |
|-------|-------------|
| `/` | Home |
| `/services` | Services |
| `/guarantee` | Guarantee (₹1,999 deposit protection) |
| `/listings` → `/map` | Property map |
| `/plan` | Flat Plan (₹1,499 flat search) |
| **`/agents`** | **Agent directory** (Firestore-backed, Admin-editable) |
| `/contact` | Sales + support |
| `/checkout`, `/pay` | Payments |

Header nav is defined only in **`src/config/navLinks.js`** (includes **Agents**).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Dev server |
| `npm run build` | Production build → `dist/` |
| `npm run deploy:hosting` | Build + deploy to Firebase `moveasy-30eed` |
| `npm run test` | Vitest |
| `npm run e2e` | Playwright |

## Production

- **Site:** https://moveeazy.in  
- **Hosting:** https://moveasy-30eed.web.app  
- **Deploy:** [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)  
- **Antigravity tasks:** [docs/ANTIGRAVITY_BROWSER_TASKS.md](./docs/ANTIGRAVITY_BROWSER_TASKS.md)

## License

Private.

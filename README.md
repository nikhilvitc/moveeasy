# MovEazy

A modern rental and moving platform built with React. MovEazy helps users find apartments, compare moving services, and access a deposit-free guarantee — all in one place.

## Tech Stack

- **React 19** with React Router v7
- **Vite** — fast dev server and build tool
- **Tailwind CSS** — utility-first styling
- **Framer Motion** — animations
- **Leaflet / React-Leaflet** — interactive maps
- **Lucide React** — icons

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm (comes with Node.js)

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/navyagurugubelli/moveazy.git
cd moveazy
```

### 2. Install dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (default Vite port).

## Available Scripts

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `npm run dev`       | Start the development server with HMR      |
| `npm run build`     | Build for production (outputs to `dist/`)  |
| `npm run preview`   | Preview the production build locally       |
| `npm run lint`      | Run ESLint across the project              |
| `npm run test`      | Run unit tests (Vitest)                    |

## Project Structure

```
src/
├── assets/            # Images, icons, logos
├── components/
│   ├── layout/        # Navbar, Footer
│   └── sections/      # Reusable page sections (Hero, Features, Stats, etc.)
├── hooks/             # Custom React hooks (useScrollAnimation)
├── pages/             # Route-level pages
│   ├── Home.jsx
│   ├── Services.jsx
│   ├── Listings.jsx
│   └── Guarantee.jsx
├── App.jsx            # Router setup
├── main.jsx           # Entry point
└── index.css          # Global styles + Tailwind directives
```

## Pages

| Route         | Page        | Description                              |
| ------------- | ----------- | ---------------------------------------- |
| `/`           | Home        | Landing page with hero, features, stats  |
| `/services`   | Services    | Moving services overview and comparison  |
| `/listings`   | Listings    | Apartment listings with smart matching   |
| `/guarantee`  | Guarantee   | Deposit-free guarantee plans and FAQ     |

## Building for Production

```bash
npm run build
```

The optimized output will be in the `dist/` directory. You can deploy this to any static hosting provider (Vercel, Netlify, GitHub Pages, etc.).

To preview the build locally:

```bash
npm run preview
```

## Production Setup Docs

- Email verification + welcome email function setup:
  - `docs/EMAIL_VERIFICATION_AND_WELCOME_SETUP.md`
- Go-live checklist:
  - `docs/PRODUCTION_GO_LIVE_CHECKLIST.md`

## License

This project is private.

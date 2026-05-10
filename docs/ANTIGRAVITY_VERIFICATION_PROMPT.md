# Antigravity / QA verification prompt — MovEazy recent changes

Copy everything below the line into your agent and run against the **deployed** site (or local `npm run dev`) after pulling latest `main`.

---

You are verifying a production MovEazy web app (React + Vite + Firebase). Use the live URL the user provides (e.g. `https://moveasy-30eed.web.app`) or local `http://localhost:5173`.

## 1. Features section (“Thousands Are Moving Smarter with Moveazy”)

- [ ] Scroll to the four feature cards on the home page.
- [ ] **Card 2** (“Broker-Matched, Not Listing-Based”) must show a **distinct broker/real-estate icon image** (not the same generic avatar as card 1).
- [ ] Button **“Book a Free Consultation Now”** under this section must navigate to **`/contact`**, not `/map`.

## 2. Navbar

- [ ] Desktop: **“Book a Free Consultation Now”** → `/contact` (already expected).
- [ ] **“Explore map”** → `/map` (separate button).

## 3. Smart Match (“Find the Right Home — Without the Guesswork”)

- [ ] Complete the wizard through to results (area, budget, timeline).
- [ ] **“Talk to a consultant”** must go to **`/contact`**.
- [ ] **“Open matches on map”** must still go to **`/map`** with query params reflecting selections (`locality`, `minRent`, `maxRent`, `availability` where applicable).
- [ ] **“Same search, show filter panel”** → map with `openFilters=1` (or equivalent).
- [ ] Listing cards: if listings have image URLs in Firestore (`image`, `images[]`, or alternate fields), a photo should render; otherwise “Photo coming soon” is acceptable.

## 4. Staff CRM (requires staff login)

- [ ] **`/crm`**: only `admin`, `sub_admin`, `consultant` can access; customers redirected.
- [ ] **Sub-admin** sees only leads/tasks where **`assigneeEmail`** equals their email.
- [ ] **Admin** sees all leads; can **reassign** via staff picker (sub_admin + consultant).
- [ ] **Bulk import** (admin): paste TSV with header row + data; choose default assignee; rows create leads with **`extraFields`** for unknown columns.
- [ ] Lead row: **`extraFields`** JSON block visible; elevated roles can edit.

## 5. Firestore / security (smoke only)

- [ ] Unauthenticated user cannot read `crmLeads` / `crmTasks` (browser devtools: expect permission errors if attempting direct SDK reads without auth — do not bypass rules).

## 6. Deploy sanity

- [ ] Hosting build is current: hard-refresh (Ctrl+F5) and confirm **Features** CTA and **Smart Match** consultant button behaviors above.

Report pass/fail per section with the URL tested and any screenshots of failures.

---

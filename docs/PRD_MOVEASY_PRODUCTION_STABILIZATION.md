# PRD: MovEasy Production Stabilization and V2 Integration

## Problem Statement

MovEasy has broad feature coverage but still has production-readiness gaps:
- Role card selection and auth behavior mismatch (admin credentials accepted from non-admin mode).
- Firebase/SMTP dependent flows not fully configured in production.
- Legacy home and V2 experience are split and need controlled integration.
- Client-side storage is still heavily used.

## Goals

1. Make authentication behavior deterministic and trustable.
2. Preserve all current progress and keep customer-facing home quality.
3. Stabilize admin operations (listing CRUD, map pin, broker bulk import).
4. Complete production setup checklist and testing workflow.
5. Integrate V2 design progressively without regressions.

## Non-Goals

- Full MLS federation and AVM engine in this phase.
- Native mobile applications.
- Unauthorized third-party scraping.

## User Roles

- Customer: browse listings, apply/book, track assignments.
- Seller: manage listings and apply for verified badge.
- Admin: manage listings, imports, assignments, approvals.

## Functional Requirements

### FR-1: Role-Mode Enforcement (Login)
- Selected card controls auth mode:
  - Admin card -> sign-in only.
  - Seller/Customer card -> signup/signin for non-admin accounts.
- Admin credentials entered in customer/seller mode must be blocked with clear error.
- Admin mode with non-admin email must be blocked with clear error.

### FR-2: Auth and Verification
- Customer/Seller signup uses verified email flow when Firebase is configured.
- Login blocks unverified users and prompts verification.
- Admin credential flow remains explicit and isolated.

### FR-3: Admin Operations
- Listing create/edit/delete remains functional.
- Map pin picker updates coordinates and persists on save.
- Broker import supports broker-name-first bulk ingest from legal JSON/CSV/TSV exports.

### FR-4: Customer Experience
- Legacy home stays primary customer landing.
- Customer dashboard remains accessible from navigation.
- V2 route exists as incremental enhancement surface.

### FR-5: Deployment and QA
- CI must run tests + build on push.
- Browser smoke checklist required before “production-ready” claim.

## Acceptance Criteria

1. Login role-mode bug fixed (admin cannot authenticate through customer/seller mode).
2. Home, map, admin CRUD, broker import, and V2 route work without regressions.
3. Customer dashboard reachable while keeping legacy home as default customer landing.
4. Build and tests pass in CI.
5. Firebase/SMTP setup documentation is complete and actionable.

## Risks

- Missing production Firebase/SMTP credentials block full end-to-end auth proof.
- LocalStorage-based persistence may not satisfy enterprise-grade reliability.
- Import data quality varies by partner export format.

## Rollout Plan

### Phase 1 (Done/Immediate)
- Role-mode hardening in login.
- Preserve existing home + dashboard access.
- Keep V2 isolated route.

### Phase 2
- Complete Firebase + SMTP live config.
- Verify welcome email dispatch and verification flow in production.

### Phase 3
- Add post-deploy smoke automation and observability.
- Start backend migration away from localStorage as source of truth.

# Moveasy Production Hardening and Test Plan

## 1) Immediate Reality Check (Current Architecture)

- Current app is primarily frontend-only with `localStorage` data.
- There are no production APIs for auth/listings/assignments, so classic Postman API test coverage is currently not applicable.
- True email existence verification and transactional email delivery cannot be trusted from frontend code alone.

## 2) Target Production Architecture (Required)

- Backend service (Node.js/Express or NestJS) with PostgreSQL.
- Managed auth provider or backend auth with:
  - verified email flow (OTP or magic-link)
  - refresh/access tokens
  - password reset
- SMTP or transactional provider (SendGrid/SES/Postmark) for deliverability.
- Rate limiting, bot protection, audit logs, and admin action logs.

## 3) Test Strategy by Layer

### A. Unit Testing

- Validation utilities (email format, password policy, rent parsing).
- Auth state transitions (pending/approved/rejected).
- Listing normalization and filter logic.

Target: `>= 85%` coverage on core business logic files.

### B. Integration Testing

- Auth: signup -> verify -> login -> role access.
- Listing CRUD and assignment workflow.
- Seller approval and customer lead lifecycle.

### C. API/Postman Testing (After backend exists)

- Build collections for:
  - auth endpoints
  - listings endpoints
  - assignment endpoints
  - admin approval endpoints
- Add automated environments for staging/prod with test data sets.

### D. End-to-End Testing

- Playwright/Cypress scenarios:
  - customer signup/login/search
  - seller flow
  - admin listing + GPS pin flow
  - role-based route protection

### E. Security Testing

- OWASP ASVS-lite checks:
  - brute-force/rate-limit
  - session fixation
  - XSS and input sanitization
  - access control bypass checks
- Dependency audit and SAST scan in CI.

### F. Performance and Capacity Testing

- k6 baseline:
  - P95 latency target: < 500ms on key APIs
  - error rate: < 1%
- Start with `100` concurrent users, then `250`, then `500`.
- Capacity published only after real backend + DB load tests.

## 4) Exit Criteria (Commercial Go-Live)

- All P0/P1 bugs closed.
- Email verification enforced server-side.
- Security checks pass with no high severity findings.
- CI green for lint/test/build/e2e.
- Load test report attached with tested concurrent-user limits.

## 5) Work Completed in This Pass

- Added account verification gate in auth flow:
  - signup creates `pending` verification account
  - login blocked until verified
- Added admin verification queue controls:
  - approve/reject pending accounts in admin dashboard
- This removes immediate random self-activated account access risk in current localStorage architecture.


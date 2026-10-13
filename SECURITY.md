# Security Audit & Access Control Review

## Executive Summary
This document provides a comprehensive security review and audit findings for **NGOConnect AI**, verifying:
1. Strict role-based access control (RBAC) and entity ownership validation across all write endpoints.
2. Prevention of sensitive data leakage across public and authenticated API responses.
3. Input validation, sanitization (text trimming), and pagination limits preventing Denial of Service (DoS).
4. Database isolation between development demo data and automated test runs via `DATABASE_URL_TEST`.

---

## 1. Complete Write Endpoints Audit Table

Every state-modifying endpoint (`POST`, `PUT`, `PATCH`, `DELETE`) enforces strict role verification and entity ownership checks:

| Endpoint | Method | Role Check | Ownership Check | Status & Business Rules |
| :--- | :--- | :--- | :--- | :--- |
| `/api/auth/register` | `POST` | Public (`donor` or `ngo`) | Creates new user record | Validates email, password length, and required NGO profile fields |
| `/api/auth/login` | `POST` | Public | Authenticates credentials | Rate limited; sets `httpOnly`, `SameSite=Lax` session cookie |
| `/api/auth/logout` | `POST` | Public / Authenticated | N/A | Clears session cookie |
| `/api/ngos/my/profile` | `PUT` | `ngo` | Scoped to `req.user.id` | Updates organization name, description, phone, address, city |
| `/api/ngos/my/documents` | `POST` | `ngo` | Scoped to calling NGO's profile | Allowed only while NGO status is `PENDING` or `REJECTED` (403 otherwise). Verifies magic byte headers (PDF, JPEG, PNG) up to 5MB. Stored with random storage keys in private directory. |
| `/api/ngos/my/documents/:docId` | `DELETE` | `ngo` | Owner NGO only (`document.ngoProfileId === ngo.id`) | Allowed only while NGO status is `PENDING` or `REJECTED` (403 otherwise). Removes physical file from disk and database record. |
| `/api/ngos/my/resubmit` | `POST` | `ngo` | Scoped to calling NGO's profile | Allowed only from `REJECTED` status and requires at least 1 uploaded document (400 otherwise). Transitions status to `PENDING` and logs `NgoVerificationReview` row. |
| `/api/ngos/admin/:id/status` | `PATCH` | `admin` | Administrative oversight | Rejection requires a mandatory reason. Approval requires at least 1 uploaded document. Atomically updates status, writes review history, and notifies NGO. |
| `/api/requests` | `POST` | `ngo` (`APPROVED` only) | Created for caller's NGO profile | Blocked for `PENDING`, `REJECTED`, or `SUSPENDED` NGOs (403). Input validated with positive integers and trimmed text. |
| `/api/requests/:id` | `PUT` / `PATCH` | `ngo`, `admin` | Calling NGO must own the request (`ngoProfile.userId === user.id`) or `admin` | Blocked with 403 Forbidden for non-owners. |
| `/api/requests/:id` | `DELETE` | `ngo`, `admin` | Calling NGO must own the request (`ngoProfile.userId === user.id`) or `admin` | Blocked with 403 Forbidden for non-owners. |
| `/api/resources` | `POST` | `donor` or `APPROVED` `ngo` | Associated with `ownerId: user.id` | Blocked for unapproved NGOs (403). Validates expiry date in future and positive integer quantity. |
| `/api/resources/:id` | `PUT` | `donor`, `ngo`, `admin` | Listing owner (`ownerId === user.id`) or `admin` | Blocked with 403 Forbidden for non-owners. |
| `/api/resources/:id/withdraw` | `PATCH` | `donor`, `ngo`, `admin` | Listing owner (`ownerId === user.id`) or `admin` | Blocked with 403 Forbidden for non-owners. Transitions status to `WITHDRAWN`. |
| `/api/resources/:id/claim` | `POST` | `APPROVED` `ngo` | Blocked if NGO owns the resource (`ownerId === user.id`) | Only `APPROVED` NGOs can claim. Interactive transaction ensures concurrency safety; exhausts quantity atomically. Writes `TransferEvent` and notification. |
| `/api/transfers` | `POST` | `donor` | Sets `donorId: user.id` | Only allowed for `APPROVED` receiving NGOs and open/partial requests. Atomically reserves quantity, logs `TransferEvent`, and writes counterparty notifications. |
| `/api/transfers/:id/status` | `PATCH` | Authenticated | Multi-role state machine: | - `IN_TRANSIT`: Only donating donor, resource owner, or admin (403 otherwise).<br>- `RECEIVED`: Only receiving NGO or admin (403 otherwise).<br>- `CANCELLED`: Donating donor, resource owner, receiving NGO, or admin (403 otherwise). Releases reserved quantities atomically. Rejects transitions from terminal states (`RECEIVED` or `CANCELLED`). |
| `/api/notifications/read-all` | `PATCH` | Authenticated | Filtered strictly to `where: { userId: req.user.id }` | Cannot mark other users' notifications read. |
| `/api/notifications/:id/read` | `PATCH` | Authenticated | Checked: `notification.userId === req.user.id` | Returns 403 Forbidden if attempting to read another user's notification. |
| `/api/ai/draft` | `POST` | `ngo` | Caller scoped | Assisting draft creation; input validated. |
| `/api/ai/match` | `POST` | Public / Donor | Read-only matching computation | Input validated; returns public request view. |

---

## 2. Data Leakage & Privacy Boundary Audit

All controllers employ mapper isolation layers before responding to clients:
1. **Password Hashes**:
   - Stripped in `userMapper.js` (`toSafeUser`, `toAuthUser`).
   - Never included in any database `select` or API response payload.
2. **Document Storage Keys**:
   - Internal storage keys (`storageKey`) and private upload paths are never exposed in document lists, NGO profiles, or transfer payloads.
   - Files are stored in a private directory not exposed via `express.static`.
   - Streaming is restricted solely to `GET /api/ngos/admin/documents/:docId/stream` under admin authorization.
3. **NGO Confidential Information**:
   - Public visitors querying `GET /api/ngos` or `GET /api/ngos/:id` receive sanitized data via `toPublicNgo`: registration numbers (`regNumber`), private phone numbers, physical addresses, verification notes, and documents are excluded.
   - Only the owning NGO or a platform administrator receives the full private view (`toPrivateNgo`).
4. **Donor & Counterparty Privacy**:
   - Public listings (`GET /api/resources`, `GET /api/requests`) expose only safe public summaries (`toSafeUser`) displaying name and role, omitting email addresses and account identifiers.

---

## 3. Input Validation & Pagination Caps

1. **Text Trimming and Length Constraints**:
   - All string inputs in Zod validators (`authValidator.js`, `ngoValidator.js`, `requestValidator.js`, `resourceValidator.js`, `transferValidator.js`, `aiValidator.js`) enforce `.trim()`.
   - Whitespace-only strings are rejected by `.min(...)` constraints.
2. **Numeric & UUID Validation**:
   - Quantities enforce positive integers (`z.number().int().positive()`).
   - Foreign key identifiers enforce UUID format (`z.string().uuid()`).
3. **Pagination & Query Limits**:
   - All public and authenticated list endpoints enforce an upper cap on records:
     - `GET /api/requests`: Capped at `Math.min(limit, 100)`, defaults to `50`. Supports `skip` and `page`.
     - `GET /api/resources`: Capped at `Math.min(limit, 100)`, defaults to `50`. Supports `skip` and `page`.
     - `GET /api/ngos`: Capped at `Math.min(limit, 100)`, defaults to `50`. Supports `skip` and `page`.
     - `GET /api/ngos/admin/all`: Capped at `Math.min(limit, 100)`, defaults to `50`. Supports `skip` and `page`.
     - `GET /api/notifications`: Capped at `50` records (`take: 50`).
     - Owner listings (`listMyRequests`, `listMyResources`, `listDonorTransfers`, `listNgoTransfers`, `listMyDocuments`, `listDocumentsForAdmin`, `listReviewsForAdmin`): Enforce `take: 100`.
   - Unbounded queries are prevented across all database interactions.

---

## 4. Test Database Isolation

1. **Dedicated Database**:
   - Automated tests run against `DATABASE_URL_TEST` (`ngoconnect_ai_test`), completely separate from the development database (`DATABASE_URL` / `ngoconnect_ai`).
2. **Automated Reset**:
   - Vitest config uses `globalSetup: ['./tests/globalSetup.js']` which synchronizes schema with `prisma db push --skip-generate` and reseeds clean baseline data before every test run.
   - Development and demo data are never modified, dirtied, or deleted during test suite execution.

---

## 5. Defense-in-Depth & Infrastructure Hardening

1. **HTTP Security Headers**: Powered by `helmet`, setting `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, and standard CSP directives.
2. **Cookie Security**: Authentication JWTs are stored in `httpOnly` cookies with `SameSite=Lax` (`Secure=true` in production), preventing cross-site scripting (XSS) credential theft.
3. **Rate Limiting**: `express-rate-limit` throttles authentication endpoints (`/api/auth/login`, `/api/auth/register`) to 10 requests per 15-minute window to mitigate brute-force credential stuffing.
4. **CORS Configuration**: Restricts origin to configured `CLIENT_URL` with explicit credential allowance.

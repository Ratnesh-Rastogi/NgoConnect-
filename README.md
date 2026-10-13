# NGOConnect AI

A modern resource-sharing platform connecting verified NGOs, donors, and administrators with real-time quantity reservation, document verification, transfer timelines, and smart matching.

---

## Architecture Overview

- **Stack**: Pure JavaScript (No TypeScript).
- **Frontend**: React 18 + Vite + Tailwind CSS + Axios + Recharts + Lucide Icons in `/client`
- **Backend**: Node.js + Express (ES Modules) + Prisma ORM + PostgreSQL + Zod in `/server`
- **Security**: Strict Role & Ownership authorization, Helmet security headers, httpOnly SameSite=Lax JWT cookies, magic byte document validation, and database rate limiting.

---

## Environment Variables

### Server (`server/.env`)

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Backend HTTP port | `3000` |
| `DATABASE_URL` | PostgreSQL connection URL for development & demo data | `postgresql://postgres:password@localhost:5433/ngoconnect_ai` |
| `DATABASE_URL_TEST` | PostgreSQL connection URL for automated tests (isolated) | `postgresql://postgres:password@localhost:5433/ngoconnect_ai_test` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens | `ngoconnect_ai_super_secret_jwt_key_2026_dev_env` |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` |
| `NODE_ENV` | Application environment mode | `development` / `production` / `test` |
| `CLIENT_URL` | Frontend URL for CORS configuration | `http://localhost:5173` |

A sample template is provided in `server/.env.example`.

---

## Quick Start Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (v14+) running locally

### 1. Database & Server Setup
Open a terminal and navigate to `/server`:
```bash
cd server
npm install

# Push database schema to PostgreSQL
npm run prisma:push

# Seed demo dataset (Admin, Approved NGOs, Pending NGO, Donor, Categories, Resources)
npm run prisma:seed

# Start backend dev server (hot reload on http://localhost:3000)
npm run dev
```

### 2. Client Setup
In a second terminal, navigate to `/client`:
```bash
cd client
npm install

# Start Vite frontend dev server (runs on http://localhost:5173)
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## Seed Accounts (Password: `password123` for all)

| Role | Account Name | Email | Verification Status |
| :--- | :--- | :--- | :--- |
| **Admin** | System Administrator | `admin@ngoconnect.org` | Oversight Administrator |
| **NGO** | Hope Relief Foundation | `hope@relief.org` | `APPROVED` |
| **NGO** | Clean Water Initiative | `cleanwater@health.org` | `APPROVED` |
| **NGO** | Sunshine Animal Sanctuary | `sunshine@animals.org` | `PENDING` (Appears in Admin review queue) |
| **Donor** | Sarah Jenkins | `donor@example.com` | Verified Donor |

---

## End-to-End Demo Walkthrough

### Walkthrough 1: Donor Donation & NGO Transfer Timeline
1. **Sign in as Donor** (`donor@example.com` / `password123`).
2. Navigate to **Home** to view open NGO requests (e.g., *Emergency Thermal Blankets* by Hope Relief).
3. Click **Donate** on an urgent request:
   - Enter a quantity (e.g., `25`) and add an optional note.
   - Click **Confirm Donation**. The request's reserved quantity updates atomically.
4. Go to **My Donations** in the header or the **Donor Dashboard**:
   - Locate the new transfer with `PENDING` status.
   - Click **Dispatch / Mark In-Transit**, enter tracking info (e.g., `BlueDart AWB #9481023`), and submit.
   - Observe the Transfer Timeline record the event in real time.
5. **Sign in as NGO** (`hope@relief.org` / `password123`):
   - Notice the unread notification badge on the bell icon in the navigation bar.
   - Go to **NGO Dashboard** -> **Incoming Transfers**.
   - See the dispatched transfer with tracking information.
   - Click **Confirm Receipt**.
   - The status updates to `RECEIVED`, request fulfilled count increments, and the counterparty receives a delivery notification.

---

### Walkthrough 2: NGO Document Upload & Admin Verification Queue
1. **Sign in as Pending NGO** (`sunshine@animals.org` / `password123`).
2. Notice the yellow banner: *Verification Status: PENDING*.
3. Go to **NGO Dashboard** -> **Verification & Documents**:
   - Upload an NGO document (PDF, PNG, or JPEG, up to 5MB).
   - Real magic-byte signatures are checked on upload.
   - Notice documents can be viewed or deleted while status is `PENDING` or `REJECTED`.
4. **Sign in as Admin** (`admin@ngoconnect.org` / `password123`):
   - Navigate to **Admin Governance** -> **NGO Verification Queue**.
   - Sunshine Animal Sanctuary appears in the queue with its uploaded certificates.
   - Click **View Document** to stream the document privately in the built-in PDF/image viewer.
   - Try rejecting: Requires a mandatory rejection reason (e.g. *Certificate seal illegible*).
5. **Switch back to Sunshine Animal Sanctuary**:
   - The banner reflects `REJECTED` with the admin's reason.
   - Delete/re-upload documents and click **Resubmit Verification**.
   - Status transitions back to `PENDING` and a review log is appended.
6. **Switch back to Admin**:
   - Click **Approve NGO**. The NGO status is now `APPROVED`.
   - The NGO can now create public requests and claim available resources.

---

### Walkthrough 3: Available Resources & Real-Time Claiming
1. **Sign in as Donor** (`donor@example.com` / `password123`):
   - Click **List Resource** in the navigation bar.
   - Fill in title, category, total quantity, unit, city, and future expiry date.
   - Submit the listing.
2. **Sign in as Approved NGO** (`hope@relief.org` / `password123`):
   - Click **Browse Resources** in the navigation bar.
   - Find the donor's listing and click **Claim Resource**.
   - Specify quantity to claim and an optional note.
   - Submit: Available quantity decrements atomically, and a transfer record with an initial `TransferEvent` is created.

---

## Running Automated Tests

Tests run against a separate, isolated test database (`DATABASE_URL_TEST`) and reset the schema and seed data before each run, ensuring demo data is never altered:

```bash
cd server
npm test
```

### Test Coverage Highlights (71 Tests Passing)
- **Document Verification & Admin Oversight**: Magic byte header inspection (PDF, PNG, JPEG), file size limits, private streaming, reject reasons, resubmission state rules, and document deletion guards.
- **Transfer History & Events**: `TransferEvent` audit trail written in atomic transactions across creation, dispatch, receipt, and cancellation.
- **Notifications**: User ownership checks, read-all and read-one scoping, counterparty status change notifications.
- **Dashboards**: Scoped aggregates for NGO, Donor, and Admin with time-series trends.
- **Quantity Reservations**: Concurrent race condition protection and over-allocation prevention.
- **Authentication & RBAC**: Password hashing, role guards, and cookie protection.

# NGOConnect AI

A resource-sharing platform connecting NGOs, individual donors, and the public with real-time quantity reservation and smart AI need-matching.

## Project Architecture

- **Stack**: Pure JavaScript (No TypeScript).
- **Client**: React 18 + Vite + Tailwind CSS + Axios in `/client`
- **Server**: Node.js + Express (ES Modules) + Prisma ORM + PostgreSQL + Zod in `/server`
- **Structure**: Two folders only (`client` and `server`), no monorepo setup.

---

## Quick Start

### 1. Database Setup & Server
Ensure PostgreSQL is running, then navigate to `/server`:
```bash
cd server
npm install
npm run prisma:generate
npm run prisma:push
npm run prisma:seed    # Populates test Admin, NGOs, Donor, and Requests
npm run dev            # Starts backend on http://localhost:3000
```

### 2. Client Setup
In a separate terminal, navigate to `/client`:
```bash
cd client
npm install
npm run dev            # Starts frontend on http://localhost:5173
```

---

## Running the Automated Test Suite
From the `/server` folder, run:
```bash
npm test
```
Runs 20 automated integration tests covering:
- **Auth**: Registration, JWT tokens, duplicate email rejection, password hashing.
- **Permissions & Roles**: Visitor read-only access, unapproved NGO restrictions, admin-only verification updates, ownership checks.
- **Quantity Reservation**: Atomic reservation on pledge, cap enforcement, over-reservation prevention.
- **Transfer Transitions**: Full lifecycle `PENDING` -> `IN_TRANSIT` -> `RECEIVED` / `CANCELLED`, quantity release on cancellation.

---

## Seed Accounts (Password: `password123` for all)
- **Admin**: `admin@ngoconnect.org`
- **Approved NGO (Hope Relief)**: `hope@relief.org`
- **Approved NGO (Clean Water)**: `cleanwater@health.org`
- **Pending NGO (Sunshine Animals)**: `sunshine@animals.org`
- **Donor (Sarah)**: `donor@example.com`

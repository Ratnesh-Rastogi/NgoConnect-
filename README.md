# NGOConnect AI

NGOConnect AI is a website that connects **donors**, **NGOs** and **people who need help urgently**. Donors give items or help. NGOs ask for what they need and receive it. An **admin** checks that every NGO is real before the public can see it.

---

## 1. What problem does it solve?

- Donors don't know which NGOs are real or what they need right now.
- NGOs have no single place to ask for help and track what arrives.
- A person who finds someone in urgent need doesn't know which NGO to call.

NGOConnect puts all of this in one place, and only **verified NGOs** are shown to the public.

---

## 2. Who uses it?

| Role | What they can do |
|------|------------------|
| **Visitor** (no login) | Browse approved NGOs, see their contact details, use the **Urgent Help Finder** |
| **Donor** | Donate to NGO requests, list resources, track deliveries, get notifications |
| **NGO** | Register, upload verification documents, post requests, confirm received items, edit public contact details and services |
| **Admin** | Review NGO documents, approve / reject (with a reason) / suspend NGOs, see platform totals and a chart |

---

## 3. Features, in simple words

### Accounts and login
Users register and log in. Login is stored in a secure cookie that JavaScript on the page cannot read.

### NGO verification
1. A new NGO starts as **PENDING**.
2. It uploads documents (PDF or PNG, max 5 MB).
3. The admin reads them. A rejection **must** have a reason.
4. A rejected NGO sees the reason, fixes things, and resubmits.
5. Once **APPROVED**, the NGO appears publicly. The admin can also **suspend** it later.
6. Every step is saved in a review history.

Documents are private. Only the admin can open them, through a protected link.

### Requests, donations and transfers
- NGOs post what they need (a request).
- Donors donate to a request, which creates a **transfer**.
- A transfer moves through steps, for example: donated, in transit, received. It can also be cancelled.
- Every step is saved as a **timeline** that both sides can see.

### Notifications
- A bell icon shows an unread count, and refreshes by itself every 30 seconds.
- Notifications are sent for NGO approval, rejection and suspension, new donations, and every transfer step.
- Each person can only see and change their own notifications.

### Dashboards
- **NGO:** open requests, transfers by status, fulfilment rate.
- **Donor:** my donations, completed deliveries.
- **Admin:** pending NGOs, platform totals, and a chart of transfers over time.

### Public contact details
Each NGO can add a public email, phone, WhatsApp, website and social links. These are **separate from the login email**. Visitors only see them for **APPROVED** NGOs. An NGO can choose to show its full street address or only its city and state.

### Urgent Help Finder (`/urgent-help`)
Anyone can open this page without logging in:
1. Pick the kind of help needed (food, healthcare, shelter, and so on).
2. Enter a state (a strict filter) and optionally a city (NGOs in that city are shown first).
3. Optionally tick "Emergency available only".
4. See matching approved NGOs with large **Call** and **WhatsApp** buttons.

The page starts with a notice to call the local emergency number (112 in India) first in a life-threatening emergency.

NGOs choose their services, emergency availability and 24/7 availability in their dashboard (see the walkthrough below).

---

## 4. How it works (the big picture)

```
Browser (React app, port 5173)
        |
        |  /api/... requests (Vite forwards them)
        v
Server (Node + Express)
   routes -> validators -> services -> database
        |
        v
PostgreSQL (through Prisma)
```

- **Routes** receive requests and check who is logged in and what role they have.
- **Validators** (Zod) check and clean every input. Text is trimmed and URLs must start with `http://` or `https://`.
- **Services** hold the real logic, such as "change a transfer status".
- **Mappers** decide which fields are safe to send back. Passwords, registration numbers and file storage keys are never sent to the public.
- **Prisma** talks to PostgreSQL.

Whenever a transfer changes status, the history row and the notifications are saved **in the same database transaction**. Either everything is saved or nothing is.

---

## 5. Tech used

- **Frontend:** React, Vite, Recharts (charts)
- **Backend:** Node.js, Express, Zod (validation), Helmet (security headers), rate limiting
- **Database:** PostgreSQL with Prisma
- **Tests:** Vitest (112 tests at the last run)

---

## 6. Folder guide

> The names below match how the project has been built. If a file has moved, search for its name.

```
ngoconnect-ai/
├── client/                 React app
│   └── src/pages/          Screens (home, NGO directory, urgent help, dashboards, ...)
├── server/
│   ├── prisma/schema.prisma   Database tables
│   ├── src/
│   │   ├── routes/         API endpoints
│   │   ├── validators/     Input checks (Zod)
│   │   ├── services/       Business logic
│   │   ├── mappers/        What is safe to return
│   │   └── seed.js         Demo data
│   └── tests/              Automated tests
├── SECURITY.md             Security review notes
└── README.md               This file
```

---

## 7. Setup (first time)

You need **Node.js** and **PostgreSQL** installed and running.

1. **Install packages**
   ```
   cd server
   npm install
   cd ../client
   npm install
   ```

2. **Create the environment file**
   Copy `server/.env.example` to `server/.env` and fill in your values. The important ones are:

   | Variable | What it is |
   |----------|------------|
   | `DATABASE_URL` | Connection to your **demo** database |
   | `DATABASE_URL_TEST` | Connection to a **separate test** database |
   | `PORT` | Port the server runs on |

   The other secrets (such as the login token secret) are listed in `.env.example`. Never commit `.env`.

3. **Create the tables and demo data**
   ```
   cd server
   npx prisma db push
   npm run prisma:seed
   ```

4. **Start both apps** (two terminals)
   ```
   cd server
   npm run dev
   ```
   ```
   cd client
   npm run dev
   ```

5. Open **http://localhost:5173**.

> The `PORT` in `server/.env` must match the proxy target in `client/vite.config.js`. If they differ, login shows errors.

---

## 8. Demo accounts (local demo only)

After seeding, the password for all of these is `password123`.

| Role | Email |
|------|-------|
| Admin | `admin@ngoconnect.org` |
| Approved NGO | `hope@relief.org` |
| Pending NGO | `sunshine@animals.org` |
| Donor | `donor@example.com` |

The seed also creates other approved NGOs in Delhi, Patna and Mumbai so the Urgent Help filters have something to show. Check `server/src/seed.js` for the full list.

---

## 9. Demo walkthrough (5 minutes)

**Part 1: As a visitor**
1. Open **Approved Non-Profits**. Approved NGOs show contact details. The pending NGO is not listed.
2. Open **Need help urgently?**. Choose state `Delhi`, add the city `New Delhi`, and tick "Emergency available only". Click **Call** or **WhatsApp** on a result.

**Part 2: As an NGO**
1. Log in as `hope@relief.org`.
2. Open **NGO Hub**, then the **Contact Details & Profile** tab.
3. Change the services you offer, turn **24/7 availability** on or off, and press **Save**.
4. Log out and open `/urgent-help` to see the change.

**Part 3: As a donor and admin**
1. Log in as `donor@example.com` and donate to an NGO request.
2. Log in as the NGO and check the bell icon, then confirm the delivery.
3. Open the transfer **timeline** to see every step.
4. Log in as `admin@ngoconnect.org`, review the pending NGO's documents, try rejecting without a reason (it is blocked), then approve.
5. Open the admin dashboard to see the totals and the chart.

---

## 10. Security, in simple words

- Passwords are never stored as plain text or sent back.
- Login cookies cannot be read by page scripts.
- Every write action checks **who you are** (role) and **whether it is yours** (ownership).
- NGO documents can only be opened by the admin through a protected link, and never as public files.
- Public pages only show APPROVED NGOs. Login emails and registration numbers are never public.
- Inputs are trimmed and validated. Dangerous links such as `javascript:` are rejected.
- Lists are capped (for example, the Urgent Help page returns at most 20 results per page).
- Public search has a rate limit.

See `SECURITY.md` for the full review.

---

## 11. Running the tests

```
cd server
npm test
```

Tests use the **separate test database** (`DATABASE_URL_TEST`), which is reset before each run, so your demo data is not affected.

---

## 12. Common problems

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Login shows an error and the client terminal says `ECONNREFUSED` | Backend is not running, or the ports don't match | Start the server and check `PORT` against `client/vite.config.js` |
| Server crashes at start | PostgreSQL is not running | Start PostgreSQL, then run `npm run dev` again |
| "table does not exist" | Tables not created | `npx prisma db push` |
| Login says invalid email or password after a reset | Demo data is missing | `npm run prisma:seed` |
| Tests fail with a database error | Test database does not exist | Create the `ngoconnect_ai_test` database |

---

## 13. What could come next

- AI Donation Scanner (describe or photograph items to auto-fill a donation)
- Proof of delivery and impact certificates
- Plans and subscriptions
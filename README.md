# FranchiseOps — Franchise Analytics & Management System

A full-stack analytics and management platform for a multi-outlet franchise
chain ("Kaffeine Central", 8 outlets across 6 Indian cities), built as a
final-year / internship project. It covers landing, login and registration,
and eight dedicated dashboards — **Executive, Outlets, Inventory, Staff,
Marketing, Sales, Audit, and Notifications/Alerts** — all backed by a real
database and a live WebSocket feed.

## What's real here, and what's simulated

Everything in this project is a genuine, working system — there is no hardcoded
UI data and no dead buttons. What's worth being upfront about, in the spirit
of an honest project report:

- **Products, sales, and feedback use the supplied datasets.** The seed imports
  `indian_retail_sales_kaggle.csv` and `customer_feedback_sentiment.csv` from
  `backend/data/supplied/` into SQLite. These files contain Indian outlet-level
  transactions, product/category data, footfall, payment method, customer
  ratings, customer segments, and review text.
- **The operating model is demo data, not production data.** Staff, campaigns,
  audits, violations, and notifications are generated as structured records
  because there's no live HR, marketing, or compliance system connected here.
  Every number on screen is still computed from database rows by real SQL
  queries, not invented in the frontend.
- **"Real-time" is a live WebSocket feed, not a live POS integration.**
  `backend/realtime.js` writes a new sale or alert to the database every few
  seconds and pushes it to every connected browser over Socket.IO the instant
  it's written — so the UI genuinely updates without a refresh, exactly as it
  would against a real feed. Swapping the interval-based generator for a real
  POS/ERP webhook later requires no frontend changes, because the frontend
  already just reacts to socket events.
- **Every module is queryable and every button does something real.**
  Acknowledge/Resolve on the Notifications page are real POST requests that
  update the database and broadcast the change. Filters (outlet, date range)
  re-query the API. There are no placeholder "coming soon" screens.

## Architecture

```
franchise-analytics/
├── backend/     Express API + SQLite + Socket.IO realtime engine
└── frontend/    React (Vite) + Tailwind + Recharts dashboards
```

**Data flow:** SQLite (`better-sqlite3`) → Express REST routes aggregate KPIs
per module → React fetches on load and re-fetches when a relevant socket
event fires → Recharts renders trend lines, bars, funnels and pies from that
same response. One schema, one source of truth, shared by every dashboard.

### Backend (`/backend`)
- **Express** REST API, one route file per module (`routes/outlets.js`,
  `inventory.js`, `staff.js`, `marketing.js`, `sales.js`, `audit.js`,
  `notifications.js`, `executive.js`)
- **SQLite** via `better-sqlite3` — zero setup, file-based, see `db.js` for
  the full schema (outlets, products, inventory, staff, sales, campaigns,
  audits, violations, corrective_actions, notifications, users)
- **JWT auth** (`bcryptjs` + `jsonwebtoken`) — register/login/me
- **Socket.IO** realtime engine (`realtime.js`) — see above
- **Executive/Franchise Intelligence Engine** (`routes/executive.js`) — a
  weighted health score per outlet (30% sales, 20% operations, 15% audit,
  15% customer rating, 10% margin, 10% inventory health), rule-based risk
  detection (revenue decline, stockouts, open compliance violations,
  attendance gaps), a simple weekend-demand opportunity detector, and a
  recommendation generated from the highest-probability risk

### Frontend (`/frontend`)
- **React 18 + Vite + React Router**
- **Tailwind CSS** with a custom design system — ink-navy sidebar, warm
  paper canvas, teal/ochre accents, Newsreader (serif) for headlines and
  numbers + IBM Plex Sans for UI text — deliberately not the default
  generic-SaaS look
- **Recharts** for all charts (line/area trend, bar, pie, horizontal bar)
- **Socket.IO client** — `SocketContext` + a `useSocketEvent` hook so any
  page can subscribe to `sale:new` / `notification:new` / `notification:updated`
  and refresh in place
- **Axios** with a JWT interceptor and automatic redirect-to-login on 401

## Setup

Requires Node.js 18+.

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
npm run seed      # creates franchiseops.db and populates demo data
npm run dev        # or: npm start
```

The API runs on `http://localhost:5000`. Health check: `GET /api/health`.

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

### Demo login

```
manager@kaffeinecentral.com   /  Demo@1234
regional@kaffeinecentral.com  /  Demo@1234
owner@kaffeinecentral.com     /  Demo@1234
```

Or register a new account from the app — registration is fully functional
and creates a real user row.

## Re-seeding

`npm run seed` in `/backend` wipes and rebuilds all tables, re-importing the
supplied retail and feedback CSVs each time. The archive's included generator
script is retained under `backend/data/supplied/` for provenance, but is not run
automatically by the application.

## Known simplifications (worth noting in a project report / viva)

- New users registered through the app aren't yet scoped to a single
  outlet — every account currently sees the full network. Adding an
  `outlet_id` selector at registration and filtering dashboard queries by it
  is the natural next step for role-based access.
- The Socket.IO realtime engine is a self-contained simulator (see above) —
  there's no real POS/HR/marketing API to connect to here, but the plumbing
  (DB write → socket emit → frontend listener) is exactly what a real
  integration would use.
- No production deployment config (Docker, process manager, HTTPS) is
  included — this is set up for local development and demoing.

## Tech stack summary

| Layer      | Choice                                              |
|------------|------------------------------------------------------|
| Database   | SQLite (better-sqlite3)                              |
| Backend    | Node.js, Express, Socket.IO, JWT, bcrypt             |
| Frontend   | React 18, Vite, React Router, Tailwind CSS, Recharts |
| Realtime   | WebSockets via Socket.IO                             |

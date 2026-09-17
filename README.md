# FranchiseOps — Franchise Analytics & Management System

An analytics and management platform for a multi-outlet franchise chain
(9 outlets across Indian cities). It includes a landing page, login and
registration, and separate dashboards for Outlets, Inventory, Staff,
Marketing, Sales, Audit, and Notifications/Alerts — plus an Executive
dashboard that summarizes all of them together.

The project uses real transaction and customer review data, and updates
live as new sales and alerts come in, without needing to refresh the page.

## Setup

You need Node.js installed (version 18 or higher). Check with:
```
node -v
```

### 1. Backend

Open a terminal in the `backend` folder and run:
```
npm install
cp .env.example .env
npm run seed:real
npm run dev
```

This starts the backend on `http://localhost:5000`. Leave this terminal running.

### 2. Frontend

Open a **second** terminal in the `frontend` folder and run:
```
npm install
cp .env.example .env
npm run dev
```

This starts the app on `http://localhost:5173`. Leave this terminal running too.

## Running the App

Open `http://localhost:5173` in your browser.

**Demo login:**
```
Email: manager@kaffeinecentral.com
Password: Demo@1234
```

Or click "Create an account" to register a new one.

## Notes

- Both terminals (backend and frontend) need to stay running at the same time.
- On Windows, use `copy .env.example .env` instead of `cp .env.example .env`.
- If you want to reset the data back to its original state at any time, run
  `npm run seed:real` again from the backend folder.

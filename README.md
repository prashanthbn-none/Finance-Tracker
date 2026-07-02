# RupeeFlow Finance Tracker

RupeeFlow is an INR-first personal finance web app built with React and Vite. It helps users manage income, expenses, budgets, savings goals, recurring transactions, reports, and imported bank-statement transactions.

## Features

- Local registration, login, profile, and email OTP password recovery
- Cumulative overall balance with separate monthly income and expense summaries
- Income and expense add, edit, delete, search, filter, and custom categories
- PDF/CSV bank-statement import with India-focused categorization
- Duplicate transaction prevention
- Monthly budgets and overspending alerts
- Savings goals and contributions
- Recurring salary, rent, bill, and subscription transactions
- Reports with charts and CSV/Excel/PDF export
- 30-day cash-flow forecast and reminders
- INR-only display, responsive layout, and light/dark/system themes
- JSON backup and restore

## Technology

- React 19
- Vite
- React Router
- React Context
- IndexedDB
- PDF.js
- Recharts
- Node.js and Nodemailer for OTP email delivery

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

Production checks:

```bash
npm run lint
npm run build
```

## Project structure

```text
finance-tracker/
  server/                 OTP email service
  src/
    components/           Shared UI and application shell
    hooks/                Reusable React hooks
    lib/                  Finance logic, storage, imports, and exports
    pages/                Route-level screens
    store/                Authentication, finance data, and settings contexts
    styles/               Global design system
    App.jsx               Routes and providers
    main.jsx              Application entry point
```

## Data and security

Finance records are stored per user in browser IndexedDB. Account/session data is local to the browser. OTP email delivery uses a small Node.js service and SMTP credentials from a private environment file. SMTP secrets must never be committed.

This project is suitable for academic demonstration and personal local use. Production deployment would require server-side authentication, authorization, managed storage, HTTPS, and stronger operational security.

## Bank-statement limitation

RupeeFlow supports selectable-text statements matching known layouts. Scanned PDFs require OCR, and universal compatibility with every Indian bank format is not guaranteed.

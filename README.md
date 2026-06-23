# Ledger — Personal Finance Tracker

A web-based personal finance tracker built with React + Vite. Manage income,
expenses, budgets, savings goals, and recurring transactions, with reports and
analytics. Data is stored locally in the browser, behind a storage abstraction
designed so a real backend (e.g. Firebase) can be added later without rewriting
feature code.

## Features

- **Authentication** — register, login/logout, password reset, profile (local only)
- **Dark mode** — light / dark / follow-system, with no flash on load
- **Dashboard** — balance, monthly income/expense/savings, income-vs-expense trend chart, category breakdown, budget status, recent activity
- **Income & expense management** — add / edit / delete, categorized, with notes
- **Transaction history** — search; filter by type, category, date range, and amount; sort; bulk select & delete; CSV/Excel export
- **Budgets** — monthly per-category limits with color-coded progress, remaining amounts, and over-budget warnings
- **Savings goals** — target amount + date, circular progress rings, contributions, completion badges
- **Reports & analytics** — bar (income vs expense), line (net trend), and pie (category) charts over 3/6/12 months; CSV/Excel export; print-to-PDF
- **Recurring transactions** — salary, rent, subscriptions; auto-materialized when due
- **Notifications** — budget alerts, bill reminders, goal milestones (in-app bell)
- **Settings** — theme, display currency (applied app-wide), data export, JSON backup & restore
- **Responsive** — works on mobile/tablet with a hamburger drawer

## Run it

```bash
npm install
npm run dev      # start dev server (usually http://localhost:5173)
npm run build    # production build into dist/
npm run preview  # serve the production build
```

## Project structure

```
src/
  store/        React context providers
    AuthContext.jsx     accounts + session
    DataContext.jsx     loads collections, exposes CRUD
    SettingsContext.jsx theme + display currency
  hooks/
    useMoney.js         currency-aware money formatter
  lib/
    storage.js          storage adapter (the backend-swap point)
    domain.js           categories, colors, currency + date helpers
    recurring.js        recurring-rule -> transactions materialization
    selectors.js        pure derived-data calculations (totals, trends, alerts)
    export.js           CSV / Excel / print-to-PDF helpers (no dependencies)
  pages/          one file per screen
  components/      AppShell (nav/layout), icons, shared UI
  styles/global.css  design tokens + light & dark themes
```

## Moving to a backend later (Firebase, Supabase, etc.)

All persistence goes through a `StorageAdapter` (see `src/lib/storage.js`).
Today `createStorage()` returns a `LocalStorageAdapter`. To use a server,
implement an adapter with the same async methods and return it from
`createStorage()` — no page or context code needs to change.

### Firebase sketch

1. Create a Firebase project, enable Firestore and (optionally) Google sign-in.
2. `npm install firebase`, add your config to a new `src/lib/firebase.js`.
3. Write a `FirestoreAdapter` implementing the same methods as
   `LocalStorageAdapter`, reading/writing per-user collections.
4. Return it from `createStorage()`.
5. For Google login, swap the local auth in `AuthContext.jsx` for Firebase Auth's
   `signInWithPopup(GoogleAuthProvider)`.

These steps need your own Firebase account and API keys, which is why they aren't
pre-wired.

## Security note

This is a front-end-only demo. Accounts and password hashes live in the
browser's localStorage, which is **not secure** — it's a stand-in for real auth.
A production build must move authentication server-side and hash passwords with
bcrypt or argon2. The code is structured to make that swap clean.

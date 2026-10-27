# My Life Manager

A personal finance web app: income, expenses, lending and borrowing, cash/bank/mobile-banking accounts and transfers, with a dashboard.
Ibadat (worship) and Task management are reserved as future modules and do not touch the ledger.

**Stack:** Next.js 15 (App Router, JavaScript), Tailwind CSS 4, MongoDB + Mongoose, Firebase Authentication (Google only) with Firebase Admin session cookies, Zod, React Hook Form, Recharts, Sonner, Lucide.

## 1. Setup

### Firebase
1. Create a project at console.firebase.google.com and add a **Web app**. Copy its config into the `NEXT_PUBLIC_FIREBASE_*` variables.
2. **Authentication → Sign-in method:** enable **Google** only.
3. **Authentication → Settings → Authorized domains:** add `localhost` and your production domain.
4. **Project settings → Service accounts → Generate new private key.** Put `project_id`, `client_email` and `private_key` into the `FIREBASE_ADMIN_*` variables. Never commit this file or expose it as `NEXT_PUBLIC_*`.

### MongoDB (a replica set is required)
Ledger writes use multi-document transactions, so a standalone server will not work. The app checks this on first connect and refuses to start otherwise.
- **Production:** MongoDB Atlas (any tier is a replica set).
- **Local:** `mongod --replSet rs0 --dbpath ./data`, then once: `mongosh --eval "rs.initiate()"`. Use `MONGODB_URI=mongodb://localhost:27017/mylifemanager?replicaSet=rs0`.

### Run
```bash
cp .env.example .env.local     # fill in the values
npm install
npm run dev                    # http://localhost:3000
```

## 1b. How the app fetches data
- **Every page is a server component.** It reads the URL, loads its data from MongoDB on the server, and sends ready-to-render data to the browser. There are no client-side `fetch` calls on page load.
- **Filters live in the URL** (`?from=…&categoryId=…&page=2`). Changing a filter is exactly one server render. Typing in search is debounced, identical URLs are skipped, and the previous results stay on screen (dimmed, with a progress bar) until the new ones arrive.
- **Tabs that don't need new data make no request.** The Accounts page loads all accounts once, and switching between Cash, Bank and Mobile banking is instant.
- **Saving, editing or deleting** calls the API once and then refreshes the server data once.
- Set `NEXT_PUBLIC_SITE_URL` to your real domain **before building**. It is used for canonical links, Open Graph previews, `robots.txt` and the sitemap.

## 2. Scripts
| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Develop, production build, serve |
| `npm run lint` | ESLint (Next.js core-web-vitals) |
| `npm test` | Vitest: ledger and service tests, API security, sidebar, route protection |

Database tests start a temporary replica set with `mongodb-memory-server`, which downloads a MongoDB binary on first run. If downloads are blocked, point it at an installed `mongod`: `MONGOMS_SYSTEM_BINARY=/path/to/mongod MONGOMS_VERSION=<its version> npm test`.

## 3. Authentication and security
- The browser signs in with Google and sends the Firebase ID token to `POST /api/auth/session`. The server verifies it (revocation checked), requires `google.com` as the provider and a sign-in within the last 5 minutes, then sets a 5-day `__session` cookie that is HTTP-only, `SameSite=Lax` and `Secure` in production.
- `middleware.js` only redirects when the cookie is missing. Real verification (`verifySessionCookie(..., checkRevoked)`) runs in the dashboard layout and in **every** API handler through `route()` in `lib/api.js`.
- The user id always comes from the verified session, never from the request. Every query is filtered by it. Another user's record is reported as "not found".
- Sign out revokes the user's refresh tokens, which ends sessions on all devices.
- Inputs are validated with Zod (`.strict()` bodies, whitelisted filters, pagination capped at 100). Search text is escaped, never used as a raw regex or query operator. CSV export neutralizes spreadsheet formulas. Errors return generic messages with no stack traces or secrets.
- Account numbers are stored but only a masked form (`••••1234`) is ever returned.
- Security headers are set in `next.config.mjs`. Add a Content-Security-Policy once the production domain is final (Firebase sign-in popups need `accounts.google.com` and `*.firebaseapp.com`).

## 4. Accounting rules
- Money is stored as **integer poisha** (1 BDT = 100). Currency is BDT. Dates are stored in UTC and shown in `Asia/Dhaka`; a "date" is the start of that Dhaka day.
- **The ledger is the source of truth.** `balance = opening balance + sum of all ledger entries`. Entries are append-only. A correction adds a reversing entry and, for edits, a new entry, so history always explains the balance.
- **Income** = +entry, **expense** = −entry. **Transfer** = one operation with two entries (−X, +X), never income or expense.
- **Lending** = −entry plus a loan; collecting = +entry. **Borrowing** = +entry plus a loan; repaying = −entry. None of these are income or expense. Repayments cannot exceed the outstanding amount. Loan status is derived (Outstanding, Partially repaid, Repaid). A loan is overdue when its due date has passed and it is not repaid.
- **Edits** reverse the old entry and post a new one. **Deletes** are soft: a reversal is written and the record is kept.
- **Negative balances** are rejected inside the transaction unless the account allows them, including when a delete or edit would cause one.
- **Concurrency:** each posting bumps a version on the account (and on a loan for repayments), so simultaneous postings conflict and retry instead of racing past a balance check.
- **Idempotency:** create requests carry an `idempotencyKey` with a unique index. Replays return the original result.
- **Accounts** are never deleted, only archived, and only at a zero balance. Opening balance and date lock once the account has transactions.
- **Dashboard:** income and expenses count only income/expense operations in the selected period. Net worth = active account balances + money owed to you − money you owe. Transfers and loan activity never change net worth or income/expense totals (covered by `tests/dashboard.test.js`).
- Every important change writes an `AuditLog` row in the same transaction.

## 5. Data model
`Account`, `Operation` (one logical event), `LedgerEntry` (signed effect on one account), `Category`, `Loan`, `Repayment`, `AuditLog`. All carry `userId`. Indexes follow the actual query patterns (user + kind + date, user + account + date, and so on).

## 6. API
All routes require a session. Responses are JSON; errors look like `{ "error": { "code", "message", "details?" } }`.
`/api/accounts` (GET, POST) · `/api/accounts/[id]` (GET with history, PATCH) · `/api/categories` · `/api/transactions` (GET, POST) · `/api/transactions/[id]` (GET, PATCH, DELETE) · `/api/transactions/totals` · `/api/transactions/export` (CSV) · `/api/loans` · `/api/loans/[id]` · `/api/loans/[id]/repayments` · `/api/transfers` (GET, POST) · `/api/transfers/[id]` (DELETE) · `/api/dashboard` · `/api/reports/cash-flow` · `/api/reports/account-balances`

## 7. Deploying to Vercel
1. Push the repo and import it in Vercel (framework: Next.js).
2. Add all variables from `.env.example`. For `FIREBASE_ADMIN_PRIVATE_KEY` paste the key with literal `\n` sequences, wrapped in quotes.
3. In Atlas, allow Vercel to connect (Network Access). Vercel functions have no fixed IPs, so use `0.0.0.0/0` with a strong database user, or the Atlas Vercel integration. Put the cluster near your Vercel region.
4. Add the Vercel domain to Firebase **Authorized domains**.
5. Deploy, then sign in and add an account to confirm the session cookie and database transactions work.

## 8. Known limitations
- Settings are read-only for now (currency, time zone, week start `WEEK_START` in `lib/dates.js`).
- English labels are shown with Bengali beside the menu items. There is no language switch and no dark theme yet.
- Filter changes re-run all of a page's queries on the server (list, totals, accounts, categories). If that ever becomes slow, cache the totals and reference lists per user.
- Loans cannot be cancelled and repayments cannot be undone, and there is no UI for editing a loan's phone, due date or notes (the API supports the edit).
- Category rename/archive has no UI.
- Single currency, no interest on loans, no recurring transactions.
- Not covered by automated tests: the real Google popup flow and visual/responsive layout. Check these manually.

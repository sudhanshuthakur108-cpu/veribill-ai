# Architecture

This document records how VeriBill AI is put together and the constraints later features should respect.
It describes the current foundation and the intended direction; anything marked _planned_ does not exist yet.

## Overview

```
Browser ──► Vite dev server ──/api/*──► Express API
            (client/)                    (server/)
```

The repository is an npm workspace with two packages:

- `client` (`@veribill/client`): a React single-page app built with Vite.
- `server` (`@veribill/server`): an Express 5 REST API written as native ES modules.

Shared tooling (ESLint, the combined `dev` script) lives at the root. Each package owns its own runtime
dependencies and test runner.

## Request flow

The client calls the API with relative URLs such as `/api/health`. In development, Vite proxies `/api` to the
API (`API_PROXY_TARGET`, default `http://localhost:4000`). This keeps the client free of hard-coded hosts,
avoids CORS during development and means no backend address ends up in the bundle.

How the built client is served in production (from Express, or from a static host in front of the API) is
still open and will be decided alongside deployment.

## Server

- `src/app.js` builds and returns the Express app without listening. Tests mount it on a random port;
  `src/index.js` is the only place that binds a real port and handles shutdown signals.
- `src/config.js` is the single place that reads `process.env`. It validates values and fails fast on bad
  input instead of letting a typo surface later as a confusing runtime error.
- `src/db.js` connects Mongoose and waits for the models' indexes (unique email, session expiry) before
  `src/index.js` starts listening. If MongoDB is unreachable the process exits with a clear message.
- Routes live in `src/routes/` and are mounted under `/api/<resource>`. Models live in `src/models/`.
- Middleware order in `src/app.js` matters: the origin check runs first, then body and cookie parsing, then
  `/api/health`, then session loading for every other `/api` route. Keeping health ahead of session loading
  means it still answers when the database is down.
- `src/middleware/errors.js` turns unknown routes into JSON 404s and errors into JSON responses. 5xx
  responses never include the original error message, because internal errors can contain hostnames,
  queries or file paths.

### Error format

```json
{ "error": { "message": "Human-readable explanation", "fields": { "email": "Enter a valid email address." } } }
```

`fields` appears only on validation errors. Endpoints throw `HttpError(status, message, fields)` from
`src/httpError.js` for client errors; anything else is treated as a 500. Express 5 forwards rejected promises
from async handlers automatically.

## Authentication

### Sessions

Sessions are stored server-side in the `sessions` collection rather than in a signed or encrypted cookie, so
signing out (or deleting a session) takes effect immediately.

1. On register or sign-in the server generates a 256-bit random token and stores `sha256(token)` as the
   session `_id`, together with the user id, a separate random CSRF token and `expiresAt`.
2. The raw token goes to the browser in the `vb_session` cookie: `HttpOnly`, `SameSite=Strict`,
   `Path=/api`, `Max-Age` equal to the session lifetime, and `Secure` when `NODE_ENV=production`.
3. `loadSession` hashes the cookie value and looks up an unexpired session, attaching `req.user` and
   `req.authSession`. `requireAuth` turns a missing session into `401`.
4. Signing in again replaces the previous session. Signing out deletes it.
5. A TTL index removes expired sessions; lookups also check `expiresAt` because the TTL monitor runs only
   about once a minute.

Hashing the token means a copy of the database does not contain usable session ids. No server secret is
needed because nothing is signed.

The custom store is small on purpose. `express-session` with `connect-mongo` would also work, but it stores
raw session ids and needs a signing secret, and the extra moving parts did not buy anything here.

### Passwords

argon2id via the `argon2` package with its defaults (64 MiB memory, 3 iterations, parallelism 4), which is
above the OWASP minimum. Passwords must be 12–128 characters, with no composition rules, following current
NIST guidance, and are normalized to Unicode NFKC before hashing and verifying so the same password typed on
different keyboards or operating systems matches. When an email is unknown, the login handler still verifies
the password against a throwaway hash so both failure paths take similar time and return the same `401`
message.

### CSRF

The API only parses JSON bodies (which an HTML form cannot send), and the session cookie is
`SameSite=Strict`. On top of that:

- `verifyOrigin` rejects unsafe methods (anything but GET/HEAD/OPTIONS) unless `Sec-Fetch-Site` is
  `same-origin`/`none`, the `Origin` is listed in `TRUSTED_ORIGINS`, or neither header is present (a
  non-browser client, which cannot carry a victim's cookies). This also protects sign-in and registration,
  which have no session yet.
- Requests that act on an existing session (currently sign-out) must send the session's CSRF token in
  `X-CSRF-Token`; it is compared in constant time. The token is returned by register, login and `/me`, and
  the client keeps it in React state only.

Future state-changing routes should use `requireAuth` followed by `requireCsrfToken`.

### Rate limiting

`express-rate-limit` with its in-memory store: 10 wrong-password responses (`401`) per IP per 15 minutes, and
10 registrations per IP per hour. Validation errors and server errors do not count towards the sign-in limit,
so a database outage cannot lock users out once it is over. `trust proxy` is off, so `X-Forwarded-For` is
ignored and cannot be used to dodge the limit.

### Known limits

- **Rate limits are per process and reset on restart.** A multi-instance deployment needs a shared store.
  Behind a reverse proxy, Express's `trust proxy` must be configured or every user shares the proxy's IP and
  one attacker could exhaust the sign-in limit for everyone.
- **Registration reveals whether an email is registered** (`409`). Avoiding that properly needs email
  verification, which is out of scope for now. The endpoint is rate limited.
- Sessions have an absolute lifetime only (no idle timeout), and there is no "sign out everywhere",
  password change or password reset yet.
- Limits are per IP only, so a slow guessing attack spread over many IPs against one account is not throttled.
  Per-account throttling (without letting attackers lock real users out) should be added before real use.
- Passwords are not checked against breached-password lists.
- The cookie design assumes the client and API are served from the same origin.

## Document records

Purchase orders and supplier invoices are stored as metadata the user types in: numbers, supplier, dates,
currency, status and notes. There are no amounts, files or matching results yet.

### Models

`PurchaseOrder` and `Invoice` (in `server/src/models/`) both store `createdBy` (the owning user, immutable)
and Mongoose timestamps. A `pre('validate')` hook derives lowercase lookup keys (`poNumberKey`,
`invoiceNumberKey`, `supplierKey`) from the displayed values with `lookupKey()` in
`src/documents/normalize.js`, so keys and values cannot drift apart.

The keys ignore case and runs of whitespace but keep punctuation and legal suffixes. Merging "ABC Traders"
with "ABC Traders Pvt Ltd", or "PO-1" with "PO1", could wrongly treat two different suppliers or documents
as one.

| Index | Purpose |
| --- | --- |
| `{ createdBy, poNumberKey }`, unique | A buyer issues each PO number once |
| `{ createdBy, supplierKey, invoiceNumberKey }`, unique | Invoice numbers are unique per supplier, since two suppliers can both send "INV-001" |
| `{ createdBy, createdAt: -1, _id: -1 }` | Default listing order |
| `{ createdBy, status, createdAt: -1, _id: -1 }` | Status filter with the same order |

`connectDatabase()` waits for these indexes before the API starts. Duplicate detection relies on the unique
indexes (a `11000` error becomes `409`), so it also holds when two requests race.

### Request handling

`src/routes/purchaseOrders.js` and `src/routes/invoices.js` apply `requireAuth` and `noStore` to every route,
and `requireCsrfToken` to `POST`. The shared pieces live in `src/documents/`:

- `validation.js` reads only the accepted fields from the body and rejects non-string values, so objects
  such as `{ "$ne": null }` never reach a query. `createdBy` always comes from the session.
  - Document numbers and supplier names go through `cleanText` (NFKC, trim, collapse whitespace). Notes are
    only trimmed, so their line breaks survive.
  - Dates are parsed strictly, and currencies are checked against `Intl.supportedValuesOf('currency')`.
  - Supplier names are rejected if they contain control characters or text-direction embedding, override or
    isolate controls (U+202A–U+202E, U+2066–U+2069), or consist only of format characters (`\p{Cf}`) and
    whitespace. Format characters inside a real name, such as the ZWJ/ZWNJ that shape many Indic scripts,
    are kept.
- `queries.js` parses list parameters, rejecting repeated values, out-of-range numbers and unknown statuses
  or sorts. Express 5's default query parser does not build nested objects, so `?status[$ne]=x` arrives as an
  unrelated key and is ignored.
  - Search text is cleaned like supplier names, then rejected with `400` if it still contains control
    characters. The MongoDB driver refuses a NUL byte in a regular expression, so without this check it
    caused a `500`.
  - Search escapes regular-expression characters and matches a literal substring of the lookup keys.
  - Every query is filtered by `createdBy`, limited to 100 results and capped at 5 seconds with `maxTimeMS`.
  - Detail lookups check the id format first (`400` when malformed), then query by id **and** owner, so
    another user's record gets the same `404` as a missing one.

New invoices may only be `draft` or `pending_review`. The other statuses describe matching and approval
outcomes, and allowing them by hand would show results that no process has produced.

### Known limits

- Search is an unanchored regular expression, so it scans the user's records rather than using an index.
  That is fine at portfolio scale; full-text or prefix search would be needed for large datasets.
- Offset pagination is capped at page 10,000. Very deep pages would need cursor-based pagination.
- Records cannot be edited or deleted yet, and there is no audit history.
- Creating records is not rate limited.

## Client

- `src/api/` holds functions that call the backend and translate HTTP failures into readable errors
  (`ApiError` carries the status and any field errors). Components never call `fetch` directly.
- `src/auth/AuthProvider.jsx` asks `/api/auth/me` who is signed in when the app loads and exposes
  `signIn`, `signUp`, `signOut`, `retry` and `sessionExpired` through `useAuth()`. It mirrors the server's
  answer; nothing about the session is stored in `localStorage` or `sessionStorage`.
- Routing uses React Router. `RequireAuth` wraps pages that need a session (redirecting to `/login` and
  remembering the requested path); `RequireGuest` wraps the sign-in and registration pages. A failed session
  check shows a retry state instead of pretending the user is signed out.
- `src/hooks/` holds stateful logic, keeping components presentational:
  - `useApiResource(load)` runs a memoized loader, aborts outdated requests, ignores responses for anything
    but the latest request, exposes `loading`/`error`/`ready` plus `retry`, and calls `sessionExpired()` on a
    `401` so the route guard sends the user back to sign in.
  - `useForm` handles values, client checks, server field errors and pending state. A ref blocks a second
    submission before React has re-rendered the disabled button.
  - `useApiHealth` checks the API's health endpoint.
- Record lists keep `page`, `search` and `status` in the URL (`src/documents/useListParams.js`). Values the
  API would reject are ignored, so a hand-edited URL shows a normal list instead of an error. `ListResults`
  renders the loading, error, empty, no-match and past-the-end states the same way for both document types.
- Styling is plain CSS with custom properties defined in `src/index.css`; light and dark themes follow the
  operating system preference.
- Anything not built yet is labelled as planned in the UI. There are no buttons or links that pretend to work.

## Principles for upcoming features

These follow from the product goal and apply to all future work.

1. **Money is calculated deterministically.** Amounts, variances and tolerances will be computed by plain,
   unit-tested functions on the server. Currency values should be stored and compared as integer minor units
   (or a decimal type), never as binary floating point.
2. **Extraction may be uncertain; reconciliation is not.** Data extraction (possibly AI-assisted) will
   produce fields with a source reference and a confidence level. Missing or low-confidence fields stay empty
   and are flagged. Reconciliation runs only on the extracted values and never fills gaps itself.
3. **Every finding carries evidence.** A discrepancy records which invoice line, which PO line, the values
   compared and the rule that fired, so a reviewer can verify it without re-reading the documents.
4. **Humans approve.** Uncertain or out-of-tolerance results go to a review queue. The system does not
   approve or reject invoices on its own.
5. **AI is optional.** The app must keep working without an AI provider key. Any provider integration will
   be read from server-side environment variables only.

## Planned areas

| Area                  | Likely location                                    |
| --------------------- | -------------------------------------------------- |
| Roles (reviewer etc.) | `server/src/middleware/auth.js`, `User.role`       |
| Document upload/parse | `server/src/documents/` alongside the record logic |
| Reconciliation rules  | `server/src/reconciliation/` (pure functions)      |
| Review queue          | `server/src/routes/reviews.js` + client views      |

These are starting points, not commitments. Each will be documented here as it is built.

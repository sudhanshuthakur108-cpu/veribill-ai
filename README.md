# VeriBill AI

VeriBill AI helps businesses reconcile supplier invoices against purchase orders. The goal is to extract
document data, flag quantity, price and tax discrepancies, catch likely duplicate invoices, explain each
finding with evidence, and route uncertain cases to a human reviewer.

Financial calculations and reconciliation decisions are made by deterministic, tested code. AI is used only
where it helps (reading documents, drafting explanations) and never invents missing values or approves
anything on its own.

> **Status:** foundation plus authentication. Users can register, sign in and sign out; the dashboard is only
> available to signed-in users. Document processing, reconciliation and review are not implemented yet.

## Tech stack

| Area           | Choice                                                    |
| -------------- | --------------------------------------------------------- |
| Frontend       | React 19, React Router 8, Vite 8, plain CSS               |
| Backend        | Node.js, Express 5 (ES modules)                           |
| Database       | MongoDB with Mongoose 9                                   |
| Authentication | argon2id password hashes, server-side sessions in MongoDB |
| Tests          | Vitest + Testing Library (client), `node:test` + in-memory MongoDB (server) |
| Linting        | ESLint 10 flat config, shared across the workspace        |
| Tooling        | npm workspaces, `concurrently` for local dev              |

Everything runs locally with free, open-source software. No paid service, API key or hosted database is
required.

## Prerequisites

- **Node.js** 22.22.2+ or 24.15.0+ (the repo is developed on Node 24; see `.nvmrc`)
- **npm** 10 or newer (ships with those Node versions)
- **MongoDB** for running the app. You do not need to install it: `npm run db` starts a local MongoDB
  server for you (see below). If you already run MongoDB, point `MONGODB_URI` at it instead.

Check with:

```bash
node --version
npm --version
```

## Getting started

```bash
npm install
npm run db     # terminal 1: local MongoDB on 127.0.0.1:27017
npm run dev    # terminal 2: API and web client
```

Then open <http://localhost:5173>, create an account and you will land on the dashboard.

- API: <http://localhost:4000> (health check at <http://localhost:4000/api/health>)
- Web client: <http://localhost:5173>. If port 5173 is busy, Vite picks the next free port and prints it.

`npm run db` uses the MongoDB binary that `mongodb-memory-server` manages for the test suite. On first use it
downloads the official MongoDB archive from fastdl.mongodb.org (about 130 MB on Linux, about 820 MB on
Windows), keeps only the `mongod` binary in `~/.cache/mongodb-binaries` and deletes the archive. Data is
stored in `server/.data/mongodb`, which is git-ignored, so accounts survive restarts. If port 27017 is
already taken (for example by an installed MongoDB service), it stops with an error instead of starting
elsewhere. It is a development convenience only; a deployment needs a real MongoDB server.

If the API cannot reach MongoDB it exits with a message telling you to start the database.

The header badge and the **Backend connection** panel show whether the client can reach the API. To see the
failure state, run `npm run dev:server` and `npm run dev:client` in separate terminals, stop the API, and
press **Check again**. (`npm run dev` stops both apps together, so the API cannot be stopped on its own there.)

## Scripts

Run these from the repository root.

| Command              | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run db`         | Start a local development MongoDB with persistent data     |
| `npm run dev`        | Start the API (with file watching) and the Vite dev server |
| `npm run dev:server` | Start only the API                                         |
| `npm run dev:client` | Start only the web client                                  |
| `npm test`           | Run the client and server test suites                      |
| `npm run lint`       | Lint the whole repository                                  |
| `npm run lint:fix`   | Lint and apply safe automatic fixes                        |
| `npm run build`      | Build the client for production into `client/dist`         |
| `npm start`          | Start the API without file watching                        |

Workspace-specific scripts can be run with `--workspace`, for example
`npm run test:watch --workspace client` or `npm run preview --workspace client`.

## Environment configuration

Both apps run with sensible development defaults, so `.env` files are optional. To override a value, copy
the example file and edit the copy:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

| File          | Variable            | Default                              | Purpose                                                          |
| ------------- | ------------------- | ------------------------------------ | ---------------------------------------------------------------- |
| `server/.env` | `PORT`              | `4000`                               | Port the API listens on                                          |
| `server/.env` | `NODE_ENV`          | `development`                        | `production` enables Secure cookies and requires `MONGODB_URI`   |
| `server/.env` | `MONGODB_URI`       | `mongodb://127.0.0.1:27017/veribill` | MongoDB connection string                                        |
| `server/.env` | `SESSION_TTL_HOURS` | `8`                                  | How long a sign-in lasts (max 720)                               |
| `server/.env` | `TRUSTED_ORIGINS`   | empty                                | Extra browser origins allowed to send state-changing requests    |
| `client/.env` | `API_PROXY_TARGET`  | `http://localhost:4000`              | Where the Vite dev/preview server sends `/api`                   |

The server loads `server/.env` with Node's built-in `--env-file-if-exists` flag, so there is no `dotenv`
dependency. Invalid values stop the server at startup with a message naming the variable.

**Secrets belong on the server only.** Vite bundles every `VITE_`-prefixed variable into the browser code,
where anyone can read it. `API_PROXY_TARGET` is intentionally unprefixed so it stays inside `vite.config.js`.
Database credentials and future integrations (for example an optional AI provider key) are read by the API
from `server/.env`.

`.env` files are git-ignored; only the `.env.example` files are meant to be committed.

## How the client talks to the API

In development the browser only talks to the Vite dev server. Requests to `/api/*` are proxied to the API,
so the client uses relative URLs, there is no CORS configuration, and no backend address is compiled into
the bundle. `vite preview` uses the same proxy.

Because the page and the API share an origin, the session cookie is first-party and can use
`SameSite=Strict`. A deployment should keep that shape (one origin, with `/api` routed to the server).

## Authentication

- Passwords are Unicode-normalized (NFKC), hashed with **argon2id**, and never stored, returned or logged in
  plain text.
- Signing in creates a **server-side session** in MongoDB. The browser receives a random token in an
  `HttpOnly`, `SameSite=Strict` cookie scoped to `/api` (`Secure` in production). The database stores only a
  SHA-256 hash of that token.
- Sessions expire after `SESSION_TTL_HOURS`. Signing out deletes the session on the server, so the old cookie
  stops working immediately.
- **CSRF protection** has two layers: state-changing requests from another site are rejected using the
  `Sec-Fetch-Site`/`Origin` headers, and requests made with a session cookie must also send the session's
  CSRF token in an `X-CSRF-Token` header. The client keeps that token in memory only.
- Sign-in failures always return the same message, and unknown emails cost as much time as wrong passwords.
- Wrong-password attempts are limited to 10 per 15 minutes per IP address (validation and server errors do
  not count), and registrations to 10 per hour.
- Emails are trimmed and lowercased; a unique index on the email field prevents duplicate accounts even when
  two registrations race.

See [docs/architecture.md](docs/architecture.md#authentication) for the full design and its known limits.

## Project structure

```
veribill-ai/
├── client/                 React + Vite web app
│   ├── public/             Static files served as-is
│   └── src/
│       ├── api/            HTTP calls to the backend
│       ├── auth/           Auth state, route guards and form helpers
│       ├── components/     UI components and layouts
│       ├── hooks/          React hooks (e.g. the API health check)
│       ├── pages/          Routed pages (dashboard, sign-in, registration)
│       ├── test/           Test setup and shared helpers
│       └── utils/          Small pure helpers
├── server/                 Express API
│   ├── scripts/            Developer tooling (local MongoDB)
│   ├── src/
│   │   ├── auth/           Password hashing, sessions and input validation
│   │   ├── middleware/     Sessions, CSRF/origin checks, 404 and error handling
│   │   ├── models/         Mongoose models
│   │   ├── routes/         Route modules mounted under /api
│   │   ├── app.js          Builds the Express app (used by tests and index.js)
│   │   ├── config.js       Reads and validates environment variables
│   │   ├── db.js           MongoDB connection
│   │   └── index.js        Process entry point
│   └── test/               node:test suites
├── docs/                   Architecture and design notes
└── eslint.config.js        Lint rules for the whole repo
```

## API

All responses are JSON. Errors use `{ "error": { "message": "...", "fields": { ... } } }`, where `fields` is
present only for validation problems. Unexpected failures return `500` with a generic message; details are
logged on the server only.

| Method & path             | Auth                   | Success                         | Notable errors                     |
| ------------------------- | ---------------------- | ------------------------------- | ---------------------------------- |
| `GET /api/health`         | none                   | `200` service status            |                                    |
| `POST /api/auth/register` | none                   | `201 { user, csrfToken }` + cookie | `400` invalid fields, `409` email taken, `429` |
| `POST /api/auth/login`    | none                   | `200 { user, csrfToken }` + cookie | `400`, `401` incorrect email or password, `429` |
| `GET /api/auth/me`        | session cookie         | `200 { user, csrfToken }`       | `401`                              |
| `POST /api/auth/logout`   | cookie + `X-CSRF-Token` | `204`, cookie cleared           | `401`, `403` missing/invalid token |

Any state-changing request that a browser marks as cross-site returns `403`.

`GET /api/health` example:

```json
{
  "status": "ok",
  "service": "veribill-api",
  "version": "0.1.0",
  "uptimeSeconds": 42,
  "timestamp": "2026-10-17T07:53:50.462Z"
}
```

## Testing

```bash
npm test
```

- **Server:** `node --test` runs `server/test/**/*.test.js`. The HTTP tests start the real Express app on a
  random local port. Auth tests run against a real, throwaway MongoDB started by `mongodb-memory-server`, so
  no database needs to be running. The first run downloads the MongoDB binary (see above); later runs use the
  cache.
- **Client:** Vitest runs in a jsdom environment with Testing Library. `fetch` is stubbed per test, so the
  client tests do not need the API to be running.

npm 11 does not run dependency install scripts unless they are approved. None are needed on common setups:
`argon2` ships prebuilt binaries for Windows x64, Apple Silicon macOS and Linux (x64/ARM), and
`mongodb-memory-server` downloads MongoDB on first use instead of at install time. On other platforms (for
example Intel macOS) `argon2` must compile from source: run `npm approve-scripts argon2`, reinstall, and
make sure a C++ build toolchain is available.

## Building for production

```bash
npm run build
```

The optimized client is written to `client/dist`. Serving it in production (and deploying the API) is not
set up yet.

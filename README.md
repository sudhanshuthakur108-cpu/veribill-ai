# VeriBill AI

VeriBill AI helps businesses reconcile supplier invoices against purchase orders. The goal is to extract
document data, flag quantity, price and tax discrepancies, catch likely duplicate invoices, explain each
finding with evidence, and route uncertain cases to a human reviewer.

Financial calculations and reconciliation decisions are made by deterministic, tested code. AI is used only
where it helps (reading documents, drafting explanations) and never invents missing values or approves
anything on its own.

> **Status:** foundation. The repository currently contains the web client, the API with a health check, and
> the tooling around them. Document processing, reconciliation and review are not implemented yet.

## Tech stack

| Area     | Choice                                             |
| -------- | -------------------------------------------------- |
| Frontend | React 19, Vite 8, plain CSS                        |
| Backend  | Node.js, Express 5 (ES modules)                    |
| Tests    | Vitest + Testing Library (client), `node:test` (server) |
| Linting  | ESLint 10 flat config, shared across the workspace |
| Tooling  | npm workspaces, `concurrently` for local dev       |

Everything runs locally. No paid service, API key or external database is required.

## Prerequisites

- **Node.js** 22.22.2+ or 24.15.0+ (the repo is developed on Node 24; see `.nvmrc`)
- **npm** 10 or newer (ships with those Node versions)

Check with:

```bash
node --version
npm --version
```

## Getting started

```bash
npm install
npm run dev
```

`npm run dev` starts both apps:

- API: <http://localhost:4000> (health check at <http://localhost:4000/api/health>)
- Web client: <http://localhost:5173>

If port 5173 is busy, Vite picks the next free port and prints it in the terminal.

The header badge and the **Backend connection** panel show whether the client can reach the API. To see the
failure state, run `npm run dev:server` and `npm run dev:client` in separate terminals, stop the API, and
press **Check again**. (`npm run dev` stops both apps together, so the API cannot be stopped on its own there.)

## Scripts

Run these from the repository root.

| Command              | What it does                                              |
| -------------------- | --------------------------------------------------------- |
| `npm run dev`        | Start the API (with file watching) and the Vite dev server |
| `npm run dev:server` | Start only the API                                        |
| `npm run dev:client` | Start only the web client                                 |
| `npm test`           | Run the client and server test suites                     |
| `npm run lint`       | Lint the whole repository                                 |
| `npm run lint:fix`   | Lint and apply safe automatic fixes                       |
| `npm run build`      | Build the client for production into `client/dist`        |
| `npm start`          | Start the API without file watching                       |

Workspace-specific scripts can be run with `--workspace`, for example
`npm run test:watch --workspace client` or `npm run preview --workspace client`.

## Environment configuration

Both apps run with sensible defaults, so `.env` files are optional. To override a value, copy the example
file and edit the copy:

```bash
cp server/.env.example server/.env
cp client/.env.example client/.env
```

| File          | Variable           | Default                 | Purpose                                         |
| ------------- | ------------------ | ----------------------- | ----------------------------------------------- |
| `server/.env` | `PORT`             | `4000`                  | Port the API listens on                         |
| `server/.env` | `NODE_ENV`         | `development`           | Runtime mode                                    |
| `client/.env` | `API_PROXY_TARGET` | `http://localhost:4000` | Where the Vite dev/preview server sends `/api`  |

The server loads `server/.env` with Node's built-in `--env-file-if-exists` flag, so there is no `dotenv`
dependency.

**Secrets belong on the server only.** Vite bundles every `VITE_`-prefixed variable into the browser code,
where anyone can read it. `API_PROXY_TARGET` is intentionally unprefixed so it stays inside `vite.config.js`.
Future integrations (for example an optional AI provider key) will be read by the API from `server/.env`.

`.env` files are git-ignored; only the `.env.example` files are meant to be committed.

## How the client talks to the API

In development the browser only talks to the Vite dev server. Requests to `/api/*` are proxied to the API,
so the client uses relative URLs, there is no CORS configuration, and no backend address is compiled into
the bundle. `vite preview` uses the same proxy.

## Project structure

```
veribill-ai/
├── client/                 React + Vite web app
│   ├── public/             Static files served as-is
│   └── src/
│       ├── api/            HTTP calls to the backend
│       ├── components/     UI components
│       ├── hooks/          React hooks (e.g. the API health check)
│       ├── test/           Test setup and shared fixtures
│       └── utils/          Small pure helpers
├── server/                 Express API
│   ├── src/
│   │   ├── middleware/     Shared Express middleware (404 and error handling)
│   │   ├── routes/         Route modules mounted under /api
│   │   ├── app.js          Builds the Express app (used by tests and index.js)
│   │   ├── config.js       Reads and validates environment variables
│   │   └── index.js        Process entry point
│   └── test/               node:test suites
├── docs/                   Architecture and design notes
└── eslint.config.js        Lint rules for the whole repo
```

See [docs/architecture.md](docs/architecture.md) for the reasoning behind this layout and how upcoming
features are expected to fit in.

## API

### `GET /api/health`

Returns `200` while the API process is running.

```json
{
  "status": "ok",
  "service": "veribill-api",
  "version": "0.1.0",
  "uptimeSeconds": 42,
  "timestamp": "2026-10-17T07:53:50.462Z"
}
```

Unknown routes return `404` with `{ "error": { "message": "Route not found: GET /api/..." } }`.
Unexpected failures return `500` with a generic message; details are logged on the server only.

## Testing

```bash
npm test
```

- **Server:** `node --test` runs the suites in `server/test`. The HTTP tests start the real Express app on
  a random local port, so no extra testing library is needed.
- **Client:** Vitest runs in a jsdom environment with Testing Library. `fetch` is stubbed per test, so the
  client tests do not need the API to be running.

## Building for production

```bash
npm run build
```

The optimized client is written to `client/dist`. Serving it in production (and deploying the API) is not
set up yet.

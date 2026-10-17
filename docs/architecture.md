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
- Routes live in `src/routes/` and are mounted under `/api/<resource>`.
- `src/middleware/errors.js` turns unknown routes into JSON 404s and errors into JSON responses. 5xx
  responses never include the original error message, because internal errors can contain hostnames,
  queries or file paths.

### Error format

```json
{ "error": { "message": "Human-readable explanation" } }
```

Later endpoints should throw (or pass to `next`) an error with a numeric `status` for client errors;
anything else is treated as a 500. Express 5 forwards rejected promises from async handlers automatically.

## Client

- `src/api/` holds functions that call the backend and translate HTTP failures into readable errors.
  Components never call `fetch` directly.
- `src/hooks/` holds stateful logic (currently `useApiHealth`), keeping components presentational.
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
| Authentication        | `server/src/routes/auth.js`, middleware for roles  |
| Persistence           | `server/src/db/` (local MongoDB Community Server)  |
| Document upload/parse | `server/src/documents/`                            |
| Reconciliation rules  | `server/src/reconciliation/` (pure functions)      |
| Review queue          | `server/src/routes/reviews.js` + client views      |

These are starting points, not commitments. Each will be documented here as it is built.

# TaskNest Week 3 Backend API

**Junior Full Stack Developer Intern — Week 3: Back-End API Development**  
Author: Yash Vinod Sawant · Prepared: 20 October 2026

A functioning REST API for TaskNest accounts, sessions, projects, tasks, filters, pagination and dashboard summaries. Data persists in a local **embedded PostgreSQL database (PGlite)** by default. This is a real SQL engine with transactions and foreign keys. A `pg` adapter is also included for a separate PostgreSQL server.

This submission implements the Week 3 backend. The Week 2 React demo remains unchanged; connecting it, including account screens and development proxy configuration, belongs to Week 4. No deployment or portal submission is claimed.

## Run locally

Install Node.js **22.12 or later** (verified with Node 24.19.0) and pnpm (verified with 11.25.0). From this folder:

```sh
pnpm install --frozen-lockfile
pnpm start
```

Open <http://127.0.0.1:8033/api/v1/health>. A JSON health response is expected; the backend does not serve a webpage. The first start creates the database and applies `schema.sql` in a migration transaction. Restarting the process retains records in `data/tasknest/`. Only one process may open a PGlite data directory. Start from this folder so relative paths resolve consistently.

For optional configuration, copy `.env.example` to `.env` and edit it. The Node start script loads it automatically. Stop with **Ctrl+C**. Use `pnpm dev` for automatic restarts while editing.

## Verify the work

```sh
pnpm test
```

The **30 automated tests** create temporary real PostgreSQL databases and ephemeral HTTP listeners. Tests do not modify the normal `data/` directory. They cover CRUD, ownership, session rotation and expiry, CSRF, validation, pagination, literal search, constraints, rollback, rate limits, concurrency and a disk close/reopen cycle. The supplied [TAP results](docs/test-results.tap) record the successful run.

With the normal server running, open another terminal in this folder:

```sh
pnpm smoke
```

This performs 18 HTTP requests across all 16 endpoint/method combinations. It creates a random synthetic account, logs out and in, creates/updates/deletes a project and task, and verifies summaries. The sample project is deleted; the synthetic account remains locally. No credentials or cookie tokens are printed. `API_URL` and `APP_ORIGIN` can override the default addresses. [Live run evidence](docs/smoke-results.txt) is included.

## API use

The base path is `/api/v1`. [API.md](docs/API.md) documents every method, input, response and error. [openapi.json](docs/openapi.json) is an OpenAPI 3.1 specification for importing into compatible API tools.

1. `GET /auth/session` to receive an anonymous cookie and a CSRF token.
2. `POST /auth/register` or `/auth/login`, preserving cookies and sending the exact configured `Origin` and `X-CSRF-Token` headers.
3. Save the **new cookie and new CSRF token** returned after authentication.
4. Use the authenticated cookie for reads and both headers for all mutations.
5. `POST /auth/logout` invalidates that session. Bootstrap again before signing in again.

There are no seeded accounts or hardcoded credentials. The automated smoke script is the quickest complete usage example. For curl, save cookies with `-c cookies.txt -b cookies.txt`; copy the latest `data.csrfToken` from the JSON response into the `X-CSRF-Token` header. Do not upload cookie files.

## Design and security

- Routes → validation/authentication → repository → database adapter. Express 5 propagates async errors to one JSON error handler.
- PostgreSQL schema: users → projects → tasks, plus anonymous/authenticated sessions. Foreign keys cascade child records. Migration version is recorded separately.
- SQL values always use bound parameters. Project ownership is checked for every project/task operation; another user's identifiers receive 404.
- Argon2id password hashes use 19 MiB memory, 2 passes and parallelism 1. Opaque random session tokens are stored only as SHA-256 digests. Cookies use HttpOnly, SameSite=Lax and production Secure.
- CSRF tokens and exact Origin checks protect mutations, including registration/login. Anonymous sessions expire after 15 minutes, authenticated sessions after 7 days. Authentication rotates both tokens. Expired records are removed during anonymous bootstrap.
- Per-process, in-memory rate limits per 15-minute window: general API 300/IP; session bootstrap 30/IP; registration/login combined 20/IP and 10/normalized-email digest. No proxy headers are trusted by default. Malformed requests also count toward the general limit.
- JSON bodies are capped at 16 KB. Mutation keys are explicitly allowed; invalid values, unknown keys, repeated query parameters and invalid calendar dates are rejected. Logs omit request bodies, session tokens and SQL details.
- Locked transactions preserve unrelated fields during concurrent PATCH requests. List counts and pages come from one SQL statement. UTC defines overdue tasks.

## Separate PostgreSQL server option

Create a dedicated empty PostgreSQL database with a role allowed to create its tables. In `.env`, set `DATABASE_URL` to that database connection string, then start normally. The same migration and repository SQL run through `pg`; transactions stay on one checked-out connection. Database TLS settings must follow your database provider's instructions; certificate verification is not disabled by this code.

**Verification boundary:** automated and live tests use PGlite. A separate PostgreSQL server was not available in the verification environment, so that adapter is included but not independently exercised. The application is intended for one process. A production deployment still needs HTTPS termination, trusted-proxy decisions, shared rate-limit storage for multiple instances, database backups, managed migrations and operational monitoring. Password reset and email verification are outside Week 3.

## Files and development process

- `src/app.js` — routes, middleware order, rate limits and response envelopes.
- `src/auth.js`, `src/validation.js`, `src/errors.js` — authentication, validation and controlled errors.
- `src/repository.js` — bound SQL and ownership-aware persistence.
- `src/database.js`, `schema.sql` — adapters, migration and relational constraints.
- `src/server.js`, `src/config.js` — environment checks, startup and graceful shutdown.
- `tests/` — real HTTP/database integration tests; `scripts/smoke.js` — live walkthrough.
- `docs/` — endpoint reference, OpenAPI, testing report and recorded evidence.
- `REPORT.md`, `TaskNest-Week-3-Report.docx` — readable and portal-ready reports.
- `submission-description.txt`, `SUBMIT.md` — text and manual submission steps.

The implementation follows the Week 1 REST/session plan and the Week 2 camelCase response contract. Project names use 80 characters and task titles use 200 to match the implemented frontend limits; these refine the earlier proposed SQL limits. The database can supply real data when Week 4 adds integration. No frontend integration is claimed here.

Development proceeded through schema design, adapter construction, authentication, ownership-aware CRUD, HTTP integration tests, persistence checks and documentation. An embedded engine avoids requiring a separately installed database for assessment while retaining PostgreSQL behavior. The main challenges were rotating both session tokens safely, applying ownership checks consistently, validating date-only values and preserving fields during concurrent updates.

## References

- [Express error handling](https://expressjs.com/en/guide/error-handling/)
- [PGlite setup](https://pglite.dev/docs/) and [transaction API](https://pglite.dev/docs/api)
- [node-postgres transactions](https://node-postgres.com/features/transactions)
- [Argon2 implementation](https://github.com/napi-rs/node-rs/tree/main/packages/argon2)

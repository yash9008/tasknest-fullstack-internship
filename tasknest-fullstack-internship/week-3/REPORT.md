# TaskNest Week 3 Backend API Development Report

**Internship:** Junior Full Stack Developer Intern  
**Participant:** Yash Vinod Sawant  
**Week:** 3  
**Prepared:** 20 October 2026

## Outcome and scope

Week 3 delivers a functioning backend for TaskNest with 16 REST endpoint and method combinations. Accounts, cookie sessions, projects, tasks, filtering, pagination and dashboard summaries use persistent PostgreSQL storage. The source, schema, setup guide, API reference, OpenAPI specification and test evidence are included. Thirty automated tests pass, and a separate live walkthrough completes 18 successful HTTP requests. This submission covers backend development; connecting the Week 2 React frontend is reserved for Week 4.

## Architecture and database

The server uses Node.js and Express 5. Routes validate requests, authentication middleware establishes the session, repository functions enforce ownership, and a small database interface provides bound SQL queries and transactions. Separating application creation from the listening process allows real HTTP integration tests without starting the user's normal server.

The default database is PGlite, a file-backed embedded PostgreSQL engine. It avoids requiring an assessor to install a separate database server while retaining relational constraints and transactions. A second adapter uses node-postgres and DATABASE_URL for a separate PostgreSQL instance. The latter adapter has not been live-tested in this environment.

The schema contains users, sessions, projects and tasks. A user owns many projects; each project contains tasks. Sessions reference a user when authenticated and remain anonymous during initial bootstrap. Foreign keys cascade dependent records. Indexes support owner lists, task status and due-date lookup, and session expiry. The schema migration and its version record are committed together.

Project names are limited to 80 characters and task titles to 200, matching the implemented Week 2 frontend contract and refining the initial Week 1 SQL proposal. Responses use camelCase fields such as projectId, dueDate and createdAt. The default database persists in data/tasknest and must be opened by only one application process.

## API behavior

The /api/v1 prefix contains public health/session endpoints, account registration/login/logout, a private dashboard, project CRUD and task CRUD. GET collections return a data array and page/limit/total metadata; resource responses return a data object. Creation returns 201, reads and updates return 200, and deletion/logout return empty 204 responses. Project/task creation supplies a Location header.

Task lists combine a literal case-insensitive title search with status and priority filters. Stable sorting uses created time and ID. Counts and pages come from one SQL snapshot, including when a page is empty. Dashboard summaries include projects, tasks, todo, in-progress, completed and overdue counts for the signed-in owner. Overdue excludes completed tasks and uses the current UTC date.

The API reference documents every endpoint, input, constraint and response. An OpenAPI 3.1 specification supports inspection in compatible API tools. A standalone smoke script demonstrates the complete authentication and CRUD sequence.

## Authentication and request protection

Passwords are stored as Argon2id hashes using 19 MiB memory, two passes and parallelism one. Session tokens are random opaque values; only their SHA-256 digests are stored in the database. Cookies use HttpOnly, SameSite=Lax and production Secure. Anonymous sessions last 15 minutes and authenticated sessions last seven days. Login and registration rotate the session and CSRF token, while logout invalidates the presented session.

All mutations require the latest CSRF token and the exact configured Origin. Every project/task lookup and mutation checks project ownership; missing and other users' resources both receive 404. SQL input is parameterized, and editable fields are explicitly allowed. Validation rejects invalid UUIDs, impossible dates, unsupported fields, incorrect types, repeated query parameters and oversized strings. JSON bodies are limited to 16 KB.

In-memory rate limits constrain API traffic, session bootstrap and authentication by IP and normalized-email digest. Controlled JSON errors use appropriate HTTP status codes and a request ID. Unexpected errors do not expose stack traces, SQL parameters or credentials. Locked transactions prevent concurrent partial updates from losing unrelated changes.

## Verification and findings

The 30 automated tests exercise real HTTP routes and real PostgreSQL data. They verify account normalization, token rotation and hashing, expiry/logout, ownership across all resource operations, CRUD, filters, pagination, dashboard totals, cascading deletion, rollback, invalid input, throttling and concurrency. A dedicated test closes a file-backed database, opens it again and retrieves the saved task through a newly started HTTP server using the persisted session.

All 30 tests pass with zero failures or skips. A live run of the standalone server also completes 18 successful requests across all 16 endpoint/method combinations. The test suite and recorded TAP/live outputs are supplied in tests/ and docs/. One fault-injection test deliberately substitutes a failed query function to check the generic 500 boundary; normal CRUD tests do not mock database operations.

## Challenges and decisions

The main implementation challenges were preserving authentication state safely, applying ownership checks consistently and keeping date-only values independent of timezone shifts. Rotating both tokens in an authentication transaction prevents reuse of the presented session. Ownership checks live beside persistence operations, and UTC date rules keep overdue calculations consistent. Locked partial updates preserve fields changed by concurrent requests.

Embedded PostgreSQL simplifies setup and assessment. A separate PostgreSQL adapter remains available, but its live verification is outstanding. Production deployment would still require HTTPS termination, database backups, shared throttling for multiple processes, proxy configuration and operational monitoring. Password recovery and email verification are outside this week's task. No public deployment, frontend integration or portal upload is claimed.

## Running and submitting

Install Node.js 22.12 or later and pnpm. In week-3, run pnpm install --frozen-lockfile, then pnpm start. Inspect /api/v1/health on port 8033. Run pnpm test for the automated suite; in a second terminal use pnpm smoke for the live walkthrough. The Word report is intended for the portal's report field; the source ZIP and GitHub week-3 folder provide the code. The separate submission-description.txt file contains more than 200 words ready to paste.

## References

Express error handling: https://expressjs.com/en/guide/error-handling/  
PGlite setup and transactions: https://pglite.dev/docs/ and https://pglite.dev/docs/api  
node-postgres transactions: https://node-postgres.com/features/transactions  
Argon2 implementation: https://github.com/napi-rs/node-rs/tree/main/packages/argon2

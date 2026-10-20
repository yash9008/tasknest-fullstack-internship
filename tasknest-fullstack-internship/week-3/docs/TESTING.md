# Week 3 verification

Verified on 20 October 2026 using Node.js v24.19.0 and pnpm 11.25.0 on macOS. Dependencies are pinned and the pnpm lockfile is included.

## Automated result

Command: `pnpm test` (Node built-in test runner, one test file at a time). The recorded run uses the equivalent `node --test --test-concurrency=1 --test-reporter=tap tests/*.test.js` to retain portable evidence.

**30 tests passed; 0 failed, skipped or cancelled.** Full output: [test-results.tap](test-results.tap). Normal tests make actual HTTP requests to the Express app and use real PostgreSQL queries in isolated PGlite databases. One deliberate fault-injection test substitutes a failing query function to check the 500 error boundary. No normal CRUD test uses a database mock.

| Area | Evidence covered |
| --- | --- |
| Accounts and sessions | Normalized registration, duplicate email, login failure parity, token rotation, Argon2id storage, hashed session storage, expiry and logout replay rejection |
| Request protection | HttpOnly/SameSite cookies, production Secure, exact Origin and CSRF checks, protective headers, 16 KB body limit |
| Ownership | All eight operations involving a particular project/task ID reject another user's resource with 404; list and dashboard remain owner scoped |
| CRUD and constraints | Project/task create/read/patch/delete, defaults, cleared dates, cascading deletion, rollback and orphan rejection |
| Query behavior | Combined filters, literal SQL metacharacters and wildcards, deterministic pagination, empty-page totals, duplicate query rejection |
| Validation | UUIDs, unknown fields, mass assignment, required fields, lengths, malformed JSON, types and impossible dates |
| Concurrency | Two concurrent task patches preserve the independently changed status and priority |
| Throttling and failure | General IP, account-based and session-bootstrap limits; generic 500 response and redacted diagnostic logging |
| Persistence | Close and reopen a file-backed database and new HTTP server; the same account/session retrieves the saved task and due date |

The persistence test uses a newly created temporary directory and removes it on completion. It verifies that the migration runs only once. Other tests use in-memory engines. The normal application database is not touched.

## Live server walkthrough

A separate `src/server.js` process was started with a temporary file-backed directory. `node scripts/smoke.js` performed **18 successful requests**, covering **all 16 endpoint and HTTP method combinations**, including registration, logout, a fresh bootstrap, login, every CRUD route, filters and dashboard totals. [smoke-results.txt](smoke-results.txt) contains the recorded HTTP status/path output. Cookie tokens and credentials are not logged. The sample project and task were removed; the temporary database is outside the submission.

## Limits of the evidence

The separate `pg` adapter is implemented but was not live-tested against a separately installed PostgreSQL server. HTTPS cookie attributes and production configuration rejection are tested locally; no public HTTPS deployment is claimed. Rate limits are in-memory and scoped to one application instance. This backend task does not verify browser UI integration, password recovery, email verification, multi-instance operation or production load. Week 2 files are unchanged, and Week 4 integration has not been completed as part of this submission.

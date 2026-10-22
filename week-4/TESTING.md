# TaskNest Week 4 verification

Verified **22 October 2026** using Node 26.9.0, Vite 8.3.4, React 19.3.0, Express 5.3.0, PGlite 0.5.10, Playwright 1.64.1 and Helium Chromium 155 on macOS.

## Automated suite — 38 passed, 0 failed

`npm test` runs 30 retained backend HTTP/database tests, four retained frontend model tests and four new integration/transport tests. It uses temporary databases or memory databases and ephemeral listeners, not the normal application data directory. Raw successful output is in `evidence/node-tests.txt`.

Backend coverage includes actual SQL, password/session hashing, session rotation and expiration, CSRF and Origin enforcement, validation, allowed fields, owner isolation, CRUD, search/pagination, project-task cascades, transaction rollback/foreign keys, rate limits, concurrency, safe errors and file-backed close/reopen persistence. The model suite checks summaries, combined filters, page clamping and validation.

New tests run the actual browser transport against real HTTP/database routes with a Node cookie jar: bootstrap → register → project/task create/edit → summary → second-account denial → logout → invalid/successful login → delete. They verify rotated CSRF headers and stripping server-owned fields before strict PATCH validation. Other checks cover restored cookie sessions, expired-session mutation rejection without replay, deduplicated bootstrap, complete pagination collection, unreadable responses, timeout/network feedback and Retry-After metadata. The pagination/error-only branches use controlled response fixtures; they are not substitutes for the real integration flow.

## Browser suite — 13 groups, 5 widths

`npm run test:browser` launches an isolated built Express app with a temporary file-backed PostgreSQL database. Normal workflows use actual endpoints; only explicitly named network/read/rate-limit failure branches intercept traffic. Its temporary QA server raises rate limits to support repeated checks; the unchanged production defaults remain covered by the backend rate-limit tests.

1. Protected route, registration validation, real registration and empty new account.
2. HttpOnly session cookie and absence of credentials/workspace data in localStorage.
3. Project create/edit, task creation, required fields and five-task pagination.
4. Combined filters, complete/reopen, strict partial updates and task editing.
5. Cookie/session restoration after browser reload and actual database/server restart.
6. Project layout at 320, 390, 768, 1024 and 1440 CSS px without horizontal page scrolling.
7. Failed-write draft preservation; committed-write/failed-read message and Retry.
8. Recoverable rate-limit feedback.
9. Second real account cannot view another account's project or task.
10. Cancelled/confirmed task deletion, logout, invalid credentials and successful login.
11. Confirmed project deletion cascades to stored child tasks.
12. Delayed read cannot restore private data after logout; an expired database session clears the workspace.
13. Duplicate email is reported without losing entered account fields.

No page errors were recorded. `evidence/browser-results.json` contains workflow names, viewport widths and response method/path/status records; it excludes request/response bodies, cookies, passwords and tokens. Desktop/phone project screenshots, dashboard and registration-error screenshots accompany it.

## Both local startup paths

The single-server built application returned its HTML and database health response and was exercised by the full browser suite. A separate real development check used Vite on 8035, API on 8036 and its own data directory. Browser registration and project creation succeeded through the proxy, verifying preserved Origin and same-origin cookie/CSRF behavior. `evidence/development-results.json` records those checks. The README documents the default 8034/8033 development pair and environment overrides.

## Demonstration

`evidence/TaskNest-Week-4-Demo.webm` is a 30.92-second, 1280×800 screen recording of the actual built application with synthetic account data. It shows registration, project creation, two task creations, completion/filtering, reload persistence, task editing, sign-out and sign-in. On-screen chapter captions are added by the recorder for the video only. It has no audio. The recorder uses an isolated disk database and removes that database afterward; it does not create accounts in the normal application database.

## Build and limits

A clean extraction of the source ZIP also passed npm ci, npm run build, server startup, HTML/database health requests, fresh registration, project creation and the SQL dashboard summary. The result is recorded in `evidence/package-verification.json`.

`npm run build` succeeds. Dependencies are pinned in `package-lock.json`; the upload package excludes installed modules, generated dist files, runtime databases and real environment files. Run `npm ci` and build after extraction. Playwright and FFmpeg are optional QA dependencies, not webpage runtime downloads.

The separate `pg` database adapter was retained but no external PostgreSQL instance was available. Browser tests use one engine and simulated sizes, not physical devices or cross-browser/accessibility certification. No production deployment, load test, WebSocket push, offline sync, email verification or password recovery is claimed. The snapshot design targets small workspaces, and cross-endpoint reads can reflect concurrent changes at different moments. Production HTTPS, backups, shared rate limits and monitoring remain deployment work.

# Week 4: Integrating Front-End with Back-End

TaskNest | YuvaIntern Junior Full Stack Developer Intern

Prepared by: Yash Vinod Sawant
Date: 22 October 2026

## Objective and completed outcome

Week 4 connects the existing React frontend to the backend APIs developed in the preceding tasks. The completed TaskNest application supports real accounts, persistent projects and tasks, asynchronous data loading, and clear loading, validation and failure states. It replaces the Week 2 browser-local demo with the Week 3 PostgreSQL-backed API while retaining the established design and workflows.

Users can register, sign in, create and edit projects, add tasks, complete or reopen work, combine filters, paginate and confirm deletions. Changes are reflected after the server confirms the write. Sessions and records survive page reloads and an actual database/server restart. A second account cannot access the first account's records.

| Submission item | Included deliverable |
| --- | --- |
| Integrated source | React client, Express server, SQL schema, exact dependency lockfile and setup scripts |
| Updated documentation | README, integration notes, API/OpenAPI reference and verification results |
| Report and description | Word report, Markdown report and a submission description above 200 words |
| Compressed package | Source ZIP containing both application layers and supporting evidence |
| Demonstration | 30.92-second, 1280 × 800 screen recording of the working local application |

### Verification at a glance

38 automated tests passed: 30 backend tests, four frontend model tests and four new transport/integration tests. The built application passed 13 browser workflow groups and five project viewport widths with no page errors. A separate development check verified Vite proxy registration and project creation. The build succeeded using the pinned dependencies.

## How the application is connected

### Shared request contract

The React views call a single API service. It sends same-origin fetch requests to /api/v1, uses JSON data/error envelopes, includes the HttpOnly session cookie through the browser, and sends the current in-memory CSRF token for writes. Loaded camelCase records map directly to the existing project and task components.

| Interface action | Backend integration |
| --- | --- |
| Open account / register / sign in | GET /auth/session; POST /auth/register or /auth/login |
| Dashboard and projects | GET /dashboard; paged GET /projects |
| Tasks and project details | Paged GET /projects/:id/tasks |
| Project changes | POST /projects; PATCH or DELETE /projects/:id |
| Task changes | POST /projects/:id/tasks; PATCH or DELETE /tasks/:id |
| Sign out | POST /auth/logout; clear private client state |

### Authentication and permissions

Session bootstrap is deduplicated while in flight. Successful registration or sign-in rotates the cookie session and CSRF token; the client captures the new token before its next write. Passwords use Argon2id hashes on the server, session tokens are stored as digests, and cookies use HttpOnly and SameSite=Lax. Production configuration adds Secure cookies and requires an HTTPS origin. No credentials or workspace data are stored in localStorage.

The backend retains bound SQL, owner checks, allowed-field validation, request size limits, CSRF/Origin checks and rate limits. The UI sends only editable fields, preventing read-only IDs and timestamps from reaching strict PATCH validators. Completion sends only a status change, preserving unrelated task fields.

### Asynchronous state and failures

Workspace loading combines server summary totals and all project/task API pages. Task requests are limited to four projects at a time. The established client-side search, filters and five-task presentation pages remain in the hash URL. A successful mutation refreshes the server snapshot before the interface continues.

A mutation lock prevents overlapping writes. Failed writes keep the form draft. A committed write followed by a failed refresh explicitly says it was saved and offers Retry. Network and timeout failures never automatically replay a write because its outcome can be uncertain. A generation counter rejects old workspace responses after authentication changes or sign-out. Expired or changed sessions remove private data and return to sign-in.

## Validation, evidence and challenges

### Automated and browser evidence

| Check | Verified outcome |
| --- | --- |
| Automated tests | 38 passed; no failures |
| Real API/database regression | CRUD, ownership, CSRF, tokens, validation, transactions, concurrency and persistence |
| Browser workflows | 13 passed against a temporary disk-backed application |
| Responsive project widths | 320, 390, 768, 1024 and 1440 CSS px; no horizontal page overflow |
| Single-server path | Built React served together with Express API |
| Development path | Real registration and project save through Vite on 8035 and API on 8036 |
| Demonstration | 31-second silent video with chapter captions and synthetic account data |

Normal browser workflows use the actual Express/PGlite backend. Explicit network, failed-read and rate-limit scenarios intercept selected requests to make failure behavior repeatable. Backend tests independently exercise the real rate limiter; the isolated browser test server raises limits for repeated checks. Successful outputs, screenshots and the request method/path/status trail are in evidence/. No passwords, cookies or tokens are recorded in the request trail.

### Integration challenges and solutions

Token rotation: the original frontend transport did not update its CSRF value after login. The new transport captures it from every session response, and a real HTTP test compares the authentication and subsequent write headers.

Strict payload validation: loaded tasks include server-owned fields. Sending those records back directly would cause rejected requests. Field projection and status-only completion updates now match the existing backend contract.

Uncertain saves: connection failure and failed refresh have different meanings. Forms preserve drafts after write errors, while committed writes are clearly distinguished from refresh failures. Browser checks verify both paths.

Stale private data: an old request could otherwise finish after sign-out. The browser test holds a real read, signs out and releases the result; the private workspace stays absent. Expiring the actual database session also removes private content.

Persistence and isolation: the browser suite closes and reopens the real disk database/server, then reloads the same signed-in page. It also registers a separate account and requests the first account's project URL. Records persist for the owner and stay inaccessible to the other account.

## Local setup, scope and learning

### Run the whole application

Install Node.js 22.19 or newer with npm. In the week-4 folder run npm ci, npm run build, then npm start. Open http://127.0.0.1:8034/ and create an account. The first start creates the local PostgreSQL database; later starts retain it. There are no seeded accounts, default passwords or required external services. Ctrl+C stops the server.

For development, stop the single-server process and run npm run dev. Vite runs on 8034 and the API on 8033. The proxy preserves the browser Origin and cookie behavior. Optional DEV_WEB_PORT, DEV_API_PORT and DATA_DIR values select other ports and a separate database. Only one process should open a given PGlite directory. The README documents environment configuration and both startup paths.

Run npm test for automated checks. For browser QA, install Playwright Chromium and FFmpeg, build the application, then run npm run test:browser or npm run demo. TASKNEST_BROWSER can choose an existing Chromium executable. The browser suite and recorder create and remove their own temporary databases.

### Demonstration and source package

The source ZIP includes client and server code, SQL schema, package-lock.json, setup instructions, integration notes, reports, test scripts, screenshots and the demonstration video. It excludes node_modules, dist, runtime databases and real environment files. Extract the week-4 folder, install dependencies and build before starting. The recording shows registration, project and task creation, completion, filters, reload persistence, editing and sign-out/sign-in with synthetic account data.

### Verification boundaries

PGlite, the built single-server application and the development proxy were verified locally. The separate PostgreSQL adapter is retained but was not exercised against an external database. Browser checks use one Chromium engine and simulated viewport sizes; no physical-device, cross-browser, load-test or accessibility certification is claimed. GitHub upload, online deployment and portal submission remain separate actions.

The workspace snapshot approach targets small personal projects. Cross-endpoint reads are not one database transaction, and very large workspaces can hit request limits. Users can refresh to see changes from another tab; there is no push channel or offline queue. Production still needs HTTPS termination, backups, monitoring and shared rate-limit storage for multiple instances. Password reset and email verification are outside this implementation.

### Learning outcomes and references

Integration requires more than replacing storage calls with fetch. Matching field contracts, rotating authentication state, keeping UI updates consistent with confirmed server writes, and exercising failure/restart paths make the application reliable and understandable to both users and developers.

React effect cleanup: https://react.dev/reference/react/useEffect
Vite proxy configuration: https://vite.dev/config/server-options
Playwright video recording: https://playwright.dev/docs/videos


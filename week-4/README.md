# TaskNest — Week 4: Integrating Front-End with Back-End

**YuvaIntern · Junior Full Stack Developer Intern**  
**Author: Yash Vinod Sawant · 22 October 2026**

TaskNest now connects the Week 2 React interface to the Week 3 Express/PostgreSQL API. Register an account, sign in, create projects and tasks, edit and complete work, filter lists, and return to the same data after a reload or server restart. The default application uses real API/database persistence; it does not use the Week 2 localStorage demo.

## Quick start: one local server

Install **Node.js 22.19 or newer** with npm. Open a terminal in this `week-4` folder:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:8034/**. Click **Create your workspace**, create your own account using a password of 12–128 characters, and add a project. There are no seeded users or default passwords. Keep this exact browser origin for the default configuration. The first start initializes embedded PostgreSQL in `data/tasknest/`; later starts reuse it. No separate database installation, external account, API key or secret is required for local use. Stop the server with Ctrl+C.

Do not double-click source `index.html`: React needs the build and HTTP server. If startup reports a missing frontend build, run `npm run build`. If a port is busy, stop your earlier TaskNest process before retrying. Only one process may use a PGlite database directory at a time; stop the single-server build before starting development with the same directory.

## Development: React and API together

With the single-server process stopped:

```sh
npm run dev
```

Open **http://127.0.0.1:8034/**. This command starts Vite on 8034 and the API on 8033, forwards `/api` to the API, and shuts down both children when stopped. The proxy preserves the browser's Origin. Cookies and API requests remain same-origin from the browser's perspective. React changes use Vite hot reload; restart the command after backend changes.

For other development ports, set `DEV_WEB_PORT` and `DEV_API_PORT`; they must differ. `DATA_DIR` can select another database directory. For example, on macOS/Linux:

```sh
DEV_WEB_PORT=8035 DEV_API_PORT=8036 DATA_DIR=./data/dev npm run dev
```

The single-server build reads `PORT`, `HOST`, `APP_ORIGIN`, `DATA_DIR`, `NODE_ENV` and optional `DATABASE_URL`. To customize, copy `.env.example` to `.env` and update both `PORT` and the exact `APP_ORIGIN` together. Environment files and runtime databases are excluded from the source package.

## Integrated workflows

- Register, sign in, sign out, and restore a session after a page reload.
- Create, edit and confirm deletion of projects; deleting a project cascades its tasks.
- Create, edit, complete, reopen and delete tasks with status, priority and optional due date.
- Show server-backed dashboard totals and project progress derived from loaded tasks.
- Search projects, combine task search/status/priority filters, and navigate five-task pages. Filters and page state live in the hash URL.
- Show loading, empty, not-found, validation, authentication, connection and rate-limit feedback.
- Keep form drafts after failed writes. Distinguish a committed write with a failed follow-up refresh.
- Ignore old workspace reads after sign-out/session changes. Clear private state on expiration.
- Update the interface after confirmed server responses. Use **Refresh** to fetch changes from another tab; this version has no WebSocket push or offline queue.

The sidebar and banner identify the signed-in user. Sessions use HttpOnly, SameSite=Lax cookies; passwords are Argon2id-hashed on the server. CSRF tokens stay in JavaScript memory and rotate with authentication. No passwords, session tokens or workspace data are stored in localStorage. Ownership is enforced by the API for all private records.

## Integration design

`React views → apiService → same-origin /api/v1 → Express validation/auth → repository → PostgreSQL`

The UI reuses the Week 2 component and model boundaries. Account screens and session orchestration are added in Week 4. The transport loads the existing camelCase API contract and refreshes workspace data after successful writes. It projects mutation payloads to editable fields, so IDs/timestamps from loaded records cannot reach strict backend validators. Task completion sends a partial status update.

Workspace reads collect every API page in batches of 100, with task requests limited to four projects at a time. This keeps the original client-side filters and five-task UI pagination. It targets small personal workspaces: loading all records is not an unbounded-scale design, and sufficiently large workspaces can hit the API request limit. See `docs/INTEGRATION.md` for the route mapping, state flow, decisions and challenges.

## Verification

```sh
npm test
```

**38 tests passed**: 30 inherited real API/database tests, four frontend model tests and four new transport/integration tests. Tests use isolated databases and HTTP listeners, not your normal workspace. They cover authentication, CSRF, ownership, CRUD, validation, persistence, concurrency, pagination, rate limits, token rotation, timeout/network errors and no automatic replay of failed writes.

Optional browser workflows and recording:

```sh
npx playwright install chromium ffmpeg
npm run test:browser
npm run demo
```

The browser suite builds on an existing `dist/`; run `npm run build` first after source changes. It starts its own server and temporary disk database and removes them afterward. **13 browser workflow groups and five project viewport widths passed**, with no page errors. Tests also restart the server/database, use a second account, simulate selected network/read/rate-limit failures, and check stale-response protection and session expiration. Recorded verification used Helium Chromium 155 on macOS; set `TASKNEST_BROWSER` to a Chromium executable to use an existing installation. Without it, Playwright uses its installed Chromium.

`npm run demo` records a fresh synthetic-account walkthrough to `evidence/TaskNest-Week-4-Demo.webm`. The supplied video is **30.92 seconds**, 1280 × 800, silent with on-screen chapter captions. Credentials in scripts/video are synthetic test data, not real user accounts. Full results, screenshots and boundaries are in `TESTING.md` and `evidence/`.

## Source layout

```text
client/                  React source, components, pages, models and model tests
server/src/              Express routes, auth, validation, repository and DB adapter
server/schema.sql        PostgreSQL tables and migration version 1
server/docs/             API reference and OpenAPI 3.1 specification
server/tests/            Real HTTP/database tests retained from Week 3
tests/                   New transport and integration checks
scripts/                 Development launcher, isolated QA server, browser suite, recorder
docs/INTEGRATION.md       Frontend/backend mapping, data flow, challenges and decisions
evidence/                Current test output, screenshots, development check and demo video
```

`dist/`, `node_modules/`, `data/` and real `.env` files are generated locally and excluded from the upload package. `npm ci` uses the included lockfile. The root report documents the work; the API reference is at `server/docs/API.md` and the importable specification at `server/docs/openapi.json`.

## Submission

The containing Week 4 folder has the numbered Word report, 200-plus-word description, GitHub upload folder, submission steps, source ZIP and video. `TaskNest-Week-4-Report.docx`, `REPORT.md` and `submission-description.txt` are also inside the code folder. Upload the entire inner `week-4` directory to the repository root. Keep client and server together. The ZIP includes both source layers, lockfile, documentation and video; install dependencies and build after extracting.

## Boundaries

The embedded PGlite engine, single-server build and Vite proxy were tested. The optional separate PostgreSQL adapter is retained from Week 3 but was not tested against an external server. This is a local educational application; no online deployment, GitHub upload or portal submission is claimed. Production needs HTTPS, `NODE_ENV=production`, an HTTPS `APP_ORIGIN`, trusted-proxy decisions, shared rate limits for multiple instances, backups and operational monitoring. No email verification, password reset, multi-user collaboration or formal accessibility certification is implemented.

References: [React effect cleanup](https://react.dev/reference/react/useEffect), [Vite server proxy](https://vite.dev/config/server-options), [Playwright video recording](https://playwright.dev/docs/videos), [Express static files](https://expressjs.com/en/starter/static-files.html).

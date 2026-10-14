# TaskNest Week 2 — Front-End Application Development

A working React frontend for the **YuvaIntern Junior Full Stack Developer Intern** internship, built from the TaskNest Week 1 design.

## What works
- Landing page, dashboard, and project detail view, connected by hash navigation.
- Create, edit, and delete projects; confirmed project deletion also removes its tasks.
- Create, edit, complete, reopen, and delete tasks.
- Search projects; combine task search, status, and priority filters.
- Five-task pagination with filters and page state in the URL.
- Derived open, completed, overdue, and project-progress totals.
- Persistence after browser refresh, validation, loading, empty, error, and missing-resource states.
- Native modal dialogs, Escape/cancel handling, focus restoration, labels, and live save/error feedback.
- Responsive layouts for desktop, tablet, and phone screens.

## Run locally
Install **Node.js 22.12 or later** and **pnpm**. In a terminal, open this `week-2` directory, then run:

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:8023`). Click **Open demo workspace**. No password or backend setup is needed for demo mode.

If you already use npm, `npm install` followed by `npm run dev` also runs the project. The supplied pnpm lockfile is the reproducible installation path.

```sh
pnpm test       # 11 model and service tests
pnpm build      # creates a production bundle in dist/
pnpm preview    # serves the production bundle locally
pnpm browser:test # optional browser workflow suite; see TESTING.md
```

Do not open the source `index.html` by double-clicking: React source needs Vite or a production build served over HTTP. If port 8023 is in use, Vite may print a different port; use the printed URL.

## Demo service and future API integration
The default asynchronous service stores sample projects and tasks under `tasknest.week2.v1` in localStorage. All demo data stays in the current browser origin. This is a personal frontend demonstration, without authenticated accounts, cross-user permissions, or a deployed database. Local storage is not a security boundary and is not used to store passwords. **Restore sample data** asks for confirmation before replacing local demo records.

The UI depends on a shared service interface in `src/services/`, rather than calling storage directly. `demoService.js` implements it for Week 2. `apiService.js` provides a fetch transport for the planned same-origin `/api/v1` endpoints, JSON envelopes, pagination, and CSRF bootstrap. Its request/error behavior is tested with mocked HTTP responses. It is not connected to a live backend in this submission.

For later integration, copy `.env.example` to `.env.local`, set `VITE_DATA_MODE=api`, restart Vite, and serve/proxy `/api/v1` on the same origin. The API must implement the Week 1 contract and provide a valid session. Demo mode remains the evaluator-friendly default. Account forms and production authentication are deferred with backend integration; no fake password authentication is implemented.

## Development approach and structure
React components separate views, shared display components, forms, and transport. App owns the workspace snapshot and dialogs. Forms own drafts and validation; derived summaries are computed from tasks. Confirmed mutations refresh the workspace. Failed saves keep the draft visible and do not announce success.

```text
src/
  App.jsx                # App shell, data orchestration, notifications
  main.jsx               # React entry point
  pages/                 # Landing, dashboard, project view
  components/            # Reusable stats, cards, tasks, forms, native dialogs
  lib/model.js           # Validation, filtering, summaries, pagination
  lib/router.js          # Hash routing and URL query state
  services/              # Demo and optional API adapters
  styles.css             # Shared styles and responsive rules
tests/                   # Node's built-in test runner
design/wireframes.svg    # Three-view layout and responsive plan
evidence/                # Browser screenshots
```

There is no router/state/UI library; React hooks, browser APIs, native dialog, and Vite keep the setup small. Hash routes work without server rewrite rules. Styles are grouped by purpose with breakpoints at 1200, 850, 600, and 360 pixels.

The Week 1 planning diagrams informed the workflow. Week 2 adds an implementation wireframe and actual browser screenshots. Original planning material remains in Week 1.

## Submission files
- `TaskNest-Week-2-Report.docx` — upload this Word report to the portal.
- `submission-description.txt` — copy the full description into the portal.
- `REPORT.md` — readable report for GitHub.
- `TESTING.md` — verification results and limitations.
- Source files, exact package versions, `pnpm-lock.yaml`, tests, wireframe, and screenshots.

The source ZIP excludes node_modules, generated dist files, and temporary Word files. Run the installation command to obtain dependencies.

## Scope and references
Only Week 2 is implemented here. Backend services, PostgreSQL, production authentication, hosting, and the later weeks remain future work. 

Component/state guidance: [React — Thinking in React](https://react.dev/learn/thinking-in-react).
Development/build tooling: [Vite — Getting Started](https://vite.dev/guide/).
References consulted on 14 October 2026.

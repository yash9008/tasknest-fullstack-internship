# TaskNest Week 2 Frontend Report

Yash | Junior Full Stack Developer Intern | YuvaIntern

14 October 2026

Task: Front-End Application Development

## Project outcome

TaskNest Week 2 implements a working frontend for the project and task tracker planned in Week 1. The application uses React 19.3.0, Vite 8.3.4, HTML, CSS, and JavaScript. Three connected views provide a landing page, a dashboard, and a project detail workspace. Users can organize demo projects and tasks, track progress, and continue their work after a browser refresh.

## Interface and development approach

The Week 1 workflow informed the screen structure. An implementation wireframe in design/wireframes.svg specifies the three views, responsive behavior, and editor dialogs. The interface uses a restrained purple accent, a sidebar on desktop, top navigation on phones and tablets, summary panels, and readable project and task cards. Hash navigation keeps the frontend usable without server rewrite rules; task filters and the page number remain in the URL.

## Component and state design

Page components separate the landing, dashboard, and project workspace. Shared components render summary statistics, project cards, task rows, forms, and native dialogs. App owns the workspace snapshot and current dialog; forms keep temporary drafts and validation. Summary totals and progress are derived from tasks. An asynchronous service layer separates data access from display components, avoiding direct storage calls inside the views.

## Implemented workflows

Projects can be created, renamed, and deleted. Tasks support title, description, status, priority, and optional due date, plus create, edit, complete, reopen, and delete actions. Deleting a project requires confirmation and removes its tasks. Search and combined status/priority filters narrow the task list; pagination shows five tasks per page. Empty lists and no-result searches offer clear next actions.

## Responsive behavior and keyboard use

CSS media queries adapt the card grid, sidebar, task rows, and forms at 1200, 850, 600, and 360 pixels. On phones, project cards stack and task actions wrap. Controls have visible labels and focus styling. Dialogs support Escape dismissal, cancellation, and focus restoration. Validation identifies fields, pending controls prevent duplicate submissions, and live notifications announce save results. Failed saves preserve the draft.

## Data services and scope

The default demo adapter stores sample records in localStorage through asynchronous methods. It is a working frontend demonstration, not authenticated multi-user storage. A separate fetch adapter follows the planned same-origin /api/v1 contract, including JSON envelopes, list pagination, and CSRF bootstrap. Its request and error behavior is tested with mocked responses. Production accounts, authorization, database persistence, and live backend integration remain later-week work.

## Verification and problem solving

Eleven model and service tests passed, covering validation, filtering, summaries, persistence, CRUD operations, cascade deletion, storage failure, corrupted data, and API request/error handling. Browser workflows verified navigation, editing, task status changes, URL filters, pagination, refresh persistence, cancellation, and failed-save recovery. A timing issue discovered during testing was corrected so editor dialogs remain pending until the refreshed task count is available. Filter controls also received exact accessible names.

## Results and limitations

The landing, dashboard, and project views were tested at 320, 390, 768, and 1440 pixels: all twelve combinations fit without horizontal page scrolling. Six desktop and phone screenshots were visually inspected. No browser page errors were recorded in the completed workflow suite. These results use simulated widths in one Chromium browser; API checks use mock responses. No physical-device test, formal accessibility audit, or production authentication test is claimed.

## Local run and submission

Inside the week-2 folder, run pnpm install --frozen-lockfile and pnpm dev, then open the Local URL printed by Vite. The default demo needs no account or backend. pnpm test runs the eleven unit tests; pnpm build creates the production bundle. The source ZIP includes a README, pinned dependencies, lockfile, all application source, tests, wireframes, screenshots, this report, and a 266-word submission description. It excludes downloaded dependencies and generated build files.

## Evidence and references

- [Implementation wireframes](design/wireframes.svg)
- [Desktop dashboard](evidence/dashboard-1440.png)
- [Phone project workspace](evidence/project-390.png)
- [Complete validation notes](TESTING.md)
- [React component and state guidance](https://react.dev/learn/thinking-in-react)
- [Vite development and build guidance](https://vite.dev/guide/)

Documentation references consulted on 14 October 2026.

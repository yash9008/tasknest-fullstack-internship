# Week 4 integration notes

## What was joined

The Week 2 React frontend originally used an asynchronous localStorage demo. The Week 3 API already supplied accounts, cookie sessions, CSRF, relational projects/tasks and dashboard summaries. Week 4 combines their source into one installation, adds account forms and session state, replaces the demo service with the real API adapter, and serves the built client through Express. Earlier-week folders are unchanged.

## Interface → endpoint mapping

| Interface operation | API method and route | State action |
| --- | --- | --- |
| Open application | GET /auth/session | Bootstrap cookie, current user and in-memory CSRF |
| Register / sign in | POST /auth/register or /auth/login | Replace user and rotated CSRF; load workspace |
| Dashboard | GET /dashboard and paged GET /projects | Display server totals and project cards |
| Project/task snapshot | Paged GET /projects/:id/tasks | Load task data for client-side filtering/pages |
| New / edit project | POST /projects; PATCH /projects/:id | Confirm write, then refresh snapshot |
| Delete project | DELETE /projects/:id | Confirm deletion; refresh and return to dashboard |
| New / edit task | POST /projects/:id/tasks; PATCH /tasks/:id | Confirm write; refresh task/progress views |
| Complete / reopen | PATCH /tasks/:id with status only | Preserve unrelated server fields |
| Delete task | DELETE /tasks/:id | Confirm, remove on refreshed server snapshot |
| Sign out | POST /auth/logout | Invalidate server session; clear user, private data and dialogs |

All routes above are relative to `/api/v1`. The backend still supports direct project/task reads and server-side task filters, documented in its API reference. The UI intentionally keeps the Week 2 hash-based filters and five-task presentation pages, rather than claiming each filter key triggers a server query.

## Request and state flow

1. Bootstrap requests are deduplicated while in flight. The backend sets an HttpOnly cookie and returns a CSRF token; only that CSRF value is kept in memory.
2. Authentication posts use the cookie and CSRF token. The response replaces the CSRF token because the backend rotates the session after authentication.
3. A signed-in user triggers a workspace refresh. Dashboard summaries come from SQL; project/task lists are fetched asynchronously through the same service boundary.
4. A save locks further mutations. The transport sends only allowed editable fields, waits for server confirmation and reloads the snapshot. The dialog closes and success appears only after the write succeeds.
5. A failed write retains the draft. A successful write followed by a failed read closes the dialog and explicitly says the write was saved but the view needs a retry. Network/timeout errors do not automatically replay mutations, because their outcome may be uncertain.
6. A generation counter changes when refresh, authentication or sign-out changes the active request context. A slow result from an older generation cannot restore private data after sign-out.
7. AUTH_REQUIRED or CSRF_INVALID removes private state and requests sign-in. Incorrect login credentials remain an account-form error; they do not masquerade as session expiration.

## Local serving

The production-style local path builds React into `dist/` and serves it and `/api/v1` from one Express server. Helmet protects responses; local HTTP disables upgrade-insecure-requests, while production configuration keeps HTTPS requirements and Secure cookies. Unknown API paths retain JSON errors instead of receiving the frontend HTML.

Development starts Vite and an internal Express listener. Vite proxies `/api` with `changeOrigin: false`, preserving the browser Origin checked by the backend. `APP_ORIGIN` is set to the development webpage origin. The launcher propagates signals and stops both processes when either fails or the command is stopped.

## Challenges and solutions

| Integration issue | Resolution and validation |
| --- | --- |
| Static demo had no account lifecycle | Added registration/login, cookie bootstrap, protected workspace and sign-out; verified with real UI workflows |
| Login rotates tokens | Capture the returned CSRF token before further writes; real transport tests compare pre/post authentication headers |
| Loaded task includes read-only ID/timestamps | Project/task field projection in transport; completion sends status only; actual backend strict validation exercised |
| Draft lost on failed saves | Existing form-local state stays mounted on write failure; browser abort test checks the entered value remains |
| Server saves but refresh fails | Separate write result from follow-up read; browser read-abort test verifies the saved-but-not-refreshed message and Retry |
| Old responses arrive after sign-out | Generation guard; browser holds a real read, signs out and releases it, then checks private UI remains absent |
| PostgreSQL persistence must be demonstrated | Browser test closes and reopens the file-backed DB/server and reloads the same signed-in page |
| A second account must stay isolated | Separate browser context registers a real account and tries the first account's project URL |

## Scope and scaling

Snapshot loading preserves the established client design and is appropriate for a small internship project. API pages are collected with a safety cap and task fan-out of four. This is not a single cross-endpoint database snapshot and concurrent changes in another tab can temporarily produce differing totals until Refresh. Large workspaces should use route-specific, server-filtered queries instead of loading every task. HTTP writes update the interface after confirmation; no push channel or offline sync is claimed.

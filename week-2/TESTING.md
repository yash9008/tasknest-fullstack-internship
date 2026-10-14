# TaskNest Week 2 validation

Verified on 14 October 2026. The scope is frontend behavior in a browser-local demo, with transport checks against mocked API responses.

## Automated model and service tests
`pnpm test`: **11 passed, 0 failed**.

- Correct open/completed/overdue summaries, excluding completed tasks from overdue counts.
- Combined case-insensitive title search, status, and priority filters.
- Pagination bounds, including empty lists and invalid page values.
- Required fields, enum validation, and impossible calendar dates.
- Project and task create/read/update/delete with persistence across adapter instances.
- Project deletion cascades to its tasks; task deletion preserves its project.
- Missing parents and invalid fields cannot create a task.
- Storage failure rejects the save and preserves the earlier stored snapshot.
- Corrupt data produces an error; explicit sample restoration recovers.
- The API adapter uses the planned path, JSON body, session bootstrap, and CSRF header.
- Unsuccessful API responses surface their message and field errors.

## Browser workflows
Playwright drove Helium (Chromium) in an isolated profile. The full workflow suite passed against the development app and again against the final production build served by Vite preview. All of these passed:

1. Navigate from landing to dashboard to project details.
2. Validate, create, rename, and delete projects, including task cascade.
3. Validate, create, edit, complete, reopen, and delete tasks.
4. Refresh and confirm that stored changes remain.
5. Update completed and overdue totals after changing a task.
6. Combine search, status, and priority filters; show and clear an empty result.
7. Move between task pages with query state in the URL.
8. Search projects and clear a no-result search.
9. Cancel destructive actions without changing records.
10. Dismiss an editor with Escape and restore focus to the opening button.
11. Simulate a failed storage write; retain the form draft and successfully retry.
12. Surface unreadable stored data, retry, and recover through confirmed sample restoration.
13. Show meaningful states for a missing project and an unknown route.

No browser page errors were recorded. A save/refresh timing issue found during the first browser run was corrected: editor dialogs now stay pending until the current workspace snapshot is ready. Filter controls were given exact accessible names. The full browser suite passed after both corrections.

## Responsiveness
All three views were checked at each width below: **12 view-width combinations passed**, with document width matching viewport width and no horizontal page scrolling.

| Width | Layout observation | Views checked |
| --- | --- | --- |
| 320 px | Top navigation, single project column, wrapped task actions, narrow forms | Landing, dashboard, project |
| 390 px | Phone layout with readable stacked cards and task controls | Landing, dashboard, project |
| 768 px | Top navigation and a two-column project grid | Landing, dashboard, project |
| 1440 px | Sidebar, three project cards, full task workspace | Landing, dashboard, project |

The six full-page desktop/phone screenshots in `evidence/` were captured by the browser suite and visually inspected. The implementation wireframe is in `design/`.

## Reproduce
Run the app in one terminal, then in another terminal inside `week-2`:

```sh
pnpm test
pnpm exec playwright install chromium
pnpm browser:test
```

The browser test opens an isolated profile, exercises demo data, and updates screenshots/results in `evidence/`. It does not alter data in your regular browser. If Vite uses another port, set `TASKNEST_BASE_URL` to the Local URL before the browser test. An optional `TASKNEST_BROWSER_EXECUTABLE` can select an installed Chromium browser.

## Limits
Tests use simulated screen sizes in one Chromium engine; no physical-device or multi-engine certification is claimed. API tests use controlled HTTP responses, not a live server. Production authentication, authorization, PostgreSQL, and backend integration are outside this Week 2 frontend submission. Accessibility features were exercised, but no formal accessibility audit was performed.

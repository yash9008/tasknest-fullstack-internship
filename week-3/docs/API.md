# TaskNest API reference

Version 1 · Base URL `http://127.0.0.1:8033/api/v1`

## Conventions and authentication

All bodies and nonempty responses use JSON. Send `Content-Type: application/json` for POST/PATCH bodies. The body limit is 16 KB. Login and registration use an anonymous session first. All POST/PATCH/DELETE requests require:

```http
Origin: http://127.0.0.1:8033
X-CSRF-Token: <latest data.csrfToken>
Cookie: tasknest_session=<latest opaque session token>
```

The exact origin is configured by `APP_ORIGIN`. Cross-origin browser requests are not enabled. A missing or different Origin returns 403. Fetch clients must retain cookies. Bootstrap uses a 15-minute anonymous session; login/registration replace it with a 7-day authenticated session and rotate the CSRF token. Logout returns 204 and clears the cookie. Bootstrap again after logout or expiry. Cookie attributes: HttpOnly, Path=/, SameSite=Lax, plus Secure in production.

Resources use `{ "data": { ... } }`. Lists use `{ "data": [], "pagination": { "page": 1, "limit": 20, "total": 0 } }`. Dates/times are UTC ISO strings. IDs are UUIDs. No passwords, password hashes, owner identifiers or session hashes appear in resource responses. `Location` is supplied on project/task creation.

## Endpoint summary

Every path below is relative to `/api/v1`. “Private” means an authenticated session. All mutations additionally require the CSRF and Origin headers above.

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| GET | `/health` | Public | 200 health and engine name |
| GET | `/auth/session` | Public bootstrap | 200 user or null, CSRF token |
| POST | `/auth/register` | Anonymous or signed in | 201 user, rotated CSRF, new cookie |
| POST | `/auth/login` | Anonymous or signed in | 200 user, rotated CSRF, new cookie |
| POST | `/auth/logout` | Private | 204 empty body, expired cookie |
| GET | `/dashboard` | Private | 200 counts |
| GET | `/projects` | Private | 200 paginated projects |
| POST | `/projects` | Private | 201 project |
| GET | `/projects/{id}` | Private owner | 200 project |
| PATCH | `/projects/{id}` | Private owner | 200 updated project |
| DELETE | `/projects/{id}` | Private owner | 204; tasks cascade |
| GET | `/projects/{id}/tasks` | Private owner | 200 paginated filtered tasks |
| POST | `/projects/{id}/tasks` | Private owner | 201 task |
| GET | `/tasks/{id}` | Private owner | 200 task |
| PATCH | `/tasks/{id}` | Private owner | 200 updated task |
| DELETE | `/tasks/{id}` | Private owner | 204 empty body |

## Accounts and sessions

`GET /health` executes a database query. Response: `{"data":{"status":"ok","database":"pglite"}}`. The separate server adapter reports `postgresql`.

`GET /auth/session` sets a cookie when there is no valid session. Anonymous response: `{"data":{"user":null,"csrfToken":"<64 lowercase hex characters>"}}`. Signed-in response replaces null with `{id,name,email}`. This endpoint does not extend expiry on every read.

`POST /auth/register` body:

```json
{"name":"Yash Sawant","email":"yash@example.test","password":"Choose a long passphrase!"}
```

Name: trimmed, 1–80 characters. Email: trimmed, lowercased, validated, max 254 characters, unique. Password: 12–128 characters, spaces preserved. Extra fields are rejected. Response 201: `{"data":{"user":{"id":"<uuid>","name":"Yash Sawant","email":"yash@example.test"},"csrfToken":"<rotated token>"}}`, plus a new session cookie. Duplicate email returns 409. Credentials shown here are illustrative, not a seeded account.

`POST /auth/login` accepts only `{email,password}` with the same validation. Response 200 has the same shape as registration. Unknown email and incorrect password return the same 401 message. Authentication invalidates the previous session presented by that client; other independently signed-in sessions remain valid.

`POST /auth/logout` needs no body. Response 204 has no JSON. Reusing its former cookie cannot authenticate.

## Projects

`POST /projects` requires `name` (trimmed, 1–80), with optional `description` (trimmed, 0–2000). Default description is an empty string. Unknown fields are rejected, so clients cannot assign an owner.

```json
{"name":"Portfolio launch","description":"Prepare and review the release"}
```

Project response (`GET`, `POST`, `PATCH`):

```json
{"data":{"id":"a579994e-f916-49ae-b252-88ef880b24cc","name":"Portfolio launch","description":"Prepare and review the release","createdAt":"2026-10-20T12:00:00.000Z","updatedAt":"2026-10-20T12:00:00.000Z"}}
```

`GET /projects?page=1&limit=20` lists only the current user's projects, ordered by created time descending then UUID descending. Page: integer 1–1,000,000. Limit: 1–100. Defaults: 1 and 20. Empty pages retain the total count. Unknown or repeated query keys return 400.

`PATCH /projects/{id}` accepts one or both of `name`, `description`; at least one editable field is required. Unspecified fields are preserved. `DELETE /projects/{id}` deletes its tasks in the database using a cascading foreign key. Missing projects and projects owned by another user both return 404.

## Tasks

`POST /projects/{id}/tasks` requires `title`; other fields are optional.

| Field | Validation | Default |
| --- | --- | --- |
| title | trimmed string, 1–200 characters | Required |
| description | trimmed string, 0–2000 characters | Empty string |
| status | `todo`, `in_progress`, `done` | `todo` |
| priority | `low`, `normal`, `high` | `normal` |
| dueDate | valid calendar `YYYY-MM-DD` year 0001–9999, null or empty string | No date |

```json
{"title":"Review responsive layout","description":"Check tablet navigation","status":"todo","priority":"high","dueDate":"2026-10-31"}
```

Task response:

```json
{"data":{"id":"64dcd022-459e-42e2-8e15-4b23919da6e7","projectId":"a579994e-f916-49ae-b252-88ef880b24cc","title":"Review responsive layout","description":"Check tablet navigation","status":"todo","priority":"high","dueDate":"2026-10-31","createdAt":"2026-10-20T12:00:00.000Z","updatedAt":"2026-10-20T12:00:00.000Z"}}
```

No due date is represented as `"dueDate":""` in responses, matching the frontend contract. `GET /tasks/{id}` returns a single owned task. `PATCH /tasks/{id}` accepts any nonempty subset of the five editable fields above. Setting dueDate to null or an empty string clears it. Moving a task to another project is not supported. `DELETE /tasks/{id}` returns 204. Ownership is derived through the task's project on every request.

`GET /projects/{id}/tasks?q=review&status=todo&priority=high&page=1&limit=20` supports combined optional filters. `q` is a trimmed case-insensitive literal substring of the title, max 200 characters; an empty search matches all tasks. SQL wildcard characters are treated literally. Status and priority accept their exact lowercase values. Pagination and sorting follow the project list rules. Totals are computed **after filtering**. Unknown/repeated query keys return 400.

## Dashboard

`GET /dashboard` returns only the current user's counts:

```json
{"data":{"projects":1,"tasks":3,"todo":1,"inProgress":1,"done":1,"overdue":1}}
```

Overdue means a noncompleted task with a due date strictly before the current UTC date. A task due today is not overdue. Tasks without a date and completed tasks do not count as overdue.

## Errors and throttling

```json
{"error":{"code":"VALIDATION_ERROR","message":"Please check the supplied fields.","fields":{"title":"Use 1 to 200 characters."},"requestId":"<request uuid>"}}
```

`fields` appears only for validation errors. All responses include `X-Request-ID` and `Cache-Control: no-store`. A bodyless 204 has no envelope.

| HTTP | Codes and meanings |
| --- | --- |
| 400 | `VALIDATION_ERROR` (fields, UUIDs, query), `INVALID_JSON` |
| 401 | `AUTH_REQUIRED` (no valid authenticated session), `INVALID_CREDENTIALS` |
| 403 | `CSRF_INVALID`, `ORIGIN_REJECTED` |
| 404 | `NOT_FOUND` (missing resource, another user's resource, or unknown signed-in route) |
| 409 | `EMAIL_EXISTS` |
| 413 | `BODY_TOO_LARGE` |
| 415 | `UNSUPPORTED_MEDIA_TYPE` |
| 429 | `RATE_LIMITED`; use `Retry-After`/RateLimit headers |
| 500 | `INTERNAL_ERROR`; no stack or database details returned |

Limits per 15 minutes: 300 API requests per IP; 30 session bootstrap requests per IP; registration and login together 20 per IP and 10 per normalized-email digest. In-memory stores are per application process. Validation errors count. The server intentionally does not trust client-supplied forwarding headers. Deployments behind proxies need an explicit trusted-proxy configuration.

For the complete working request sequence, run `pnpm smoke` while the API is running or read `scripts/smoke.js`. The OpenAPI specification in this folder describes the same paths and schemas.

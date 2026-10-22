import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openDatabase, postgresTypes } from '../src/database.js';
import { digest } from '../src/auth.js';
import { loadConfig } from '../src/config.js';
import { serve, Client, password } from './client.js';
let db, api, alice, bob, aliceId, bobId;
const project = async (client = alice, name = 'API test project') => {
  const r = await client.request('/projects', { method: 'POST', body: { name } });
  assert.equal(r.status, 201, r.text); return r.json.data;
};
const task = async (id, data = {}, client = alice) => {
  const r = await client.request(`/projects/${id}/tasks`, { method: 'POST', body: { title: 'Implement API', ...data } });
  assert.equal(r.status, 201, r.text); return r.json.data;
};
before(async () => {
  db = await openDatabase({ dataDir: 'memory://' }); api = await serve(db); alice = api.client(); bob = api.client();
  const a = await alice.register(' Alice@Example.test ', 'Alice'), b = await bob.register('bob@example.test', 'Bob');
  assert.equal(a.status, 201, a.text); assert.equal(b.status, 201, b.text);
  aliceId = a.json.data.user.id; bobId = b.json.data.user.id;
});
after(async () => { await api?.stop(); await db?.close(); });
test('health uses real SQL and protective headers', async () => {
  const r = await api.client().request('/health'); assert.equal(r.status, 200); assert.equal(r.json.data.database, 'pglite');
  assert.equal(r.headers.get('cache-control'), 'no-store'); assert.ok(r.headers.get('content-security-policy'));
  assert.ok(r.headers.get('x-request-id')); assert.equal(r.headers.get('x-powered-by'), null);
});
test('anonymous bootstrap sets HttpOnly SameSite cookie and CSRF token', async () => {
  const c = api.client(), r = await c.request('/auth/session'); assert.equal(r.status, 200); assert.equal(r.json.data.user, null);
  assert.match(c.csrf, /^[a-f0-9]{64}$/); assert.match(r.headers.get('set-cookie'), /HttpOnly/); assert.match(r.headers.get('set-cookie'), /SameSite=Lax/);
  assert.equal((await c.request('/auth/session')).json.data.csrfToken, c.csrf);
});
test('login rotates session and CSRF while passwords and tokens are hashed at rest', async () => {
  const c = api.client(); await c.request('/auth/session'); const oldCookie = c.cookie, oldCsrf = c.csrf;
  const r = await c.request('/auth/login', { method: 'POST', body: { email: 'ALICE@example.test', password } });
  assert.equal(r.status, 200, r.text); assert.notEqual(c.cookie, oldCookie); assert.notEqual(c.csrf, oldCsrf);
  assert.equal((await db.query('SELECT * FROM sessions WHERE token_hash=$1', [digest(oldCookie.split('=')[1])])).rows.length, 0);
  const u = (await db.query('SELECT * FROM users WHERE id=$1', [aliceId])).rows[0];
  assert.match(u.password_hash, /^\$argon2id\$/); assert.equal(u.email, 'alice@example.test'); assert.equal(JSON.stringify(r.json).includes('password'), false);
  assert.equal((await db.query('SELECT * FROM sessions WHERE token_hash=$1', [digest(c.cookie.split('=')[1])])).rows[0].user_id, aliceId);
});
test('duplicate normalized email returns 409 without duplicating account', async () => {
  const r = await api.client().register('ALICE@EXAMPLE.TEST'); assert.equal(r.status, 409); assert.equal(r.json.error.code, 'EMAIL_EXISTS');
  assert.equal((await db.query('SELECT count(*)::int AS n FROM users WHERE email=$1', ['alice@example.test'])).rows[0].n, 1);
});
test('wrong password and unknown account have the same generic 401', async () => {
  const c = api.client(); await c.request('/auth/session');
  for (const email of ['alice@example.test', 'unknown@example.test']) {
    const r = await c.request('/auth/login', { method: 'POST', body: { email, password: 'Incorrect passphrase!' } });
    assert.equal(r.status, 401); assert.equal(r.json.error.code, 'INVALID_CREDENTIALS');
  }
});
test('anonymous and missing sessions cannot access private endpoints', async () => {
  const c = api.client(); assert.equal((await c.request('/projects')).status, 401);
  await c.request('/auth/session'); assert.equal((await c.request('/dashboard')).status, 401);
});
test('mutation rejects missing CSRF and a foreign or missing Origin', async () => {
  for (const headers of [{ 'X-CSRF-Token': '' }, { Origin: 'https://foreign.example' }, { Origin: '' }])
    assert.equal((await alice.request('/projects', { method: 'POST', body: { name: 'Rejected' }, headers })).status, 403);
});
test('registration validates required fields, email, lengths and unknown keys', async () => {
  const c = api.client(); await c.request('/auth/session'); const valid = { name: 'Person', email: 'other@example.test', password };
  for (const body of [null, [], {}, { ...valid, name: ' ' }, { ...valid, name: 'x'.repeat(81) }, { ...valid, email: 'broken' },
    { ...valid, password: 'short' }, { ...valid, password: 'x'.repeat(129) }, { ...valid, role: 'admin' }])
    assert.equal((await c.request('/auth/register', { method: 'POST', body })).status, 400);
});
test('project CRUD trims input and preserves unspecified fields', async () => {
  const p = await project(alice, '  Launch plan  '); assert.equal(p.name, 'Launch plan'); assert.equal(p.description, '');
  assert.equal((await alice.request(`/projects/${p.id}`)).json.data.name, 'Launch plan');
  const r = await alice.request(`/projects/${p.id}`, { method: 'PATCH', body: { description: 'Release checklist' } });
  assert.equal(r.status, 200); assert.equal(r.json.data.name, p.name); assert.equal(r.json.data.description, 'Release checklist');
  const del = await alice.request(`/projects/${p.id}`, { method: 'DELETE' }); assert.equal(del.status, 204); assert.equal(del.text, '');
  assert.equal((await alice.request(`/projects/${p.id}`)).status, 404);
});
test('task CRUD supports defaults, updates and clearing the due date', async () => {
  const p = await project(), t = await task(p.id, { dueDate: '2028-02-29' });
  assert.equal(t.projectId, p.id); assert.equal(t.status, 'todo'); assert.equal(t.priority, 'normal'); assert.equal(t.dueDate, '2028-02-29');
  assert.equal((await alice.request(`/tasks/${t.id}`)).status, 200);
  const r = await alice.request(`/tasks/${t.id}`, { method: 'PATCH', body: { status: 'in_progress', dueDate: null } });
  assert.equal(r.status, 200); assert.equal(r.json.data.title, t.title); assert.equal(r.json.data.dueDate, '');
  assert.equal((await alice.request(`/tasks/${t.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await alice.request(`/tasks/${t.id}`)).status, 404);
});
test('all project and task operations independently enforce ownership', async () => {
  const p = await project(), t = await task(p.id);
  for (const [path, opts] of [[`/projects/${p.id}`, {}], [`/projects/${p.id}`, { method: 'PATCH', body: { name: 'Stolen' } }],
    [`/projects/${p.id}`, { method: 'DELETE' }], [`/projects/${p.id}/tasks`, {}], [`/projects/${p.id}/tasks`, { method: 'POST', body: { title: 'Injected' } }],
    [`/tasks/${t.id}`, {}], [`/tasks/${t.id}`, { method: 'PATCH', body: { title: 'Stolen' } }], [`/tasks/${t.id}`, { method: 'DELETE' }]])
    assert.equal((await bob.request(path, opts)).status, 404, path);
  assert.ok((await bob.request('/projects')).json.data.every(item => item.id !== p.id));
  assert.equal((await alice.request(`/tasks/${t.id}`)).json.data.title, t.title);
});
test('search, status and priority filters combine with accurate totals', async () => {
  const p = await project(); await task(p.id, { title: 'API Alpha', status: 'in_progress', priority: 'high' });
  await task(p.id, { title: 'API Beta', status: 'done', priority: 'high' }); await task(p.id, { title: 'Design', priority: 'low' });
  const r = await alice.request(`/projects/${p.id}/tasks?q=api&status=in_progress&priority=high`);
  assert.equal(r.status, 200); assert.equal(r.json.pagination.total, 1); assert.equal(r.json.data[0].title, 'API Alpha');
  assert.equal((await alice.request(`/projects/${p.id}/tasks?q=missing`)).json.pagination.total, 0);
});
test('pagination is stable, disjoint and retains totals on empty pages', async () => {
  const p = await project(); for (let i = 0; i < 3; i++) await task(p.id, { title: `Task ${i}` });
  const a = (await alice.request(`/projects/${p.id}/tasks?page=1&limit=2`)).json, b = (await alice.request(`/projects/${p.id}/tasks?page=2&limit=2`)).json;
  assert.equal(a.pagination.total, 3); assert.equal(a.data.length, 2); assert.equal(b.data.length, 1); assert.equal(new Set([...a.data, ...b.data].map(t => t.id)).size, 3);
  const empty = (await alice.request(`/projects/${p.id}/tasks?page=99&limit=2`)).json; assert.deepEqual(empty.data, []); assert.equal(empty.pagination.total, 3);
  const list = await alice.request('/projects?page=1&limit=1'); assert.equal(list.json.data.length, 1); assert.ok(list.json.pagination.total > 1);
});
test('invalid UUIDs, pagination, repeated parameters and filter values return 400', async () => {
  const p = await project();
  for (const path of ['/projects/nope', '/tasks/nope', '/projects?page=0', '/projects?limit=101', '/projects?limit=2&limit=3', '/projects?page=1.5',
    '/projects?extra=1', `/projects/${p.id}/tasks?status=invalid`, `/projects/${p.id}/tasks?priority=urgent`]) assert.equal((await alice.request(path)).status, 400, path);
});
test('field whitelists reject mass assignment, oversized strings and impossible dates', async () => {
  const p = await project(), t = await task(p.id);
  for (const data of [{ title: ' ' }, { title: 'x'.repeat(201) }, { dueDate: '2026-02-29' }, { dueDate: '0000-01-01' }, { dueDate: '20/10/2026' },
    { description: 'x'.repeat(2001) }, { projectId: randomUUID() }, { status: 'archived' }, {}])
    assert.equal((await alice.request(`/tasks/${t.id}`, { method: 'PATCH', body: data })).status, 400);
  for (const data of [{ owner_id: bobId }, { name: 'x'.repeat(81) }, { description: null }])
    assert.equal((await alice.request(`/projects/${p.id}`, { method: 'PATCH', body: data })).status, 400);
});
test('SQL metacharacters and wildcard characters remain literal data', async () => {
  const p = await project(), title = "Quote ' OR 1=1; -- literal %"; await task(p.id, { title });
  const r = await alice.request(`/projects/${p.id}/tasks?q=${encodeURIComponent("' OR 1=1;")}`);
  assert.equal(r.status, 200); assert.equal(r.json.pagination.total, 1); assert.equal(r.json.data[0].title, title);
  assert.equal((await alice.request(`/projects/${p.id}/tasks?q=${encodeURIComponent('%')}`)).json.pagination.total, 1);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM users')).rows[0].n, 2);
});
test('dashboard isolates owners and excludes completed tasks from overdue', async () => {
  const before = (await bob.request('/dashboard')).json.data, p = await project(bob);
  await task(p.id, { dueDate: '2000-01-01' }, bob); await task(p.id, { dueDate: '2000-01-01', status: 'done' }, bob); await task(p.id, { status: 'in_progress' }, bob);
  const r = (await bob.request('/dashboard')).json.data;
  for (const [key, delta] of Object.entries({ projects: 1, tasks: 3, todo: 1, done: 1, inProgress: 1, overdue: 1 })) assert.equal(r[key], before[key] + delta);
});
test('project deletion cascades tasks atomically', async () => {
  const p = await project(), t = await task(p.id); assert.equal((await alice.request(`/projects/${p.id}`, { method: 'DELETE' })).status, 204);
  assert.equal((await alice.request(`/tasks/${t.id}`)).status, 404); assert.equal((await db.query('SELECT * FROM tasks WHERE project_id=$1', [p.id])).rows.length, 0);
});
test('failed transactions roll back and foreign keys reject orphan tasks', async () => {
  const id = randomUUID(); await assert.rejects(db.transaction(async tx => {
    await tx.query('INSERT INTO projects(id,owner_id,name) VALUES($1,$2,$3)', [id, aliceId, 'Rollback']); throw new Error('Simulated interruption');
  })); assert.equal((await db.query('SELECT * FROM projects WHERE id=$1', [id])).rows.length, 0);
  await assert.rejects(db.query('INSERT INTO tasks(id,project_id,title) VALUES($1,$2,$3)', [randomUUID(), randomUUID(), 'Orphan']), e => e.code === '23503');
});
test('malformed JSON, oversized requests and wrong media types return JSON errors', async () => {
  const bad = await alice.request('/projects', { method: 'POST', raw: '{"name":' }); assert.equal(bad.status, 400); assert.equal(bad.json.error.code, 'INVALID_JSON');
  assert.equal((await alice.request('/projects', { method: 'POST', body: { name: 'x'.repeat(18000) } })).status, 413);
  assert.equal((await alice.request('/projects', { method: 'POST', raw: 'name=Hello', headers: { 'Content-Type': 'text/plain' } })).status, 415);
});
test('expired sessions lose access and bootstrap cleans expired records', async () => {
  const c = api.client(); await c.request('/auth/session'); await c.request('/auth/login', { method: 'POST', body: { email: 'alice@example.test', password } });
  const old = digest(c.cookie.split('=')[1]); await db.query("UPDATE sessions SET created_at=now()-interval '2 days',expires_at=now()-interval '1 day' WHERE token_hash=$1", [old]);
  assert.equal((await c.request('/projects')).status, 401); assert.equal((await c.request('/auth/session')).json.data.user, null);
  assert.equal((await db.query('SELECT * FROM sessions WHERE token_hash=$1', [old])).rows.length, 0);
});
test('logout invalidates saved tokens and clears cookie', async () => {
  const c = api.client(); await c.request('/auth/session'); await c.request('/auth/login', { method: 'POST', body: { email: 'alice@example.test', password } });
  const cookie = c.cookie, csrf = c.csrf, r = await c.request('/auth/logout', { method: 'POST' }); assert.equal(r.status, 204); assert.match(r.headers.get('set-cookie'), /Max-Age=0/);
  const replay = new Client(api.base, api.config.appOrigin); replay.cookie = cookie; replay.csrf = csrf; assert.equal((await replay.request('/projects')).status, 401);
});
test('production requires HTTPS and Secure cookies', async () => {
  assert.throws(() => loadConfig({ NODE_ENV: 'production' }), /HTTPS/); assert.throws(() => loadConfig({ APP_ORIGIN: 'https://example.test/' }), /exact/);
  assert.throws(() => loadConfig({ PORT: 'invalid' }), /PORT/);
  assert.equal(postgresTypes.getTypeParser(1082, 'text')('2026-10-31'), '2026-10-31');
  assert.equal(postgresTypes.getTypeParser(23, 'text')('5'), 5);
  const secure = await serve(db, { secureCookies: true, appOrigin: 'https://example.test' });
  try { assert.match((await secure.client().request('/auth/session')).headers.get('set-cookie'), /Secure/); } finally { await secure.stop(); }
});
test('IP rate limiting returns 429 and Retry-After', async () => {
  const limited = await serve(db, { rateLimit: 2 }); try {
    const c = limited.client(); assert.equal((await c.request('/health')).status, 200); assert.equal((await c.request('/health')).status, 200);
    const r = await c.request('/health'); assert.equal(r.status, 429); assert.equal(r.json.error.code, 'RATE_LIMITED'); assert.ok(r.headers.get('retry-after'));
  } finally { await limited.stop(); }
});
test('unexpected errors and logs do not expose SQL or credentials', async () => {
  const logged = [], broken = await serve({ kind: 'test', query: async () => { throw new Error('password=never-expose SQL detail'); } }, {}, v => logged.push(v));
  try { const r = await broken.client().request('/health'); assert.equal(r.status, 500); assert.equal(r.json.error.code, 'INTERNAL_ERROR');
    assert.equal(r.text.includes('never-expose'), false); assert.equal(JSON.stringify(logged).includes('never-expose'), false);
  } finally { await broken.stop(); }
});
test('file-backed PostgreSQL preserves account, session and task across restart', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tasknest-persistence-')); let disk, service;
  try {
    disk = await openDatabase({ dataDir: dir }); service = await serve(disk); const c = service.client(); assert.equal((await c.register('persistent@example.test')).status, 201);
    const p = await project(c, 'Persist me'), t = await task(p.id, { dueDate: '2026-10-31' }, c), cookie = c.cookie;
    await service.stop(); service = null; await disk.close(); disk = null;
    disk = await openDatabase({ dataDir: dir }); service = await serve(disk); const restored = service.client(); restored.cookie = cookie;
    const r = await restored.request(`/tasks/${t.id}`); assert.equal(r.status, 200); assert.equal(r.json.data.title, t.title); assert.equal(r.json.data.dueDate, '2026-10-31');
    assert.equal((await restored.request('/auth/session')).json.data.user.email, 'persistent@example.test'); assert.deepEqual((await disk.query('SELECT version FROM schema_migrations')).rows, [{ version: 1 }]);
  } finally { await service?.stop(); await disk?.close(); await rm(dir, { recursive: true, force: true }); }
});
test('authentication has an additional account-based throttle', async () => {
  const limited = await serve(db, { accountRateLimit: 2 });
  try {
    const c = limited.client(); await c.request('/auth/session');
    const attempt = () => c.request('/auth/login', { method: 'POST', body: { email: 'alice@example.test', password: 'Incorrect passphrase!' } });
    assert.equal((await attempt()).status, 401); assert.equal((await attempt()).status, 401); assert.equal((await attempt()).status, 429);
  } finally { await limited.stop(); }
});
test('anonymous session creation is independently throttled', async () => {
  const limited = await serve(db, { bootstrapRateLimit: 2 });
  try {
    assert.equal((await limited.client().request('/auth/session')).status, 200);
    assert.equal((await limited.client().request('/auth/session')).status, 200);
    assert.equal((await limited.client().request('/auth/session')).status, 429);
  } finally { await limited.stop(); }
});
test('concurrent partial updates preserve both changed fields', async () => {
  const p = await project(), t = await task(p.id);
  const responses = await Promise.all([
    alice.request(`/tasks/${t.id}`, { method: 'PATCH', body: { status: 'done' } }),
    alice.request(`/tasks/${t.id}`, { method: 'PATCH', body: { priority: 'high' } }),
  ]);
  assert.ok(responses.every(r => r.status === 200));
  const data = (await alice.request(`/tasks/${t.id}`)).json.data;
  assert.equal(data.status, 'done'); assert.equal(data.priority, 'high');
});
test('missing resources and unknown routes return the standard 404 envelope', async () => {
  for (const path of [`/projects/${randomUUID()}`, `/tasks/${randomUUID()}`, '/missing']) {
    const r = await alice.request(path); assert.equal(r.status, 404); assert.equal(r.json.error.code, 'NOT_FOUND'); assert.ok(r.json.error.requestId);
  }
});

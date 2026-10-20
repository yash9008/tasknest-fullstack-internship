/** Live-server walkthrough. Synthetic account remains; the sample project is deleted. */
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
const base = (process.env.API_URL || 'http://127.0.0.1:8033').replace(/\/$/, '');
const origin = process.env.APP_ORIGIN || new URL(base).origin;
const email = `smoke-${randomBytes(6).toString('hex')}@example.test`;
const password = randomBytes(24).toString('base64url');
let cookie = '', csrf = '', requests = 0;
async function request(path, method = 'GET', body, expected = 200) {
  const response = await fetch(`${base}/api/v1${path}`, { method, headers: {
    ...(cookie ? { Cookie: cookie } : {}),
    ...(method !== 'GET' ? { Origin: origin, 'X-CSRF-Token': csrf } : {}),
    ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  requests++;
  for (const value of response.headers.getSetCookie()) cookie = value.split(';')[0];
  const text = await response.text(), json = text ? JSON.parse(text) : null;
  assert.equal(response.status, expected, `${method} ${path}: ${text}`);
  if (json?.data?.csrfToken) csrf = json.data.csrfToken;
  console.log(`${response.status} ${method} ${path}`);
  return json?.data;
}
await request('/health'); await request('/auth/session');
await request('/auth/register', 'POST', { name: 'API smoke test', email, password }, 201);
await request('/auth/logout', 'POST', undefined, 204);
await request('/auth/session'); await request('/auth/login', 'POST', { email, password });
const project = await request('/projects', 'POST', { name: 'Week 3 smoke walkthrough' }, 201);
await request('/projects'); await request(`/projects/${project.id}`);
await request(`/projects/${project.id}`, 'PATCH', { description: 'Synthetic verification data' });
const task = await request(`/projects/${project.id}/tasks`, 'POST', { title: 'Verify API', priority: 'high' }, 201);
await request(`/projects/${project.id}/tasks?status=todo&priority=high`); await request(`/tasks/${task.id}`);
await request(`/tasks/${task.id}`, 'PATCH', { status: 'done' }); await request('/dashboard');
await request(`/tasks/${task.id}`, 'DELETE', undefined, 204);
await request(`/projects/${project.id}`, 'DELETE', undefined, 204);
await request('/auth/logout', 'POST', undefined, 204);
console.log(`PASS: ${requests} HTTP requests; all 16 endpoint and method combinations exercised.`);
console.log('Sample project deleted. One randomly named synthetic account remains in this local database.');

import { once } from 'node:events';
import { createApp } from '../src/app.js';
import { loadConfig } from '../src/config.js';
export const password = 'Week3 example passphrase!';
export async function serve(db, overrides = {}, logError = () => {}) {
  const config = { ...loadConfig({}), rateLimit: 5000, authRateLimit: 500, accountRateLimit: 500, bootstrapRateLimit: 500, ...overrides };
  const server = createApp(db, config, logError).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, config, client: () => new Client(base, config.appOrigin),
    stop: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
export class Client {
  constructor(base, origin) { this.base = base; this.origin = origin; this.cookie = ''; this.csrf = ''; }
  async request(path, { method = 'GET', body, headers = {}, raw } = {}) {
    const response = await fetch(`${this.base}/api/v1${path}`, { method, headers: {
      ...(this.cookie ? { Cookie: this.cookie } : {}),
      ...(!['GET', 'HEAD'].includes(method) ? { Origin: this.origin, 'X-CSRF-Token': this.csrf } : {}),
      ...(body !== undefined || raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : raw !== undefined ? { body: raw } : {}) });
    for (const value of response.headers.getSetCookie()) this.cookie = value.split(';')[0];
    const text = await response.text(), json = text ? JSON.parse(text) : null;
    if (json?.data?.csrfToken) this.csrf = json.data.csrfToken;
    return { status: response.status, headers: response.headers, json, text };
  }
  async register(email, name = 'Test User') {
    await this.request('/auth/session');
    return this.request('/auth/register', { method: 'POST', body: { name, email, password } });
  }
}

import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { randomUUID } from 'node:crypto';
import { ApiError, errorHandler, notFound } from './errors.js';
import { body, query, uuid } from './validation.js';
import { digest, hashPassword, verifyPassword, loadSession, newSession, sessionCookie,
  publicUser, requireUser, protectMutation } from './auth.js';
import { repository, projectJSON, taskJSON } from './repository.js';

/** App construction is separate from listening so tests use the same real routes. */
export function createApp(db, config, logError = entry => console.error(JSON.stringify(entry))) {
  const app = express(), store = repository(db);
  app.disable('x-powered-by');
  app.set('query parser', 'simple');
  app.locals.logError = logError;
  app.use((req, res, next) => { req.id = randomUUID(); res.set('X-Request-ID', req.id); res.set('Cache-Control', 'no-store'); next(); });
  app.use(helmet());
  const limiter = (limit, keyGenerator) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: 'draft-8',
    legacyHeaders: false, ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many requests. Try again after the indicated reset.')) });
  app.use('/api', limiter(config.rateLimit));
  app.use((req, res, next) => {
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.path !== '/api/v1/auth/logout' && !req.is('application/json')) {
      throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use Content-Type: application/json.');
    }
    next();
  });
  app.use(express.json({ limit: '16kb', strict: false, inflate: false }));
  app.get('/api/v1/health', async (req, res) => { await db.query('SELECT 1'); res.json({ data: { status: 'ok', database: db.kind } }); });
  app.use('/api/v1', loadSession(db));
  app.get('/api/v1/auth/session', limiter(config.bootstrapRateLimit), async (req, res) => {
    if (req.session) return res.json({ data: { user: req.session.user_id ? publicUser(req.session) : null, csrfToken: req.session.csrf_token } });
    const session = await db.transaction(async tx => {
      await tx.query('DELETE FROM sessions WHERE expires_at <= now()');
      return newSession(tx, null);
    });
    sessionCookie(res, session.token, config, session.maxAge);
    res.json({ data: { user: null, csrfToken: session.csrfToken } });
  });
  app.use('/api/v1', protectMutation(config));
  const authLimit = limiter(config.authRateLimit), accountLimit = limiter(config.accountRateLimit,
    req => digest(typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : 'invalid'));
  app.post('/api/v1/auth/register', authLimit, accountLimit, async (req, res) => {
    const data = body(req.body, 'register'), passwordHash = await hashPassword(data.password);
    const result = await db.transaction(async tx => {
      const { rows } = await tx.query('INSERT INTO users(id,name,email,password_hash) VALUES($1,$2,$3,$4) RETURNING id,name,email',
        [randomUUID(), data.name, data.email, passwordHash]);
      return { user: publicUser(rows[0]), session: await newSession(tx, rows[0].id, req.session.token_hash) };
    });
    sessionCookie(res, result.session.token, config, result.session.maxAge);
    res.status(201).json({ data: { user: result.user, csrfToken: result.session.csrfToken } });
  });
  app.post('/api/v1/auth/login', authLimit, accountLimit, async (req, res) => {
    const data = body(req.body, 'login');
    const { rows } = await db.query('SELECT id,name,email,password_hash FROM users WHERE email=$1', [data.email]);
    const matches = await verifyPassword(rows[0]?.password_hash, data.password);
    if (!rows[0] || !matches) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    const session = await db.transaction(tx => newSession(tx, rows[0].id, req.session.token_hash));
    sessionCookie(res, session.token, config, session.maxAge);
    res.json({ data: { user: publicUser(rows[0]), csrfToken: session.csrfToken } });
  });
  app.post('/api/v1/auth/logout', requireUser, async (req, res) => {
    await db.query('DELETE FROM sessions WHERE token_hash=$1', [req.session.token_hash]);
    sessionCookie(res, '', config, 0);
    res.status(204).end();
  });
  app.use('/api/v1', requireUser);
  app.get('/api/v1/dashboard', async (req, res) => res.json({ data: await store.dashboard(req.session.user_id) }));
  app.get('/api/v1/projects', async (req, res) => res.json(await store.projects(req.session.user_id, query(req.query))));
  app.post('/api/v1/projects', async (req, res) => {
    const data = await store.createProject(req.session.user_id, body(req.body, 'project'));
    res.location(`/api/v1/projects/${data.id}`).status(201).json({ data });
  });
  app.get('/api/v1/projects/:id', async (req, res) => res.json({ data: projectJSON(await store.project(req.session.user_id, uuid(req.params.id))) }));
  app.patch('/api/v1/projects/:id', async (req, res) => res.json({ data: await store.updateProject(req.session.user_id, uuid(req.params.id), body(req.body, 'project', true)) }));
  app.delete('/api/v1/projects/:id', async (req, res) => { await store.deleteProject(req.session.user_id, uuid(req.params.id)); res.status(204).end(); });
  app.get('/api/v1/projects/:id/tasks', async (req, res) => res.json(await store.tasks(req.session.user_id, uuid(req.params.id), query(req.query, true))));
  app.post('/api/v1/projects/:id/tasks', async (req, res) => {
    const data = await store.createTask(req.session.user_id, uuid(req.params.id), body(req.body, 'task'));
    res.location(`/api/v1/tasks/${data.id}`).status(201).json({ data });
  });
  app.get('/api/v1/tasks/:id', async (req, res) => res.json({ data: taskJSON(await store.task(req.session.user_id, uuid(req.params.id))) }));
  app.patch('/api/v1/tasks/:id', async (req, res) => res.json({ data: await store.updateTask(req.session.user_id, uuid(req.params.id), body(req.body, 'task', true)) }));
  app.delete('/api/v1/tasks/:id', async (req, res) => { await store.deleteTask(req.session.user_id, uuid(req.params.id)); res.status(204).end(); });
  app.use((req, res, next) => next(notFound()));
  app.use(errorHandler);
  return app;
}

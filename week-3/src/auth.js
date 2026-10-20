import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { hash, verify, Algorithm } from '@node-rs/argon2';
import { ApiError } from './errors.js';

export const hashPassword = value => hash(value, { algorithm: Algorithm.Argon2id,
  memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 });
const dummyHash = hashPassword(randomBytes(32).toString('hex'));
export const verifyPassword = async (encoded, value) => verify(encoded || await dummyHash, value);
export const digest = token => createHash('sha256').update(token).digest('hex');
const cookieName = 'tasknest_session';
export function readToken(req) {
  const matches = (req.headers.cookie || '').split(';').map(v => v.trim()).filter(v => v.startsWith(`${cookieName}=`));
  if (matches.length !== 1) return null;
  const token = matches[0].slice(cookieName.length + 1);
  return /^[A-Za-z0-9_-]{43}$/.test(token) ? token : null;
}
export function sessionCookie(res, token, { secureCookies }, maxAge) {
  res.cookie(cookieName, token, { httpOnly: true, secure: secureCookies, sameSite: 'lax', path: '/', maxAge });
}
export async function newSession(tx, userId, oldHash) {
  const token = randomBytes(32).toString('base64url'), csrfToken = randomBytes(32).toString('hex');
  const maxAge = userId ? 7 * 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
  if (oldHash) await tx.query('DELETE FROM sessions WHERE token_hash = $1', [oldHash]);
  await tx.query('INSERT INTO sessions (token_hash, user_id, csrf_token, expires_at) VALUES ($1, $2, $3, $4)',
    [digest(token), userId, csrfToken, new Date(Date.now() + maxAge).toISOString()]);
  return { token, csrfToken, maxAge };
}
export function loadSession(db) {
  return async (req, res, next) => {
    const token = readToken(req);
    if (token) {
      const { rows } = await db.query(`SELECT s.token_hash, s.csrf_token, s.user_id,
        u.id, u.name, u.email FROM sessions s LEFT JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = $1 AND s.expires_at > now()`, [digest(token)]);
      req.session = rows[0] || null;
    }
    next();
  };
}
export function requireUser(req, res, next) {
  if (!req.session?.user_id) throw new ApiError(401, 'AUTH_REQUIRED', 'Sign in to access this resource.');
  next();
}
export function protectMutation(config) {
  return (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.headers.origin !== config.appOrigin) throw new ApiError(403, 'ORIGIN_REJECTED', 'The request origin is not allowed.');
    const token = req.get('X-CSRF-Token');
    if (!req.session || !token || !/^[a-f0-9]{64}$/.test(token)
      || !timingSafeEqual(Buffer.from(token), Buffer.from(req.session.csrf_token))) {
      throw new ApiError(403, 'CSRF_INVALID', 'Fetch a session and supply its current CSRF token.');
    }
    next();
  };
}
export const publicUser = row => ({ id: row.id, name: row.name, email: row.email });

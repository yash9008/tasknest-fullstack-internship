export function loadConfig(env = process.env) {
  const port = Number(env.PORT || 8034), production = env.NODE_ENV === 'production';
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be an integer from 1 to 65535');
  const appOrigin = env.APP_ORIGIN || `http://127.0.0.1:${port}`;
  const origin = new URL(appOrigin);
  if (origin.origin !== appOrigin || !['http:', 'https:'].includes(origin.protocol)) throw new Error('APP_ORIGIN must be an exact HTTP(S) origin without a trailing slash');
  if (production && origin.protocol !== 'https:') throw new Error('Production APP_ORIGIN must use HTTPS');
  return { port, host: env.HOST || '127.0.0.1', appOrigin, secureCookies: production,
    dataDir: env.DATA_DIR || './data/tasknest', databaseUrl: env.DATABASE_URL || '',
    rateLimit: 300, authRateLimit: 20, accountRateLimit: 10, bootstrapRateLimit: 30 };
}

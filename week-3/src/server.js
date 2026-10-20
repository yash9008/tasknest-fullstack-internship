import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadConfig } from './config.js';
import { openDatabase } from './database.js';
import { createApp } from './app.js';

const config = loadConfig();
if (!config.databaseUrl) await mkdir(resolve(config.dataDir), { recursive: true });
const db = await openDatabase(config);
const app = createApp(db, config);
const server = app.listen(config.port, config.host, () => {
  console.log(`TaskNest API listening at http://${config.host}:${config.port}/api/v1/health`);
  console.log(`Database: ${db.kind}; allowed Origin: ${config.appOrigin}`);
});
server.requestTimeout = 15000;
server.headersTimeout = 10000;
server.on('error', async error => { console.error(`Server failed: ${error.code || 'STARTUP_ERROR'}`); await db.close(); process.exitCode = 1; });
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => { await db.close(); clearTimeout(deadline); });
  server.closeIdleConnections();
}
process.on('SIGINT', stop);
process.on('SIGTERM', stop);

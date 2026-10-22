import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { openDatabase } from "../server/src/database.js";
import { createApp } from "../server/src/app.js";
import { loadConfig } from "../server/src/config.js";
export const root = fileURLToPath(new URL("../", import.meta.url));
export async function isolatedServer() {
  const dir = await mkdtemp(join(tmpdir(), "tasknest-week4-"));
  let db,
    server,
    port = 0;
  const config = {
    ...loadConfig({}),
    dataDir: join(dir, "database"),
    rateLimit: 5000,
    authRateLimit: 100,
    accountRateLimit: 100,
    bootstrapRateLimit: 100,
  };
  async function start() {
    db = await openDatabase(config);
    server = createApp(db, config, undefined, join(root, "dist")).listen(
      port,
      "127.0.0.1",
    );
    await once(server, "listening");
    port = server.address().port;
    config.appOrigin = `http://127.0.0.1:${port}`;
  }
  async function halt() {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
      server = null;
    }
    if (db) {
      await db.close();
      db = null;
    }
  }
  await start();
  return {
    get base() {
      return config.appOrigin;
    },
    get db() {
      return db;
    },
    async restart() {
      await halt();
      await start();
    },
    async stop() {
      await halt();
      await rm(dir, { recursive: true, force: true });
    },
  };
}

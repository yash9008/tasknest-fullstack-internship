import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const webPort = Number(process.env.DEV_WEB_PORT || 8034),
  apiPort = Number(process.env.DEV_API_PORT || 8033);
if (apiPort === webPort)
  throw new Error("DEV_API_PORT and DEV_WEB_PORT must differ.");
const env = {
  ...process.env,
  DEV_WEB_PORT: String(webPort),
  DEV_API_PORT: String(apiPort),
};
const children = [
  spawn(process.execPath, ["server/src/server.js"], {
    cwd: root,
    stdio: "inherit",
    env: {
      ...env,
      PORT: String(apiPort),
      APP_ORIGIN: `http://127.0.0.1:${webPort}`,
      API_ONLY: "1",
    },
  }),
  spawn(process.execPath, ["node_modules/vite/bin/vite.js"], {
    cwd: root,
    stdio: "inherit",
    env,
  }),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children)
    if (child.exitCode === null) child.kill("SIGTERM");
}
for (const child of children) {
  child.on("error", (error) => {
    console.error(error.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());

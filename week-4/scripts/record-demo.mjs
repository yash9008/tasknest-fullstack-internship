// Records the real built app against an isolated disk database; synthetic account only.
import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";
import { isolatedServer, root } from "./qa-server.mjs";
const app = await isolatedServer(),
  raw = path.join(root, "evidence/raw-video");
await fs.mkdir(raw, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  slowMo: 130,
  ...(process.env.TASKNEST_BROWSER
    ? { executablePath: process.env.TASKNEST_BROWSER }
    : {}),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: raw, size: { width: 1280, height: 800 } },
});
const page = await context.newPage(),
  video = page.video();
const password = "TaskNest demo passphrase!",
  email = "week4-demo@example.test";
const pause = () => page.waitForTimeout(1500);
async function chapter(text) {
  await page.evaluate((text) => {
    let el = document.getElementById("demo-caption");
    if (!el) {
      el = document.createElement("div");
      el.id = "demo-caption";
      el.style.cssText =
        "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 22px;background:#25232f;color:white;font:600 14px Arial;border-radius:8px;box-shadow:0 3px 18px #0003;pointer-events:none;max-width:90vw;text-align:center";
      document.body.append(el);
    }
    el.textContent = text;
  }, text);
}
try {
  await page.goto(app.base);
  await chapter("TaskNest · Week 4 · React + Express + PostgreSQL");
  await pause();
  await page
    .getByRole("link", { name: "Create your workspace", exact: false })
    .click();
  await chapter("01 / Create a real account");
  await page.getByLabel("Your name").fill("Yash Demo");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await pause();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Make room for what matters.", exact: true })
    .waitFor();
  await pause();
  await chapter("02 / Save a project through the backend API");
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill("Ship my portfolio");
  await page
    .getByLabel("Description", { exact: false })
    .fill("Small steps from a first idea to a finished portfolio.");
  await pause();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page
    .getByRole("heading", { name: "Ship my portfolio", exact: true })
    .getByRole("link")
    .click();
  await pause();
  for (const title of [
    "Connect the project gallery",
    "Review the responsive layout",
  ]) {
    await page.getByRole("button", { name: "New task", exact: true }).click();
    await page.getByLabel("Task title").fill(title);
    await page
      .getByLabel("Priority", { exact: true })
      .last()
      .selectOption("high");
    await page.getByLabel("Due date", { exact: false }).fill("2026-10-30");
    await pause();
    await page.getByRole("button", { name: "Save task", exact: true }).click();
    await page.locator("dialog").waitFor({ state: "detached" });
  }
  await chapter(
    "03 / Task updates refresh progress after the server confirms the save",
  );
  await page
    .getByRole("button", {
      name: "Complete task: Connect the project gallery",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Reopen task: Connect the project gallery",
      exact: true,
    })
    .waitFor();
  await pause();
  await page.getByLabel("Status", { exact: true }).selectOption("done");
  await pause();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await chapter(
    "04 / Reload: the cookie session and database records are restored",
  );
  await pause();
  await page.reload();
  await page
    .getByRole("heading", { name: "Ship my portfolio", exact: true })
    .waitFor();
  await chapter("Reloaded: 2 saved tasks, 1 completed");
  await pause();
  await page
    .getByRole("button", {
      name: "Edit task: Review the responsive layout",
      exact: true,
    })
    .click();
  await chapter("05 / Edit an existing task");
  await page
    .getByLabel("Task title")
    .fill("Review and share the responsive layout");
  await pause();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "detached" });
  await pause();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await chapter("06 / Sign out, then sign back in to the same account");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await pause();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page
    .getByRole("heading", { name: "Make room for what matters.", exact: true })
    .waitFor();
  await chapter("Saved projects and progress are ready to continue");
  await pause();
  await page
    .getByRole("heading", { name: "Ship my portfolio", exact: true })
    .getByRole("link")
    .click();
  await page
    .getByRole("heading", { name: "Ship my portfolio", exact: true })
    .waitFor();
  await chapter("TaskNest · Integrated and verified · YuvaIntern Week 4");
  await pause();
  await page.screenshot({
    path: path.join(root, "evidence/demo-final-frame.png"),
  });
  await context.close();
  await video.saveAs(path.join(root, "evidence/TaskNest-Week-4-Demo.webm"));
  console.log("Saved evidence/TaskNest-Week-4-Demo.webm");
} finally {
  await browser.close();
  await app.stop();
}

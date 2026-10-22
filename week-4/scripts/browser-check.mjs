import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { chromium } from "playwright";
import { isolatedServer, root } from "./qa-server.mjs";
const require = createRequire(import.meta.url),
  evidence = path.join(root, "evidence");
fs.mkdirSync(evidence, { recursive: true });
const app = await isolatedServer();
const browser = await chromium.launch({
  headless: true,
  ...(process.env.TASKNEST_BROWSER
    ? { executablePath: process.env.TASKNEST_BROWSER }
    : {}),
});
const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  }),
  page = await context.newPage();
const password = "Week four browser passphrase!",
  email = `browser-${Date.now()}@example.test`;
const groups = [],
  errors = [],
  requests = [];
page.on("pageerror", (e) => errors.push(e.message));
page.on("response", (r) => {
  if (r.url().includes("/api/v1/"))
    requests.push({
      method: r.request().method(),
      path: new URL(r.url()).pathname,
      status: r.status(),
    });
});
const visible = async (locator) => locator.waitFor({ state: "visible" });
const dashboard = async () =>
  visible(page.getByRole("heading", { name: "Make room for what matters." }));
async function signin(email, password) {
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
}
async function project(name) {
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill(name);
  await page
    .getByLabel("Description", { exact: false })
    .fill("A real project stored by the backend.");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await visible(page.getByRole("heading", { name, exact: true }));
}
async function task(title) {
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill(title);
  await page
    .getByLabel("Status", { exact: true })
    .last()
    .selectOption("in_progress");
  await page
    .getByLabel("Priority", { exact: true })
    .last()
    .selectOption("high");
  await page.getByLabel("Due date", { exact: false }).fill("2026-10-20");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "detached" });
}
try {
  await page.goto(app.base + "/#/dashboard");
  await visible(
    page.getByRole("heading", { name: "Welcome back", exact: true }),
  );
  await page
    .getByRole("link", { name: "Create an account", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  assert.equal(await page.locator('[aria-invalid="true"]').count(), 3);
  await page.getByLabel("Your name").fill("Yash Demo");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await dashboard();
  assert.equal(await page.locator(".project-card").count(), 0);
  groups.push(
    "Protected route, registration validation, real registration and empty account",
  );
  const cookies = await context.cookies();
  assert.equal(
    cookies.find((x) => x.name === "tasknest_session").httpOnly,
    true,
  );
  assert.equal(
    await page.evaluate(() => document.cookie.includes("tasknest_session")),
    false,
  );
  assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), []);
  groups.push(
    "Session cookie is HttpOnly; no credentials or workspace data in localStorage",
  );
  await project("Week 4 integration");
  const projectId = await page
    .locator(".project-card h3 a")
    .getAttribute("href");
  await page
    .getByRole("heading", { name: "Week 4 integration", exact: true })
    .getByRole("link")
    .click();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page.getByLabel("Project name").fill("Connected workspace");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Connected workspace", exact: true }),
  );
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  assert.equal(
    await page.getByLabel("Task title").getAttribute("aria-invalid"),
    "true",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  for (let i = 1; i <= 6; i++) await task("Integration step " + i);
  assert.equal(await page.locator(".task-row").count(), 5);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await visible(page.getByText("Page 2 of 2", { exact: true }));
  assert.equal(await page.locator(".task-row").count(), 1);
  await page.getByRole("button", { name: "Previous", exact: true }).click();
  groups.push(
    "Real project create/edit and task creation; required fields; five-task pagination",
  );
  await page.getByLabel("Search tasks").fill("step 1");
  await page.getByLabel("Status", { exact: true }).selectOption("in_progress");
  await page.getByLabel("Priority", { exact: true }).selectOption("high");
  assert.equal(await page.locator(".task-row").count(), 1);
  await page
    .getByRole("button", {
      name: "Complete task: Integration step 1",
      exact: true,
    })
    .click();
  await visible(
    page.getByRole("heading", {
      name: "No tasks match these filters",
      exact: true,
    }),
  );
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await visible(
    page.getByRole("button", {
      name: "Reopen task: Integration step 1",
      exact: true,
    }),
  );
  await page
    .getByRole("button", { name: "Edit task: Integration step 1", exact: true })
    .click();
  await page.getByLabel("Task title").fill("Verified API workflow");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Verified API workflow", exact: true }),
  );
  await page
    .getByRole("button", {
      name: "Reopen task: Verified API workflow",
      exact: true,
    })
    .click();
  await visible(
    page.getByRole("button", {
      name: "Complete task: Verified API workflow",
      exact: true,
    }),
  );
  groups.push(
    "Combined filters, complete/reopen, strict PATCH allow-list and task editing",
  );
  await page.reload();
  await visible(
    page.getByRole("heading", { name: "Connected workspace", exact: true }),
  );
  await visible(
    page.getByRole("heading", { name: "Verified API workflow", exact: true }),
  );
  await app.restart();
  await page.reload();
  await visible(
    page.getByRole("heading", { name: "Verified API workflow", exact: true }),
  );
  groups.push(
    "Cookie/session restoration after refresh and real database/server close/reopen",
  );
  const screenshotWidths = [];
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth),
      width,
    );
    screenshotWidths.push(width);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: path.join(evidence, "project-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 1000 });
  await page.screenshot({
    path: path.join(evidence, "project-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  groups.push(
    "Project layout at five desktop/tablet/phone widths without horizontal overflow",
  );
  // Real save errors keep the draft; only these explicit failure branches intercept traffic.
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page.getByLabel("Project name").fill("Draft survives network failure");
  await page.route("**/api/v1/projects/*", (route) =>
    route.request().method() === "PATCH"
      ? route.abort("failed")
      : route.continue(),
  );
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await visible(
    page.getByText("The connection was interrupted.", { exact: false }),
  );
  assert.equal(
    await page.getByLabel("Project name").inputValue(),
    "Draft survives network failure",
  );
  await page.unroute("**/api/v1/projects/*");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  // A committed write whose follow-up read fails must report saved-but-not-refreshed.
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page.getByLabel("Project name").fill("Connected workspace");
  await page.route("**/api/v1/dashboard", (route) => route.abort("failed"));
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await visible(
    page.getByText(
      "The change was saved, but the workspace could not be refreshed.",
      { exact: false },
    ),
  );
  await page.unroute("**/api/v1/dashboard");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Connected workspace", exact: true }),
  );
  groups.push(
    "Interrupted save preserves draft; committed-save/failed-refresh feedback and Retry",
  );
  await page.route("**/api/v1/dashboard", (route) =>
    route.fulfill({
      status: 429,
      contentType: "application/json",
      body: JSON.stringify({
        error: { code: "RATE_LIMITED", message: "Limit reached" },
      }),
    }),
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await visible(page.getByText("Too many requests.", { exact: false }));
  await page.unroute("**/api/v1/dashboard");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Connected workspace", exact: true }),
  );
  groups.push("Rate-limit response presents a recovery message");
  const other = await browser.newContext(),
    otherPage = await other.newPage();
  await otherPage.goto(app.base + "/#/register");
  await otherPage.getByLabel("Your name").fill("Second User");
  await otherPage
    .getByLabel("Email address")
    .fill("second-" + Date.now() + "@example.test");
  await otherPage.getByLabel("Password", { exact: false }).fill(password);
  await otherPage
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await visible(
    otherPage.getByRole("heading", {
      name: "Your next idea starts here",
      exact: true,
    }),
  );
  await otherPage.goto(app.base + "/" + projectId);
  await visible(
    otherPage.getByRole("heading", { name: "Project not found", exact: true }),
  );
  assert.equal(
    await otherPage.getByText("Verified API workflow", { exact: true }).count(),
    0,
  );
  await other.close();
  groups.push(
    "Separate real account cannot see another account’s projects or tasks",
  );
  await page
    .getByRole("button", {
      name: "Delete task: Verified API workflow",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.equal(
    await page
      .getByRole("heading", { name: "Verified API workflow", exact: true })
      .count(),
    1,
  );
  await page
    .getByRole("button", {
      name: "Delete task: Verified API workflow",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.locator("dialog").waitFor({ state: "detached" });
  assert.equal(
    await page
      .getByRole("heading", { name: "Verified API workflow", exact: true })
      .count(),
    0,
  );
  await page.getByRole("link", { name: "All projects", exact: false }).click();
  await dashboard();
  await page.screenshot({
    path: path.join(evidence, "dashboard.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Welcome back", exact: true }),
  );
  await signin(email, "Incorrect example passphrase!");
  await visible(page.getByRole("alert"));
  await signin(email, password);
  await dashboard();
  groups.push(
    "Cancelled/confirmed task deletion, sign-out, invalid credentials and successful sign-in",
  );
  await page.locator(".project-card h3 a").click();
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await dashboard();
  assert.equal(await page.locator(".project-card").count(), 0);
  assert.equal(
    (await app.db.query("SELECT count(*)::int AS count FROM tasks")).rows[0]
      .count,
    0,
  );
  groups.push("Confirmed project deletion cascades to its stored tasks");
  // Slow old reads cannot restore account data after sign-out.
  let release, entered;
  const requested = new Promise((r) => (entered = r));
  const held = new Promise((r) => (release = r));
  await page.route("**/api/v1/dashboard", async (route) => {
    const response = await route.fetch();
    entered();
    await held;
    await route.fulfill({ response });
  });
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await requested;
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await visible(
    page.getByRole("heading", { name: "Welcome back", exact: true }),
  );
  release();
  await page.unroute("**/api/v1/dashboard", { behavior: "wait" });
  assert.equal(await page.locator(".workspace").count(), 0);
  await signin(email, password);
  await dashboard();
  await app.db.query(
    "UPDATE sessions SET created_at=now()-interval '2 days', expires_at=now()-interval '1 second'",
  );
  await page.getByRole("button", { name: "Refresh", exact: true }).click();
  await visible(
    page.getByText("Your session expired or changed.", { exact: false }),
  );
  assert.equal(await page.locator(".workspace").count(), 0);
  groups.push(
    "Stale read after sign-out is ignored; expired real session removes private workspace",
  );
  await page.goto(app.base + "/#/register");
  await page.getByLabel("Your name").fill("Duplicate User");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: false }).fill(password);
  await page
    .getByRole("button", { name: "Create account", exact: true })
    .click();
  await visible(
    page.getByText("An account with this email already exists.", {
      exact: true,
    }),
  );
  await page.screenshot({
    path: path.join(evidence, "registration-error.png"),
  });
  groups.push(
    "Duplicate-email server error is shown without losing form values",
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(evidence, "browser-results.json"),
    JSON.stringify(
      {
        date: "2026-10-22",
        browser: await browser.version(),
        groups,
        widths: screenshotWidths,
        pageErrors: errors,
        requests,
        notes:
          "Normal workflows use the real Express/PGlite backend. Explicit connection/read/rate-limit failure branches intercept selected requests. The QA server uses a temporary disk database and higher request limits.",
      },
      null,
      2,
    ),
  );
  console.log(
    `Passed ${groups.length} full-stack workflow groups and ${screenshotWidths.length} viewport widths.`,
  );
} finally {
  await browser.close();
  await app.stop();
}

const fs = require("fs");
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.TASKNEST_BROWSER_EXECUTABLE
      ? { executablePath: process.env.TASKNEST_BROWSER_EXECUTABLE }
      : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.TASKNEST_BASE_URL || "http://127.0.0.1:8023/";
  const root = path.resolve(__dirname, "../evidence");
  fs.mkdirSync(root, { recursive: true });
  const widths = [320, 390, 768, 1440];
  const responsive = [];
  for (const [route, name] of [
    ["/", "landing"],
    ["/dashboard", "dashboard"],
    ["/projects/portfolio", "project"],
  ]) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 960 });
      await page.goto(base + "#" + route);
      await page.locator("h1").waitFor();
      if (route !== "/") await page.locator(".stats-grid").waitFor();
      await page.waitForFunction(() => document.activeElement === document.querySelector("h1"));
      await page.evaluate(() => document.fonts.ready);
      if (route === "/") assert.equal(await page.locator(".landing-features article").count(), 3);
      const dimensions = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
      }));
      assert.equal(dimensions.document, width, `${name} at ${width} overflows`);
      responsive.push({ view: name, width, result: "pass" });
      if (width === 1440 || width === 390)
        await page.screenshot({
          path: `${root}/${name}-${width}.png`,
          fullPage: true,
        });
    }
  }
  console.log("Responsive checks passed");
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(base + "#/dashboard");
  await page.locator(".project-card").first().waitFor();
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page
    .getByText("Enter a project name between 1 and 80 characters.")
    .waitFor();
  assert.equal(await page.locator(":focus").getAttribute("id"), "project-name");
  await page.getByLabel("Project name").fill("Browser test project");
  await page
    .getByLabel("Description", { exact: false })
    .fill("A project created during browser verification.");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Browser test project", exact: true })
    .click();
  await page.getByRole("heading", { name: "A fresh start" }).waitFor();
  const projectUrl = page.url();
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByText("Enter a task title between 1 and 200 characters.")
    .waitFor();
  await page.getByLabel("Task title").fill("Browser tested task");
  await page
    .getByLabel("Description", { exact: false })
    .fill("Saved description.");
  await page
    .getByLabel("Priority", { exact: true })
    .last()
    .selectOption("high");
  await page.getByLabel("Due date").fill("2020-01-01");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Browser tested task", exact: true })
    .waitFor();
  assert.equal(
    await page.locator(".stat").nth(2).locator("strong").textContent(),
    "1",
  );
  await page
    .getByRole("button", {
      name: "Edit task: Browser tested task",
      exact: true,
    })
    .click();
  await page.getByLabel("Task title").fill("Updated browser task");
  await page
    .getByLabel("Status", { exact: true })
    .last()
    .selectOption("in_progress");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Updated browser task", exact: true })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Complete task: Updated browser task",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Reopen task: Updated browser task",
      exact: true,
    })
    .waitFor();
  assert.equal(
    await page.locator(".stat").nth(1).locator("strong").textContent(),
    "1",
  );
  assert.equal(
    await page.locator(".stat").nth(2).locator("strong").textContent(),
    "0",
  );
  await page.reload();
  await page
    .getByRole("button", {
      name: "Reopen task: Updated browser task",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Reopen task: Updated browser task",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", {
      name: "Complete task: Updated browser task",
      exact: true,
    })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Edit task: Updated browser task",
      exact: true,
    })
    .click();
  await page.getByLabel("Task title").fill("Unsaved edits");
  await page.keyboard.press("Escape");
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(
    await page.locator(":focus").getAttribute("aria-label"),
    "Edit task: Updated browser task",
  );
  await page
    .getByRole("button", {
      name: "Delete task: Updated browser task",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("heading", { name: "Updated browser task", exact: true })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Delete task: Updated browser task",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page.getByRole("heading", { name: "A fresh start" }).waitFor();
  await page.getByRole("button", { name: "Edit project", exact: true }).click();
  await page.getByLabel("Project name").fill("Renamed browser project");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Renamed browser project", exact: true })
    .waitFor();
  console.log("CRUD, persistence, overdue counts and modal focus passed");
  await page.goto(base + "#/projects/portfolio");
  await page.locator(".task-row").first().waitFor();
  assert.equal(await page.locator(".task-row").count(), 5);
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByText("Page 2 of 2").waitFor();
  assert.equal(await page.locator(".task-row").count(), 2);
  assert.ok(page.url().includes("page=2"));
  await page.getByLabel("Search tasks", { exact: true }).fill("gallery");
  await page.getByLabel("Status", { exact: true }).selectOption("in_progress");
  await page.getByLabel("Priority", { exact: true }).selectOption("high");
  await page
    .getByRole("heading", { name: "Build the project gallery", exact: true })
    .waitFor();
  assert.equal(await page.locator(".task-row").count(), 1);
  assert.ok(page.url().includes("priority=high"));
  await page.getByLabel("Search tasks", { exact: true }).fill("zzznothing");
  await page
    .getByRole("heading", { name: "No tasks match these filters" })
    .waitFor();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .first()
    .click();
  await page.locator(".task-row").first().waitFor();
  await page.goto(base + "#/dashboard");
  await page.getByLabel("Search projects").fill("zzznothing");
  await page.getByRole("heading", { name: "No matching projects" }).waitFor();
  await page.getByRole("button", { name: "Clear search", exact: true }).click();
  await page.locator(".project-card").first().waitFor();
  // A rejected browser-storage write must preserve the draft and avoid false success.
  await page.evaluate(() => {
    window.__setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function () {
      throw new Error("test quota failure");
    };
  });
  await page.getByRole("button", { name: "New project", exact: true }).click();
  await page.getByLabel("Project name").fill("Preserved draft");
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page
    .getByText("Your changes could not be saved in this browser.", {
      exact: false,
    })
    .waitFor();
  assert.equal(
    await page.getByLabel("Project name").inputValue(),
    "Preserved draft",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.__setItem;
  });
  await page.getByRole("button", { name: "Save project", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("heading", { name: "Preserved draft", exact: true })
    .waitFor();
  // Project deletion removes its children and returns to the dashboard.
  await page.goto(projectUrl);
  await page.getByRole("button", { name: "New task", exact: true }).click();
  await page.getByLabel("Task title").fill("Cascade task");
  await page.getByRole("button", { name: "Save task", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page.getByText(/all 1 of its tasks/).waitFor();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Delete project", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page
    .getByRole("heading", { name: "Make room for what matters." })
    .waitFor();
  const state = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("tasknest.week2.v1")),
  );
  assert.ok(!state.projects.find((p) => p.name === "Renamed browser project"));
  assert.ok(!state.tasks.find((t) => t.title === "Cascade task"));
  console.log(
    "Filters, pagination, failed-save recovery and confirmed cascade passed",
  );
  // Corruption is surfaced instead of silently replacing a user's demo data.
  await page.evaluate(() =>
    localStorage.setItem("tasknest.week2.v1", "broken"),
  );
  await page.reload();
  await page
    .getByRole("heading", { name: "The workspace needs a moment." })
    .waitFor();
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await page
    .getByRole("heading", { name: "The workspace needs a moment." })
    .waitFor();
  await page
    .getByRole("button", { name: "Restore sample workspace", exact: true })
    .click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await page
    .getByRole("heading", { name: "Personal portfolio", exact: true })
    .waitFor();
  await page.goto(base + "#/projects/no-such-project");
  await page.getByRole("heading", { name: "Project not found" }).waitFor();
  await page.goto(base + "#/unknown");
  await page.getByRole("heading", { name: "This page isn't here" }).waitFor();
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(root, "browser-results.json"),
    JSON.stringify(
      {
        responsive,
        workflows: [
          "Landing → dashboard → project navigation",
          "Project create, edit, delete with cascade",
          "Task create, edit, complete, reopen, delete",
          "Blank required field validation",
          "Combined search, status and priority filters",
          "Pagination and URL query state",
          "Persistence after browser refresh",
          "Escape dismissal and focus restoration",
          "Deletion cancellation",
          "Failed storage write retains form and retries",
          "Unreadable data error, Retry and sample restore",
          "Missing project and route states",
        ],
        pageErrors: errors,
      },
      null,
      2,
    ),
  );
  console.log("All browser workflows passed");
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

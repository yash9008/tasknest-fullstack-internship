import test from "node:test";
import assert from "node:assert/strict";
import {
  summarize,
  filterTasks,
  paginate,
  validateTask,
  validateProject,
} from "../src/lib/model.js";
const tasks = [
  {
    id: "a",
    title: "Build dashboard",
    status: "todo",
    priority: "high",
    dueDate: "2026-01-01",
    createdAt: "2026-01-01",
  },
  {
    id: "b",
    title: "Build gallery",
    status: "in_progress",
    priority: "high",
    dueDate: "2026-02-01",
    createdAt: "2026-01-02",
  },
  {
    id: "c",
    title: "Write README",
    status: "done",
    priority: "low",
    dueDate: "2026-01-01",
    createdAt: "2026-01-03",
  },
  {
    id: "d",
    title: "Build footer",
    status: "todo",
    priority: "normal",
    dueDate: "",
    createdAt: "2026-01-04",
  },
];
test("summary treats earlier unfinished dates as overdue and excludes completed tasks", () =>
  assert.deepEqual(summarize(tasks, "2026-01-10"), {
    total: 4,
    open: 3,
    done: 1,
    overdue: 1,
  }));
test("search status and priority filters combine", () =>
  assert.deepEqual(
    filterTasks(tasks, { q: " BUILD ", status: "todo", priority: "high" }).map(
      (t) => t.id,
    ),
    ["a"],
  ));
test("pagination clamps invalid and out-of-range pages without losing items", () => {
  assert.equal(paginate(tasks, 99, 2).page, 2);
  assert.equal(paginate([], 2).page, 1);
  assert.deepEqual(
    paginate(tasks, -3, 2).items.map((t) => t.id),
    ["a", "b"],
  );
});
test("validation rejects blank names, invalid enums and impossible calendar dates", () => {
  assert.ok(validateProject({ name: "   " }).name);
  assert.ok(
    validateTask({ title: "x", status: "wat", priority: "high" }).status,
  );
  assert.ok(
    validateTask({
      title: "x",
      status: "todo",
      priority: "high",
      dueDate: "2026-02-30",
    }).dueDate,
  );
  assert.equal(
    Object.keys(
      validateTask({
        title: "x",
        status: "done",
        priority: "normal",
        dueDate: "2028-02-29",
      }),
    ).length,
    0,
  );
});

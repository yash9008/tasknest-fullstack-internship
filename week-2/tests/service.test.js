import test from "node:test";
import assert from "node:assert/strict";
import { createDemoService, STORAGE_KEY } from "../src/services/demoService.js";
import { createApiService } from "../src/services/apiService.js";
function store() {
  const data = new Map();
  return {
    getItem: (k) => data.get(k) || null,
    setItem: (k, v) => data.set(k, v),
    data,
  };
}
function setup() {
  const storage = store();
  let n = 0;
  return {
    storage,
    service: createDemoService(storage, { delay: 0, id: () => `id-${++n}` }),
  };
}
const sampleTask = {
  title: "Test a workflow",
  description: "A test note",
  status: "todo",
  priority: "high",
  dueDate: "",
};
test("project and task CRUD persists across service instances and project deletion cascades", async () => {
  const { storage, service } = setup();
  await service.loadWorkspace();
  const { data: p } = await service.createProject({
    name: "New project",
    description: "abc",
  });
  const { data: t } = await service.createTask(p.id, sampleTask);
  await service.updateTask(t.id, { ...sampleTask, status: "done" });
  const reopened = createDemoService(storage, { delay: 0 });
  let state = (await reopened.loadWorkspace()).data;
  assert.equal(state.tasks.find((x) => x.id === t.id).status, "done");
  await service.updateProject(p.id, {
    name: "Renamed",
    description: "updated",
  });
  assert.equal(
    (await service.loadWorkspace()).data.projects.find((x) => x.id === p.id)
      .name,
    "Renamed",
  );
  await service.deleteProject(p.id);
  state = (await service.loadWorkspace()).data;
  assert.ok(!state.projects.find((x) => x.id === p.id));
  assert.ok(!state.tasks.find((x) => x.projectId === p.id));
});
test("invalid data and missing parents are rejected without saving a new task", async () => {
  const { service } = setup();
  const before = (await service.loadWorkspace()).data.tasks.length;
  await assert.rejects(
    service.createTask("missing", sampleTask),
    /no longer exists/,
  );
  await assert.rejects(
    service.createTask("portfolio", { ...sampleTask, title: " " }),
    /highlighted/,
  );
  assert.equal((await service.loadWorkspace()).data.tasks.length, before);
});
test("individual task deletion preserves the parent and other tasks", async () => {
  const { service } = setup();
  await service.loadWorkspace();
  await service.deleteTask("sample-1");
  const state = (await service.loadWorkspace()).data;
  assert.equal(state.projects.length, 3);
  assert.equal(state.tasks.length, 11);
  assert.ok(!state.tasks.find((t) => t.id === "sample-1"));
});
test("storage failure does not report success or alter the saved snapshot", async () => {
  const { storage, service } = setup();
  await service.loadWorkspace();
  const snapshot = storage.getItem(STORAGE_KEY);
  storage.setItem = () => {
    throw new Error("quota");
  };
  await assert.rejects(
    service.createProject({ name: "Unsaved" }),
    /could not be saved/,
  );
  assert.equal(storage.getItem(STORAGE_KEY), snapshot);
});
test("corrupt storage shows an error and explicit sample restoration recovers", async () => {
  const { storage, service } = setup();
  storage.setItem(STORAGE_KEY, "not-json");
  await assert.rejects(service.loadWorkspace(), /cannot be read/);
  await service.restoreSamples();
  assert.equal((await service.loadWorkspace()).data.projects.length, 3);
});
test("API adapter uses the planned endpoints, JSON body, session bootstrap and CSRF header", async () => {
  const calls = [];
  const service = createApiService(async (url, options) => {
    calls.push({ url, options });
    return new Response(
      JSON.stringify({
        data: url.endsWith("/auth/session")
          ? { csrfToken: "test-token" }
          : { id: "server-id" },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  });
  await service.createProject({ name: "API project" });
  assert.equal(calls[0].url, "/api/v1/auth/session");
  assert.equal(calls[1].url, "/api/v1/projects");
  assert.equal(calls[1].options.headers["X-CSRF-Token"], "test-token");
  assert.equal(calls[1].options.method, "POST");
  assert.deepEqual(JSON.parse(calls[1].options.body), { name: "API project" });
});
test("API adapter surfaces field errors for an unsuccessful response", async () => {
  const service = createApiService(
    async () =>
      new Response(
        JSON.stringify({
          error: {
            message: "Please sign in again.",
            fields: { name: "Required" },
          },
        }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      ),
  );
  await assert.rejects(
    service.loadWorkspace(),
    (e) =>
      e.status === 401 &&
      e.message === "Please sign in again." &&
      e.fields.name === "Required",
  );
});

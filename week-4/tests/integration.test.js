import test from "node:test";
import assert from "node:assert/strict";
import { openDatabase } from "../server/src/database.js";
import { serve } from "../server/tests/client.js";
import { createApiService } from "../client/src/services/apiService.js";
function transport(base, origin) {
  let cookie = "";
  const seen = [];
  const fetcher = async (path, options) => {
    seen.push({
      path,
      method: options.method,
      csrf: options.headers["X-CSRF-Token"],
    });
    const response = await fetch(base + path, {
      ...options,
      headers: {
        ...options.headers,
        ...(cookie ? { Cookie: cookie } : {}),
        ...(options.method !== "GET" ? { Origin: origin } : {}),
      },
    });
    for (const value of response.headers.getSetCookie())
      cookie = value.split(";")[0];
    return response;
  };
  return {
    api: createApiService(fetcher),
    seen,
    get cookie() {
      return cookie;
    },
  };
}
test("actual frontend transport integrates auth, summary, CRUD, logout/login and ownership", async () => {
  const db = await openDatabase({ dataDir: "memory://" }),
    server = await serve(db);
  try {
    const a = transport(server.base, server.config.appOrigin),
      b = transport(server.base, server.config.appOrigin);
    assert.equal((await a.api.session()).data.user, null);
    const token = a.seen.length;
    const user = (
      await a.api.authenticate("register", {
        name: "Integration User",
        email: "integration@example.test",
        password: "Week four test passphrase!",
      })
    ).data.user;
    assert.ok(user.id);
    assert.match(a.cookie, /tasknest_session=/);
    const project = (
      await a.api.createProject({
        name: "Integrated project",
        description: "Saved in PostgreSQL",
      })
    ).data;
    const task = (
      await a.api.createTask(project.id, {
        title: "Connect frontend",
        status: "in_progress",
        priority: "high",
        dueDate: "",
      })
    ).data;
    await a.api.updateTask(task.id, { ...task, status: "done" }); // transport must strip server-owned fields
    await a.api.updateProject(project.id, {
      ...project,
      name: "Renamed project",
    });
    let state = (await a.api.loadWorkspace()).data;
    assert.equal(state.summary.done, 1);
    assert.equal(state.projects[0].name, "Renamed project");
    assert.equal(state.tasks[0].status, "done");
    assert.notEqual(
      a.seen.find((x) => x.path === "/api/v1/auth/register").csrf,
      a.seen.find((x) => x.path === "/api/v1/projects" && x.method === "POST")
        .csrf,
    );
    await b.api.authenticate("register", {
      name: "Other User",
      email: "other@example.test",
      password: "Another test passphrase!",
    });
    assert.equal((await b.api.loadWorkspace()).data.projects.length, 0);
    await assert.rejects(
      b.api.updateTask(task.id, { status: "todo" }),
      (e) => e.status === 404,
    );
    await a.api.logout();
    await assert.rejects(a.api.loadWorkspace(), (e) => e.status === 401);
    await assert.rejects(
      a.api.authenticate("login", {
        email: "integration@example.test",
        password: "A wrong test passphrase!",
      }),
      (e) => e.code === "INVALID_CREDENTIALS",
    );
    await a.api.authenticate("login", {
      email: "integration@example.test",
      password: "Week four test passphrase!",
    });
    assert.equal((await a.api.loadWorkspace()).data.tasks.length, 1);
    await a.api.deleteTask(task.id);
    assert.equal((await a.api.loadWorkspace()).data.tasks.length, 0);
    await a.api.createTask(project.id, { title: "Cascade child" });
    await a.api.deleteProject(project.id);
    state = (await a.api.loadWorkspace()).data;
    assert.equal(state.projects.length, 0);
    assert.equal(state.tasks.length, 0);
  } finally {
    await server.stop();
    await db.close();
  }
});
test("transport restores a cookie session and reports expiration without replaying mutation", async () => {
  const db = await openDatabase({ dataDir: "memory://" }),
    server = await serve(db);
  try {
    const a = transport(server.base, server.config.appOrigin);
    let lost = 0;
    a.api.onSessionLost(() => lost++);
    await a.api.authenticate("register", {
      name: "Session User",
      email: "session@example.test",
      password: "Session test passphrase!",
    });
    const savedCookie = a.cookie;
    const restored = createApiService((path, options) =>
      fetch(server.base + path, {
        ...options,
        headers: { ...options.headers, Cookie: savedCookie },
      }),
    );
    assert.equal((await restored.session()).data.user.name, "Session User");
    await db.query(
      "UPDATE sessions SET created_at=now()-interval '2 days', expires_at=now()-interval '1 second'",
    );
    await assert.rejects(
      a.api.createProject({ name: "Must not save" }),
      (e) => e.code === "CSRF_INVALID",
    );
    assert.equal(lost, 1);
    assert.equal(
      a.seen.filter((x) => x.path === "/api/v1/projects" && x.method === "POST")
        .length,
      1,
    );
    assert.equal(
      (await db.query("SELECT count(*)::int AS count FROM projects")).rows[0]
        .count,
      0,
    );
  } finally {
    await server.stop();
    await db.close();
  }
});
test("transport deduplicates concurrent session bootstrap and collects all API pages", async () => {
  let bootstraps = 0;
  const api = createApiService(async (path) => {
    if (path.endsWith("/auth/session")) {
      bootstraps++;
      await new Promise((r) => setTimeout(r, 5));
      return Response.json({ data: { user: null, csrfToken: "token" } });
    }
    if (path.endsWith("/dashboard"))
      return Response.json({
        data: {
          projects: 101,
          tasks: 0,
          todo: 0,
          inProgress: 0,
          done: 0,
          overdue: 0,
        },
      });
    if (path.startsWith("/api/v1/projects?")) {
      const page = new URL("http://test" + path).searchParams.get("page");
      return Response.json({
        data:
          page === "1"
            ? Array.from({ length: 100 }, (_, i) => ({ id: String(i) }))
            : [{ id: "100" }],
        pagination: { total: 101 },
      });
    }
    return Response.json({ data: [], pagination: { total: 0 } });
  });
  await Promise.all([api.session(), api.session(), api.session()]);
  assert.equal(bootstraps, 1);
  assert.equal((await api.loadWorkspace()).data.projects.length, 101);
});
test("network, timeout, unreadable and rate-limit responses produce actionable errors", async () => {
  await assert.rejects(
    createApiService(async () => {
      throw new TypeError("fetch failed");
    }).session(),
    /connection was interrupted/,
  );
  const slow = createApiService(
    (path, { signal }) =>
      new Promise((resolve, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted"))),
      ),
    { timeoutMs: 5 },
  );
  await assert.rejects(slow.session(), /timed out/);
  await assert.rejects(
    createApiService(
      async () => new Response("not JSON", { status: 502 }),
    ).session(),
    /unreadable/,
  );
  await assert.rejects(
    createApiService(async () =>
      Response.json(
        { error: { code: "RATE_LIMITED" } },
        { status: 429, headers: { "Retry-After": "60" } },
      ),
    ).session(),
    (e) => e.status === 429 && e.retryAfter === "60",
  );
});

// Same-origin cookie transport. CSRF tokens stay in memory; credentials never enter storage.
export function createApiService(
  fetcher = globalThis.fetch,
  { timeoutMs = 15000 } = {},
) {
  let csrfToken,
    bootstrap,
    sessionLost = () => {};
  async function request(path, method = "GET", body) {
    if (method !== "GET" && !csrfToken) await session();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetcher(`/api/v1${path}`, {
        method,
        credentials: "same-origin",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(method !== "GET" ? { "X-CSRF-Token": csrfToken || "" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      if (response.status === 204) return { data: null };
      const payload = await response.json().catch(() => {
        throw new Error(
          "The server returned an unreadable response. Refresh before retrying a save.",
        );
      });
      if (!response.ok) {
        const code = payload.error?.code;
        const error = Object.assign(
          new Error(
            response.status === 429
              ? "Too many requests. Please wait before trying again."
              : payload.error?.message || "The request failed.",
          ),
          {
            fields: payload.error?.fields,
            status: response.status,
            code,
            retryAfter: response.headers?.get("Retry-After"),
          },
        );
        if (code === "AUTH_REQUIRED" || code === "CSRF_INVALID") {
          csrfToken = undefined;
          sessionLost();
        }
        throw error;
      }
      if (payload.data?.csrfToken) csrfToken = payload.data.csrfToken;
      return payload;
    } catch (error) {
      if (controller.signal.aborted)
        throw new Error(
          "The request timed out. Refresh your workspace before retrying; a change may already have been saved.",
        );
      if (error instanceof TypeError)
        throw new Error(
          "The connection was interrupted. Check your connection and refresh before retrying a save.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
  function session() {
    if (!bootstrap)
      bootstrap = request("/auth/session").finally(() => {
        bootstrap = undefined;
      });
    return bootstrap;
  }
  async function collection(path) {
    const all = [];
    for (let page = 1; page <= 100; page++) {
      const result = await request(`${path}?page=${page}&limit=100`);
      if (
        !Array.isArray(result.data) ||
        !result.pagination ||
        !Number.isInteger(result.pagination.total)
      )
        throw new Error("The server returned an invalid list.");
      all.push(...result.data);
      if (all.length >= result.pagination.total || !result.data.length)
        return all;
    }
    throw new Error("This workspace is too large for this version.");
  }
  const projectInput = (x) =>
    Object.fromEntries(
      ["name", "description"]
        .filter((k) => Object.hasOwn(x, k))
        .map((k) => [k, x[k]]),
    );
  const taskInput = (x) =>
    Object.fromEntries(
      ["title", "description", "status", "priority", "dueDate"]
        .filter((k) => Object.hasOwn(x, k))
        .map((k) => [k, x[k]]),
    );
  return {
    mode: "api",
    session,
    onSessionLost(handler) {
      sessionLost = handler;
      return () => {
        sessionLost = () => {};
      };
    },
    async authenticate(mode, input) {
      await session();
      return request(`/auth/${mode}`, "POST", input);
    },
    async logout() {
      await request("/auth/logout", "POST");
      csrfToken = undefined;
    },
    async loadWorkspace() {
      const summary = (await request("/dashboard")).data;
      const projects = await collection("/projects");
      // Limit fan-out. This snapshot approach intentionally targets small personal workspaces.
      const tasks = [];
      for (let i = 0; i < projects.length; i += 4) {
        const groups = await Promise.all(
          projects
            .slice(i, i + 4)
            .map((p) =>
              collection(`/projects/${encodeURIComponent(p.id)}/tasks`),
            ),
        );
        tasks.push(...groups.flat());
      }
      return { data: { projects, tasks, summary } };
    },
    createProject: (input) => request("/projects", "POST", projectInput(input)),
    updateProject: (id, input) =>
      request(
        `/projects/${encodeURIComponent(id)}`,
        "PATCH",
        projectInput(input),
      ),
    deleteProject: (id) =>
      request(`/projects/${encodeURIComponent(id)}`, "DELETE"),
    createTask: (id, input) =>
      request(
        `/projects/${encodeURIComponent(id)}/tasks`,
        "POST",
        taskInput(input),
      ),
    updateTask: (id, input) =>
      request(`/tasks/${encodeURIComponent(id)}`, "PATCH", taskInput(input)),
    deleteTask: (id) => request(`/tasks/${encodeURIComponent(id)}`, "DELETE"),
  };
}

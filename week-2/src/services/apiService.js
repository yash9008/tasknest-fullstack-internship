// Optional future transport for the Week 1 same-origin API contract.
// Week 2 runs in demo mode. There is no production backend or authentication here.
export function createApiService(fetcher = fetch) {
  let csrfToken;
  async function request(path, method = "GET", body) {
    if (method !== "GET" && !csrfToken) {
      const session = await request("/auth/session");
      csrfToken = session.data.csrfToken;
    }
    const response = await fetcher(`/api/v1${path}`, {
      method,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(method !== "GET" ? { "X-CSRF-Token": csrfToken || "" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (response.status === 204) return { data: null };
    const payload = await response.json().catch(() => {
      throw new Error("The service returned an unreadable response.");
    });
    if (!response.ok)
      throw Object.assign(
        new Error(payload.error?.message || "The request failed."),
        { fields: payload.error?.fields, status: response.status },
      );
    return payload;
  }
  async function collection(path) {
    const all = [];
    for (let page = 1; page <= 1000; page++) {
      const result = await request(`${path}?page=${page}&limit=100`);
      if (!Array.isArray(result.data))
        throw new Error("The service returned an invalid list.");
      all.push(...result.data);
      if (
        !result.pagination ||
        all.length >= result.pagination.total ||
        result.data.length === 0
      )
        return all;
    }
    throw new Error(
      "The workspace is too large to load in this frontend version.",
    );
  }
  return {
    mode: "api",
    async loadWorkspace() {
      const projects = await collection("/projects");
      const groups = await Promise.all(
        projects.map((p) =>
          collection(`/projects/${encodeURIComponent(p.id)}/tasks`),
        ),
      );
      return { data: { projects, tasks: groups.flat() } };
    },
    createProject: (input) => request("/projects", "POST", input),
    updateProject: (id, input) =>
      request(`/projects/${encodeURIComponent(id)}`, "PATCH", input),
    deleteProject: (id) =>
      request(`/projects/${encodeURIComponent(id)}`, "DELETE"),
    createTask: (id, input) =>
      request(`/projects/${encodeURIComponent(id)}/tasks`, "POST", input),
    updateTask: (id, input) =>
      request(`/tasks/${encodeURIComponent(id)}`, "PATCH", input),
    deleteTask: (id) => request(`/tasks/${encodeURIComponent(id)}`, "DELETE"),
  };
}

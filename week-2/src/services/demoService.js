import { validateProject, validateTask } from "../lib/model.js";
export const STORAGE_KEY = "tasknest.week2.v1";
const clone = (value) => JSON.parse(JSON.stringify(value));
const fail = (message, fields) => Object.assign(new Error(message), { fields });
function seededWorkspace() {
  const day = (offset) => {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    return d.toISOString().slice(0, 10);
  };
  const createdAt = new Date().toISOString();
  const projects = [
    {
      id: "portfolio",
      name: "Personal portfolio",
      description:
        "A thoughtful home for my projects, skills, and the work I am proud of.",
      createdAt,
    },
    {
      id: "internship",
      name: "Internship journey",
      description: "Turn weekly learning into a set of projects worth sharing.",
      createdAt,
    },
    {
      id: "reading",
      name: "Reading corner",
      description:
        "Notes and small experiments from the ideas I want to explore.",
      createdAt,
    },
  ];
  const specs = [
    ["portfolio", "Sketch the homepage", "done", "high", -4],
    ["portfolio", "Build the project gallery", "in_progress", "high", 2],
    ["portfolio", "Write the about page", "todo", "normal", 4],
    ["portfolio", "Check the mobile layout", "todo", "high", -1],
    ["portfolio", "Add project descriptions", "todo", "normal", 5],
    ["portfolio", "Review keyboard navigation", "todo", "normal", 7],
    ["portfolio", "Prepare the README", "todo", "low", 8],
    ["internship", "Document the system architecture", "done", "high", -5],
    ["internship", "Create the dashboard interface", "in_progress", "high", 3],
    ["internship", "Test the project workflow", "todo", "normal", 6],
    ["reading", "Explore CSS Grid patterns", "done", "normal", -2],
    ["reading", "Try a small React component", "todo", "low", null],
  ];
  return {
    version: 1,
    projects,
    tasks: specs.map(([projectId, title, status, priority, due], i) => ({
      id: `sample-${i + 1}`,
      projectId,
      title,
      status,
      priority,
      dueDate: due === null ? "" : day(due),
      description: "Sample task — edit this note to make it your own.",
      createdAt: `${createdAt.slice(0, 10)}T00:00:${String(i).padStart(2, "0")}.000Z`,
    })),
  };
}
// The injected storage keeps this adapter testable without a browser.
export function createDemoService(
  storage,
  { delay = 180, id = () => crypto.randomUUID() } = {},
) {
  const wait = () => new Promise((resolve) => setTimeout(resolve, delay));
  function read() {
    let raw;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      throw fail(
        "Browser storage is unavailable. Check browser permissions and retry.",
      );
    }
    if (!raw) {
      const initial = seededWorkspace();
      write(initial);
      return initial;
    }
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      throw fail(
        "The saved demo data cannot be read. Restore the sample workspace to start again.",
      );
    }
    if (
      data.version !== 1 ||
      !Array.isArray(data.projects) ||
      !Array.isArray(data.tasks) ||
      data.projects.some(
        (p) => !p.id || Object.keys(validateProject(p)).length,
      ) ||
      data.tasks.some(
        (t) =>
          !t.id ||
          !data.projects.some((p) => p.id === t.projectId) ||
          Object.keys(validateTask(t)).length,
      )
    ) {
      throw fail(
        "The saved demo data is invalid. Restore the sample workspace to start again.",
      );
    }
    return data;
  }
  function write(data) {
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      throw fail(
        "Your changes could not be saved in this browser. Free some storage or allow site storage, then try again.",
      );
    }
  }
  async function change(operation) {
    await wait();
    const data = read();
    const result = operation(data);
    write(data);
    return { data: clone(result) };
  }
  function check(fields) {
    if (Object.keys(fields).length)
      throw fail("Check the highlighted fields.", fields);
  }
  const project = (data, key) => {
    const p = data.projects.find((p) => p.id === key);
    if (!p) throw fail("This project no longer exists.");
    return p;
  };
  const task = (data, key) => {
    const t = data.tasks.find((t) => t.id === key);
    if (!t) throw fail("This task no longer exists.");
    return t;
  };
  return {
    mode: "demo",
    async loadWorkspace() {
      await wait();
      return { data: clone(read()) };
    },
    createProject(input) {
      return change((data) => {
        check(validateProject(input));
        const p = {
          id: id(),
          name: input.name.trim(),
          description: input.description || "",
          createdAt: new Date().toISOString(),
        };
        data.projects.push(p);
        return p;
      });
    },
    updateProject(key, input) {
      return change((data) => {
        check(validateProject(input));
        const p = project(data, key);
        p.name = input.name.trim();
        p.description = input.description || "";
        return p;
      });
    },
    deleteProject(key) {
      return change((data) => {
        project(data, key);
        data.projects = data.projects.filter((p) => p.id !== key);
        data.tasks = data.tasks.filter((t) => t.projectId !== key);
        return null;
      });
    },
    createTask(projectId, input) {
      return change((data) => {
        project(data, projectId);
        check(validateTask(input));
        const t = {
          id: id(),
          projectId,
          title: input.title.trim(),
          description: input.description || "",
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate || "",
          createdAt: new Date().toISOString(),
        };
        data.tasks.push(t);
        return t;
      });
    },
    updateTask(key, input) {
      return change((data) => {
        check(validateTask(input));
        const t = task(data, key);
        Object.assign(t, {
          title: input.title.trim(),
          description: input.description || "",
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate || "",
        });
        return t;
      });
    },
    deleteTask(key) {
      return change((data) => {
        task(data, key);
        data.tasks = data.tasks.filter((t) => t.id !== key);
        return null;
      });
    },
    async restoreSamples() {
      await wait();
      const data = seededWorkspace();
      write(data);
      return { data: clone(data) };
    },
  };
}

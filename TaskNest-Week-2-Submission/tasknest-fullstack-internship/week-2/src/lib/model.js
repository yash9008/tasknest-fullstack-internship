export const STATUS = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};
export const PRIORITY = { low: "Low", normal: "Normal", high: "High" };
export const PAGE_SIZE = 5;
export const utcToday = () => new Date().toISOString().slice(0, 10);
export const isOverdue = (task, today = utcToday()) =>
  Boolean(task.dueDate && task.dueDate < today && task.status !== "done");
export function summarize(tasks, today = utcToday()) {
  return {
    total: tasks.length,
    open: tasks.filter((t) => t.status !== "done").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => isOverdue(t, today)).length,
  };
}
export function filterTasks(
  tasks,
  { q = "", status = "", priority = "" } = {},
) {
  const search = q.trim().toLocaleLowerCase();
  return tasks
    .filter(
      (t) =>
        (!search || t.title.toLocaleLowerCase().includes(search)) &&
        (!status || t.status === status) &&
        (!priority || t.priority === priority),
    )
    .sort(
      (a, b) =>
        a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
    );
}
export function paginate(items, page = 1, size = PAGE_SIZE) {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const safePage = Math.min(pages, Math.max(1, Number(page) || 1));
  return {
    items: items.slice((safePage - 1) * size, safePage * size),
    page: safePage,
    pages,
    total: items.length,
  };
}
export function validateProject(input) {
  const fields = {};
  if (!input.name?.trim() || input.name.trim().length > 80)
    fields.name = "Enter a project name between 1 and 80 characters.";
  if ((input.description || "").length > 2000)
    fields.description = "Keep the description within 2,000 characters.";
  return fields;
}
export function validateTask(input) {
  const fields = {};
  if (!input.title?.trim() || input.title.trim().length > 200)
    fields.title = "Enter a task title between 1 and 200 characters.";
  if ((input.description || "").length > 2000)
    fields.description = "Keep the description within 2,000 characters.";
  if (!(input.status in STATUS)) fields.status = "Choose a valid status.";
  if (!(input.priority in PRIORITY))
    fields.priority = "Choose a valid priority.";
  if (input.dueDate) {
    const date = new Date(`${input.dueDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate) ||
      Number.isNaN(+date) ||
      date.toISOString().slice(0, 10) !== input.dueDate
    )
      fields.dueDate = "Choose a valid calendar date.";
  }
  return fields;
}
export function formatDate(date) {
  if (!date) return "No due date";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

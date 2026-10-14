import React from "react";
import { SummaryStats, TaskRow, EmptyState } from "../components/Workspace.jsx";
import {
  STATUS,
  PRIORITY,
  filterTasks,
  paginate,
  summarize,
} from "../lib/model.js";
import { navigate, queryRoute } from "../lib/router.js";
export default function Project({
  project,
  tasks,
  params,
  onEditProject,
  onDeleteProject,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onToggle,
  busy,
}) {
  if (!project)
    return (
      <EmptyState
        title="Project not found"
        description="It may have been deleted. Return to the dashboard to choose another project."
        action={() => navigate("/dashboard")}
        label="Back to dashboard"
      />
    );
  const path = "/projects/" + encodeURIComponent(project.id);
  const filters = {
    q: params.get("q") || "",
    status: params.get("status") || "",
    priority: params.get("priority") || "",
  };
  const visible = filterTasks(tasks, filters),
    page = paginate(visible, params.get("page"));
  const update = (key, value) =>
    navigate(queryRoute(path, { [key]: value, page: "" }, params));
  const stats = summarize(tasks),
    percent = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  return (
    <>
      <a className="breadcrumb" href="#/dashboard">
        ← All projects
      </a>
      <div className="page-heading project-heading">
        <div>
          <p className="eyebrow">PROJECT WORKSPACE</p>
          <h1 tabIndex="-1">{project.name}</h1>
          <p>
            {project.description ||
              "Add a description to give this project a little direction."}
          </p>
        </div>
        <div className="heading-actions">
          <button className="button secondary" onClick={onEditProject}>
            Edit project
          </button>
          <button className="button danger-outline" onClick={onDeleteProject}>
            Delete project
          </button>
        </div>
      </div>
      <div className="project-progress">
        <span>
          {stats.done} of {stats.total} tasks completed
        </span>
        <progress max="100" value={percent} aria-label="Project completion" />
        <strong>{percent}%</strong>
      </div>
      <SummaryStats tasks={tasks} />
      <section aria-labelledby="tasks-heading">
        <div className="section-header">
          <h2 id="tasks-heading">
            The next small steps <span className="count">{tasks.length}</span>
          </h2>
          <button className="button" onClick={onCreateTask}>
            <span aria-hidden="true">+</span> New task
          </button>
        </div>
        <div className="filter-bar">
          <label className="filter-search">
            Search tasks
            <input
              type="search"
              value={filters.q}
              placeholder="Find a task by title…"
              onChange={(e) => update("q", e.target.value)}
            />
          </label>
          <label>
            Status
            <select
              aria-label="Status"
              value={filters.status}
              onChange={(e) => update("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {Object.entries(STATUS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select
              aria-label="Priority"
              value={filters.priority}
              onChange={(e) => update("priority", e.target.value)}
            >
              <option value="">All priorities</option>
              {Object.entries(PRIORITY).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {Object.values(filters).some(Boolean) && (
            <button className="text-button" onClick={() => navigate(path)}>
              Clear filters
            </button>
          )}
        </div>
        {page.total ? (
          <>
            <p className="result-count" aria-live="polite">
              Showing {(page.page - 1) * 5 + 1}–
              {Math.min(page.page * 5, page.total)} of {page.total} tasks
            </p>
            <div className="task-list" aria-busy={busy}>
              {page.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggle={onToggle}
                  busy={busy}
                />
              ))}
            </div>
            <nav className="pagination" aria-label="Task pages">
              <button
                className="button secondary"
                disabled={page.page === 1}
                onClick={() =>
                  navigate(queryRoute(path, { page: page.page - 1 }, params))
                }
              >
                Previous
              </button>
              <span>
                Page {page.page} of {page.pages}
              </span>
              <button
                className="button secondary"
                disabled={page.page === page.pages}
                onClick={() =>
                  navigate(queryRoute(path, { page: page.page + 1 }, params))
                }
              >
                Next
              </button>
            </nav>
          </>
        ) : (
          <EmptyState
            title={
              tasks.length ? "No tasks match these filters" : "A fresh start"
            }
            description={
              tasks.length
                ? "Try changing the status, priority, or search terms."
                : "Add the first task to turn this idea into a plan."
            }
            action={tasks.length ? () => navigate(path) : onCreateTask}
            label={tasks.length ? "Clear filters" : "Add your first task"}
          />
        )}
      </section>
    </>
  );
}

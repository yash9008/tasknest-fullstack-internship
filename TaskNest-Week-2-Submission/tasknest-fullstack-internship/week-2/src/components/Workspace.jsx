import React from "react";
import {
  summarize,
  STATUS,
  PRIORITY,
  isOverdue,
  formatDate,
} from "../lib/model.js";
export function SummaryStats({ tasks }) {
  const s = summarize(tasks);
  return (
    <div className="stats-grid">
      {[
        ["Open tasks", s.open, "One step at a time", "purple"],
        ["Completed", s.done, "Progress worth keeping", "green"],
        ["Overdue", s.overdue, "A little attention needed", "orange"],
      ].map(([name, value, note, color]) => (
        <div className="stat" key={name}>
          <span className={"stat-marker " + color} aria-hidden="true"></span>
          <p>{name}</p>
          <strong>{value}</strong>
          <span>{note}</span>
        </div>
      ))}
    </div>
  );
}
export function ProjectCard({ project, tasks, index = 0 }) {
  const s = summarize(tasks),
    percent = s.total ? Math.round((s.done / s.total) * 100) : 0;
  return (
    <article className="project-card">
      <div className="project-card-top">
        <span
          className={"project-icon color-" + (index % 3)}
          aria-hidden="true"
        >
          {project.name.slice(0, 1).toUpperCase()}
        </span>
        <span>
          {s.open} open {s.open === 1 ? "task" : "tasks"}
        </span>
      </div>
      <h3>
        <a href={"#/projects/" + encodeURIComponent(project.id)}>
          {project.name}
        </a>
      </h3>
      <p>{project.description || "A blank canvas for your next idea."}</p>
      <div className="progress-label">
        <span>
          {s.done} of {s.total} completed
        </span>
        <strong>{percent}%</strong>
      </div>
      <progress
        max="100"
        value={percent}
        aria-label={`${project.name} completion`}
      />
      <a
        className="project-card-footer"
        href={"#/projects/" + encodeURIComponent(project.id)}
      >
        Open project <span aria-hidden="true">↗</span>
      </a>
    </article>
  );
}
export function TaskRow({ task, onEdit, onDelete, onToggle, busy }) {
  return (
    <article
      className={"task-row " + (task.status === "done" ? "task-done" : "")}
    >
      <button
        className={
          "completion-button " + (task.status === "done" ? "is-done" : "")
        }
        aria-label={
          (task.status === "done" ? "Reopen task: " : "Complete task: ") +
          task.title
        }
        aria-pressed={task.status === "done"}
        onClick={() => onToggle(task)}
        disabled={busy}
      >
        <span aria-hidden="true">{task.status === "done" ? "✓" : ""}</span>
      </button>
      <div className="task-content">
        <h3>{task.title}</h3>
        {task.description && <p>{task.description}</p>}
        <div className="task-meta">
          <span className={"badge " + task.status}>{STATUS[task.status]}</span>
          <span className={"priority " + task.priority}>
            {PRIORITY[task.priority]} priority
          </span>
          <span className={isOverdue(task) ? "overdue" : ""}>
            {isOverdue(task) ? "Overdue · " : ""}
            {formatDate(task.dueDate)}
          </span>
        </div>
      </div>
      <div className="task-actions">
        <button
          onClick={() => onEdit(task)}
          className="text-button"
          aria-label={"Edit task: " + task.title}
          disabled={busy}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(task)}
          className="text-button delete-link"
          aria-label={"Delete task: " + task.title}
          disabled={busy}
        >
          Delete
        </button>
      </div>
    </article>
  );
}
export function EmptyState({ title, description, action, label }) {
  return (
    <div className="empty-state">
      <span aria-hidden="true">✳</span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && (
        <button className="button" onClick={action}>
          {label}
        </button>
      )}
    </div>
  );
}

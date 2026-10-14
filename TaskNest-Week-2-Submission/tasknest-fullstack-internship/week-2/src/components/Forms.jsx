import React, { useEffect, useRef, useState } from "react";
import Modal from "./Modal.jsx";
import {
  STATUS,
  PRIORITY,
  validateProject,
  validateTask,
} from "../lib/model.js";
function useSubmission(validate, onSave) {
  const [fields, setFields] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const form = useRef(null);
  useEffect(() => {
    if (Object.keys(fields).length)
      form.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [fields]);
  const submit = async (e, values) => {
    e.preventDefault();
    if (busy) return;
    const errors = validate(values);
    setFields(errors);
    setError("");
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await onSave(values);
    } catch (e) {
      setFields(e.fields || {});
      setError(e.message || "Could not save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return { fields, error, busy, submit, form };
}
export function ProjectForm({ project, onSave, onClose }) {
  const [values, setValues] = useState({
    name: project?.name || "",
    description: project?.description || "",
  });
  const state = useSubmission(validateProject, onSave);
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <Modal
      title={project ? "Edit project" : "New project"}
      onClose={onClose}
      busy={state.busy}
    >
      <form
        ref={state.form}
        noValidate
        onSubmit={(e) => state.submit(e, values)}
      >
        <p className="form-intro">
          A project gives related tasks one place to live.
        </p>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <fieldset disabled={state.busy}>
          <label htmlFor="project-name">
            Project name <span className="required">Required</span>
          </label>
          <input
            id="project-name"
            value={values.name}
            onChange={(e) => set("name", e.target.value)}
            required
            maxLength={80}
            autoFocus
            aria-invalid={Boolean(state.fields.name)}
            aria-describedby={
              state.fields.name ? "project-name-error" : undefined
            }
          />
          {state.fields.name && (
            <p className="field-error" id="project-name-error">
              {state.fields.name}
            </p>
          )}
          <label htmlFor="project-description">
            Description <span className="optional">Optional</span>
          </label>
          <textarea
            id="project-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={2000}
            rows={4}
            aria-invalid={Boolean(state.fields.description)}
          />
          {state.fields.description && (
            <p className="field-error">{state.fields.description}</p>
          )}
        </fieldset>
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={state.busy}
          >
            Cancel
          </button>
          <button className="button" type="submit" disabled={state.busy}>
            {state.busy ? "Saving…" : "Save project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function TaskForm({ task, onSave, onClose }) {
  const [values, setValues] = useState({
    title: task?.title || "",
    description: task?.description || "",
    status: task?.status || "todo",
    priority: task?.priority || "normal",
    dueDate: task?.dueDate || "",
  });
  const state = useSubmission(validateTask, onSave);
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  return (
    <Modal
      title={task ? "Edit task" : "New task"}
      onClose={onClose}
      busy={state.busy}
    >
      <form
        ref={state.form}
        noValidate
        onSubmit={(e) => state.submit(e, values)}
      >
        <p className="form-intro">
          Keep it specific. A small next step is a good start.
        </p>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        <fieldset disabled={state.busy}>
          <label htmlFor="task-title">
            Task title <span className="required">Required</span>
          </label>
          <input
            id="task-title"
            value={values.title}
            onChange={(e) => set("title", e.target.value)}
            maxLength={200}
            required
            autoFocus
            aria-invalid={Boolean(state.fields.title)}
            aria-describedby={
              state.fields.title ? "task-title-error" : undefined
            }
          />
          {state.fields.title && (
            <p id="task-title-error" className="field-error">
              {state.fields.title}
            </p>
          )}
          <label htmlFor="task-description">
            Description <span className="optional">Optional</span>
          </label>
          <textarea
            id="task-description"
            value={values.description}
            onChange={(e) => set("description", e.target.value)}
            maxLength={2000}
            rows={3}
          />
          <div className="form-grid">
            <div>
              <label htmlFor="task-status">Status</label>
              <select
                id="task-status"
                value={values.status}
                onChange={(e) => set("status", e.target.value)}
              >
                {Object.entries(STATUS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={values.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                {Object.entries(PRIORITY).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label htmlFor="task-date">
            Due date <span className="optional">Optional</span>
          </label>
          <input
            type="date"
            id="task-date"
            value={values.dueDate}
            onChange={(e) => set("dueDate", e.target.value)}
            aria-invalid={Boolean(state.fields.dueDate)}
            aria-describedby="due-hint"
          />
          <p className="input-hint" id="due-hint">
            Overdue means before today's UTC date, unless the task is done.
          </p>
          {state.fields.dueDate && (
            <p className="field-error">{state.fields.dueDate}</p>
          )}
        </fieldset>
        <div className="dialog-actions">
          <button
            type="button"
            className="button secondary"
            onClick={onClose}
            disabled={state.busy}
          >
            Cancel
          </button>
          <button className="button" type="submit" disabled={state.busy}>
            {state.busy ? "Saving…" : "Save task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export function ConfirmDialog({ title, message, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await onConfirm();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={title} onClose={onClose} busy={busy}>
      <p>{message}</p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <button
          className="button secondary"
          onClick={onClose}
          autoFocus
          disabled={busy}
        >
          Cancel
        </button>
        <button className="button danger" onClick={confirm} disabled={busy}>
          {busy ? "Working…" : "Confirm"}
        </button>
      </div>
    </Modal>
  );
}

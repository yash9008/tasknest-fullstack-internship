import React, { useCallback, useEffect, useState } from "react";
import { service } from "./services/index.js";
import { navigate, useRoute } from "./lib/router.js";
import { ProjectForm, TaskForm, ConfirmDialog } from "./components/Forms.jsx";
import { EmptyState } from "./components/Workspace.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Project from "./pages/Project.jsx";
const Brand = () => (
  <a className="brand" href="#/" aria-label="TaskNest home">
    <span aria-hidden="true">✳</span>tasknest
    <span className="brand-period">.</span>
  </a>
);
export default function App() {
  const route = useRoute();
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null);
  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await service.loadWorkspace();
      setData(result.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);
  useEffect(() => {
    document.title =
      route.path === "/"
        ? "TaskNest | Your next idea"
        : route.path === "/dashboard"
          ? "Dashboard | TaskNest"
          : "Project workspace | TaskNest";
    if (!loading) {
      document.querySelector("main h1")?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [route.path, loading]);
  async function mutate(operation, message, destination) {
    // Keep the editor open if the mutation fails. Do not announce an unsaved change.
    await operation();
    try {
      const result = await service.loadWorkspace();
      setData(result.data);
      setError("");
    } catch (e) {
      setError(
        `The change was saved, but the workspace could not be refreshed. ${e.message}`,
      );
    }
    setModal(null);
    setNotice({ type: "success", text: message });
    if (destination) navigate(destination);
  }
  async function toggle(task) {
    if (busy) return;
    setBusy(true);
    try {
      await mutate(
        () =>
          service.updateTask(task.id, {
            ...task,
            status: task.status === "done" ? "todo" : "done",
          }),
        task.status === "done" ? "Task reopened." : "Task completed.",
      );
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      setBusy(false);
    }
  }
  const isLanding = route.path === "/";
  let projectId = "";
  try {
    if (route.path.startsWith("/projects/"))
      projectId = decodeURIComponent(route.path.slice(10));
  } catch {
    /* unknown route uses the not-found state */
  }
  const project = data?.projects.find((p) => p.id === projectId);
  const projectTasks =
    data?.tasks.filter((t) => t.projectId === projectId) || [];
  const restore = () =>
    setModal({
      type: "confirm",
      title: "Restore sample workspace?",
      message:
        "This will replace every project and task saved by this demo in this browser. Your current demo changes will be removed.",
      action: () =>
        mutate(
          () => service.restoreSamples(),
          "Sample workspace restored.",
          "/dashboard",
        ),
    });
  const taskDelete = (t) =>
    setModal({
      type: "confirm",
      title: "Delete task?",
      message: `Delete “${t.title}”? This removes the task from this demo workspace.`,
      action: () => mutate(() => service.deleteTask(t.id), "Task deleted."),
    });
  const projectDelete = () =>
    setModal({
      type: "confirm",
      title: "Delete project?",
      message: `Delete “${project.name}” and all ${projectTasks.length} of its tasks? This removes them from this demo workspace.`,
      action: () =>
        mutate(
          () => service.deleteProject(project.id),
          "Project and its tasks deleted.",
          "/dashboard",
        ),
    });
  return (
    <>
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      {isLanding ? (
        <>
          <header className="public-header">
            <Brand />
            <a className="button secondary" href="#/dashboard">
              Open workspace <span aria-hidden="true">↗</span>
            </a>
          </header>
          <Landing />
          <footer className="public-footer">
            <Brand />
            <span>YuvaIntern · Junior Full Stack Developer · Week 2</span>
          </footer>
        </>
      ) : (
        <div className="app-shell">
          <aside className="sidebar">
            <Brand />
            <p className="sidebar-label">PERSONAL WORKSPACE</p>
            <nav aria-label="Workspace navigation">
              <a
                href="#/dashboard"
                className="sidebar-link active"
                aria-current={route.path === "/dashboard" ? "page" : undefined}
              >
                <span aria-hidden="true">▦</span> Dashboard
              </a>
              <a href="#/" className="sidebar-link">
                <span aria-hidden="true">⌂</span> About TaskNest
              </a>
            </nav>
            <div className="sidebar-tip">
              <span aria-hidden="true">✳</span>
              <p>
                A little focus
                <br />
                goes a long way.
              </p>
            </div>
            <div className="sidebar-profile">
              <span className="avatar">Y</span>
              <div>
                <strong>Yash's demo</strong>
                <span>Personal workspace</span>
              </div>
            </div>
          </aside>
          <div className="workspace">
            <header className="workspace-header">
              <span>
                Workspace <span className="header-slash">/</span>{" "}
                {project ? "Project details" : "Overview"}
              </span>
              <span className="demo-badge">
                <span aria-hidden="true">●</span>{" "}
                {service.mode === "demo" ? "Browser demo" : "API mode"}
              </span>
            </header>
            <div className="demo-banner">
              <span>
                {service.mode === "demo"
                  ? "Sample workspace. Changes are saved in this browser; no real account is required."
                  : "API mode requires the later backend and an authenticated same-origin session."}
              </span>
              {service.mode === "demo" && (
                <button className="text-button" onClick={restore}>
                  Restore sample data
                </button>
              )}
            </div>
            <main id="main-content" className="workspace-main" tabIndex="-1">
              {notice && (
                <div
                  className={"notice " + notice.type}
                  role={notice.type === "error" ? "alert" : "status"}
                >
                  <span>{notice.text}</span>
                  <button
                    aria-label="Dismiss notification"
                    className="icon-button"
                    onClick={() => setNotice(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              {loading ? (
                <div className="loading-state" role="status">
                  <span className="spinner" aria-hidden="true"></span>
                  <h1>Opening your workspace…</h1>
                  <p>Getting your projects and tasks ready.</p>
                </div>
              ) : error ? (
                <div className="error-state" role="alert">
                  <h1 tabIndex="-1">The workspace needs a moment.</h1>
                  <p>{error}</p>
                  <button className="button" onClick={refresh}>
                    Retry
                  </button>
                  {service.mode === "demo" && (
                    <button className="button secondary" onClick={restore}>
                      Restore sample workspace
                    </button>
                  )}
                </div>
              ) : route.path === "/dashboard" ? (
                <Dashboard
                  data={data}
                  params={route.params}
                  onCreate={() => setModal({ type: "project" })}
                />
              ) : projectId ? (
                <Project
                  project={project}
                  tasks={projectTasks}
                  params={route.params}
                  onEditProject={() => setModal({ type: "project", project })}
                  onDeleteProject={projectDelete}
                  onCreateTask={() => setModal({ type: "task" })}
                  onEditTask={(task) => setModal({ type: "task", task })}
                  onDeleteTask={taskDelete}
                  onToggle={toggle}
                  busy={busy}
                />
              ) : (
                <EmptyState
                  title="This page isn't here"
                  description="Choose a project from the dashboard to get back to your work."
                  action={() => navigate("/dashboard")}
                  label="Open dashboard"
                />
              )}
            </main>
            <footer className="workspace-footer">
              <span>TaskNest · Week 2 frontend</span>
              <span>A small step is still a step.</span>
            </footer>
          </div>
        </div>
      )}
      {modal?.type === "project" && (
        <ProjectForm
          project={modal.project}
          onClose={() => setModal(null)}
          onSave={(values) =>
            mutate(
              () =>
                modal.project
                  ? service.updateProject(modal.project.id, values)
                  : service.createProject(values),
              modal.project ? "Project updated." : "Project created.",
            )
          }
        />
      )}
      {modal?.type === "task" && (
        <TaskForm
          task={modal.task}
          onClose={() => setModal(null)}
          onSave={(values) =>
            mutate(
              () =>
                modal.task
                  ? service.updateTask(modal.task.id, values)
                  : service.createTask(projectId, values),
              modal.task ? "Task updated." : "Task created.",
            )
          }
        />
      )}
      {modal?.type === "confirm" && (
        <ConfirmDialog
          title={modal.title}
          message={modal.message}
          onConfirm={modal.action}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}

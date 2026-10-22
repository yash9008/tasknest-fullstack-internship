import React, { useCallback, useEffect, useRef, useState } from "react";
import { service } from "./services/index.js";
import { navigate, useRoute } from "./lib/router.js";
import { ProjectForm, TaskForm, ConfirmDialog } from "./components/Forms.jsx";
import { EmptyState } from "./components/Workspace.jsx";
import Landing from "./pages/Landing.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Project from "./pages/Project.jsx";
import Auth from "./pages/Auth.jsx";
const Brand = () => (
  <a className="brand" href="#/" aria-label="TaskNest home">
    <span aria-hidden="true">✳</span>tasknest
    <span className="brand-period">.</span>
  </a>
);
export default function App() {
  const route = useRoute();
  const [session, setSession] = useState({ status: "loading", user: null }),
    [authMessage, setAuthMessage] = useState("");
  const [data, setData] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState(null);
  const generation = useRef(0),
    mutationLock = useRef(false),
    mounted = useRef(true);
  const invalidate = useCallback((message = "") => {
    generation.current++;
    setSession({ status: "ready", user: null });
    setData(null);
    setModal(null);
    setError("");
    setNotice(null);
    setAuthMessage(message);
  }, []);
  const bootstrap = useCallback(async () => {
    const ticket = ++generation.current;
    setSession({ status: "loading", user: null });
    try {
      const result = await service.session();
      if (mounted.current && ticket === generation.current)
        setSession({ status: "ready", user: result.data.user });
    } catch (e) {
      if (mounted.current && ticket === generation.current)
        setSession({ status: "error", user: null, error: e.message });
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    const unsubscribe = service.onSessionLost(() =>
      invalidate("Your session expired or changed. Sign in again to continue."),
    );
    bootstrap();
    return () => {
      mounted.current = false;
      generation.current++;
      unsubscribe();
    };
  }, [bootstrap, invalidate]);
  const refresh = useCallback(async () => {
    const ticket = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await service.loadWorkspace();
      if (mounted.current && ticket === generation.current)
        setData(result.data);
    } catch (e) {
      if (mounted.current && ticket === generation.current) setError(e.message);
    } finally {
      if (mounted.current && ticket === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    if (session.user) refresh();
  }, [session.user?.id, refresh]);
  useEffect(() => {
    document.title =
      route.path === "/"
        ? "TaskNest | Your next idea"
        : route.path === "/register"
          ? "Create account | TaskNest"
          : route.path === "/login"
            ? "Sign in | TaskNest"
            : route.path === "/dashboard"
              ? "Dashboard | TaskNest"
              : "Project workspace | TaskNest";
    if (!loading) {
      document.querySelector("main h1")?.focus();
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  }, [route.path, loading]);
  useEffect(() => {
    if (session.user && ["/login", "/register"].includes(route.path))
      navigate("/dashboard");
  }, [session.user, route.path]);
  async function authenticate(mode, input) {
    const result = await service.authenticate(mode, input);
    generation.current++;
    setData(null);
    setLoading(true);
    setAuthMessage("");
    setNotice(null);
    setSession({ status: "ready", user: result.data.user });
    if (["/", "/login", "/register"].includes(route.path))
      navigate("/dashboard");
  }
  async function logout() {
    if (mutationLock.current) return;
    mutationLock.current = true;
    setBusy(true);
    try {
      await service.logout();
      invalidate();
      navigate("/login");
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    } finally {
      mutationLock.current = false;
      setBusy(false);
    }
  }
  async function mutate(operation, message, destination) {
    if (mutationLock.current)
      throw new Error("Another change is still being saved.");
    mutationLock.current = true;
    setBusy(true);
    const ticket = ++generation.current;
    try {
      await operation();
      if (ticket !== generation.current || !mounted.current) return;
      try {
        const result = await service.loadWorkspace();
        if (ticket !== generation.current || !mounted.current) return;
        setData(result.data);
        setError("");
      } catch (e) {
        if (ticket !== generation.current || !mounted.current) return;
        setError(
          `The change was saved, but the workspace could not be refreshed. ${e.message}`,
        );
      }
      setModal(null);
      setNotice({ type: "success", text: message });
      if (destination) navigate(destination);
    } finally {
      mutationLock.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  async function toggle(task) {
    if (mutationLock.current) return;
    try {
      await mutate(
        () =>
          service.updateTask(task.id, {
            status: task.status === "done" ? "todo" : "done",
          }),
        task.status === "done" ? "Task reopened." : "Task completed.",
      );
    } catch (e) {
      setNotice({ type: "error", text: e.message });
    }
  }
  let projectId = "";
  try {
    if (route.path.startsWith("/projects/"))
      projectId = decodeURIComponent(route.path.slice(10));
  } catch {}
  const project = data?.projects.find((p) => p.id === projectId),
    projectTasks = data?.tasks.filter((t) => t.projectId === projectId) || [];
  const landing = route.path === "/",
    publicPage = landing || !session.user;
  const taskDelete = (t) =>
    setModal({
      type: "confirm",
      title: "Delete task?",
      message: `Delete “${t.title}”? This permanently removes it from your account.`,
      action: () => mutate(() => service.deleteTask(t.id), "Task deleted."),
    });
  const projectDelete = () =>
    setModal({
      type: "confirm",
      title: "Delete project?",
      message: `Delete “${project.name}” and all ${projectTasks.length} tasks? This permanently removes them from your account.`,
      action: () =>
        mutate(
          () => service.deleteProject(project.id),
          "Project and its tasks deleted.",
          "/dashboard",
        ),
    });
  const loadingView = (
    <div className="loading-state" role="status">
      <span className="spinner" aria-hidden="true" />
      <h1 tabIndex="-1">Opening your workspace…</h1>
      <p>Getting your projects and tasks ready.</p>
    </div>
  );
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
      {publicPage ? (
        <>
          <header className="public-header">
            <Brand />
            <a
              className="button secondary"
              href={session.user ? "#/dashboard" : "#/login"}
            >
              {session.user ? "Open workspace" : "Sign in"}{" "}
              <span aria-hidden="true">↗</span>
            </a>
          </header>
          {landing ? (
            <Landing signedIn={Boolean(session.user)} />
          ) : session.status === "loading" ? (
            <main id="main-content" className="auth-loading" tabIndex="-1">
              {loadingView}
            </main>
          ) : session.status === "error" ? (
            <main id="main-content" className="auth-loading" tabIndex="-1">
              <div className="error-state" role="alert">
                <h1>Could not connect</h1>
                <p>{session.error}</p>
                <button className="button" onClick={bootstrap}>
                  Retry connection
                </button>
              </div>
            </main>
          ) : (
            <Auth
              key={route.path === "/register" ? "register" : "login"}
              mode={route.path === "/register" ? "register" : "login"}
              message={authMessage}
              onAuthenticate={authenticate}
            />
          )}
          <footer className="public-footer">
            <Brand />
            <span>
              YuvaIntern · Junior Full Stack Developer Intern · Week 4
            </span>
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
                className={
                  "sidebar-link" +
                  (route.path === "/dashboard" ? " active" : "")
                }
                aria-current={route.path === "/dashboard" ? "page" : undefined}
              >
                <span aria-hidden="true">▦</span>Dashboard
              </a>
              <a href="#/" className="sidebar-link">
                <span aria-hidden="true">⌂</span>About TaskNest
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
              <span className="avatar" aria-hidden="true">
                {session.user.name.slice(0, 1).toUpperCase()}
              </span>
              <div>
                <strong>{session.user.name}</strong>
                <span>Personal workspace</span>
              </div>
            </div>
          </aside>
          <div className="workspace">
            <header className="workspace-header">
              <span>
                Workspace <span className="header-slash">/</span>
                {project ? "Project details" : "Overview"}
              </span>
              <div className="account-actions">
                <span className="demo-badge">
                  <span aria-hidden="true">●</span>Connected
                </span>
                <button
                  className="text-button"
                  disabled={busy || loading}
                  onClick={refresh}
                >
                  Refresh
                </button>
                <button
                  className="text-button"
                  disabled={busy}
                  onClick={logout}
                >
                  Sign out
                </button>
              </div>
            </header>
            <div className="demo-banner">
              <span>
                Welcome, {session.user.name}. Your changes are saved to your
                account.
              </span>
            </div>
            <main id="main-content" className="workspace-main" tabIndex="-1">
              {notice && (
                <div
                  className={"notice " + notice.type}
                  role={notice.type === "error" ? "alert" : "status"}
                >
                  <span>{notice.text}</span>
                  <button
                    className="icon-button"
                    aria-label="Dismiss notification"
                    onClick={() => setNotice(null)}
                  >
                    ×
                  </button>
                </div>
              )}
              {loading ? (
                loadingView
              ) : error ? (
                <div className="error-state" role="alert">
                  <h1 tabIndex="-1">The workspace needs a moment.</h1>
                  <p>{error}</p>
                  <button className="button" onClick={refresh}>
                    Retry
                  </button>
                </div>
              ) : !data ? (
                loadingView
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
                  description="Choose a project from the dashboard to return to your work."
                  action={() => navigate("/dashboard")}
                  label="Open dashboard"
                />
              )}
            </main>
            <footer className="workspace-footer">
              <span>TaskNest · Week 4 integrated application</span>
              <span>A small step is still a step.</span>
            </footer>
          </div>
        </div>
      )}
      {session.user && modal?.type === "project" && (
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
      {session.user && modal?.type === "task" && (
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
      {session.user && modal?.type === "confirm" && (
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

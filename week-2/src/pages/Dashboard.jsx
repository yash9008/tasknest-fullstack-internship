import React from "react";
import {
  SummaryStats,
  ProjectCard,
  EmptyState,
} from "../components/Workspace.jsx";
import { navigate, queryRoute } from "../lib/router.js";
export default function Dashboard({ data, params, onCreate }) {
  const q = params.get("q") || "";
  const projects = data.projects.filter((p) =>
    p.name.toLocaleLowerCase().includes(q.toLocaleLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1 tabIndex="-1">Make room for what matters.</h1>
          <p>Your ideas, your next steps, all in one place.</p>
        </div>
        <button className="button" onClick={onCreate}>
          <span aria-hidden="true">+</span> New project
        </button>
      </div>
      <SummaryStats tasks={data.tasks} />
      <section aria-labelledby="projects-heading">
        <div className="section-header">
          <div>
            <p className="eyebrow">A PLACE FOR EVERY IDEA</p>
            <h2 id="projects-heading">
              Your projects{" "}
              <span className="count">{data.projects.length}</span>
            </h2>
          </div>
          <label className="search-label">
            <span className="sr-only">Search projects</span>
            <input
              type="search"
              placeholder="Search projects…"
              value={q}
              onChange={(e) =>
                navigate(queryRoute("/dashboard", { q: e.target.value }))
              }
            />
          </label>
        </div>
        {projects.length ? (
          <div className="project-grid">
            {projects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                tasks={data.tasks.filter((t) => t.projectId === project.id)}
                index={index}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title={
              data.projects.length
                ? "No matching projects"
                : "Your next idea starts here"
            }
            description={
              data.projects.length
                ? "Try another search, or clear the search field."
                : "Create a project, then add a few small steps."
            }
            action={
              data.projects.length ? () => navigate("/dashboard") : onCreate
            }
            label={
              data.projects.length
                ? "Clear search"
                : "Create your first project"
            }
          />
        )}
      </section>
      <div className="workspace-bottom">
        <span aria-hidden="true">✳</span>
        <p>
          Progress is a collection of small steps.
          <br />
          <strong>You don't have to do them all today.</strong>
        </p>
      </div>
    </>
  );
}

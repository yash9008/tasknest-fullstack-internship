import React from "react";
export default function Landing({ signedIn }) {
  return (
    <main id="main-content" className="landing-main" tabIndex="-1">
      <section className="landing-hero">
        <div>
          <p className="eyebrow">LESS SCATTER. MORE MOMENTUM.</p>
          <h1 tabIndex="-1">
            A little structure.
            <br />A lot of <em>possibility.</em>
          </h1>
          <p className="lead">
            Give your projects a home. Break big ideas into small steps, keep
            the important things close, and see how far you've come.
          </p>
          <a className="button large" href={signedIn ? "#/dashboard" : "#/register"}>
            {signedIn ? "Open your workspace" : "Create your workspace"} <span aria-hidden="true">↗</span>
          </a>
          <p className="demo-caption">
            Your own account. Your own projects. Progress saved as you go.
          </p>
        </div>
        <div
          className="landing-board"
          aria-label="Illustrative project preview"
        >
          <div className="board-header">
            <span className="tiny-mark">✳</span>
            <span>YOUR NEXT CHAPTER</span>
            <span>↗</span>
          </div>
          <div className="board-sheet">
            <p className="eyebrow">PERSONAL PORTFOLIO</p>
            <h2>
              Make something
              <br />
              you're proud of.
            </h2>
            <div className="illustrative-progress">
              <span></span>
            </div>
            <div className="illustrative-task">
              <span>✓</span> Sketch the homepage <small>Done</small>
            </div>
            <div className="illustrative-task">
              <span className="outline"></span> Build the gallery{" "}
              <small>In progress</small>
            </div>
            <div className="illustrative-task">
              <span className="outline"></span> Share the story{" "}
              <small>To do</small>
            </div>
          </div>
          <div className="board-sticker">
            Small steps.
            <br />
            <em>Real progress.</em>
          </div>
        </div>
      </section>
      <section className="landing-features" aria-label="Workspace features">
        {[
          [
            "01",
            "One home for your ideas",
            "Organize related work into projects with a name, a purpose, and a clear next step.",
          ],
          [
            "02",
            "The right work, in focus",
            "Search tasks, combine status and priority filters, and keep deadlines in view.",
          ],
          [
            "03",
            "Progress you can see",
            "Watch completion totals update as you check tasks off. Pick up where you left off.",
          ],
        ].map(([n, t, p]) => (
          <article key={n}>
            <span>{n}</span>
            <h2>{t}</h2>
            <p>{p}</p>
          </article>
        ))}
      </section>
      <aside className="landing-note">
        <p>
          <strong>A student project with room to grow.</strong> TaskNest is the
          Week 4 integrated application for the YuvaIntern Junior Full Stack Developer
          internship. This version connects the React interface to a PostgreSQL-backed API with authenticated accounts.
        </p>
        <a href={signedIn ? "#/dashboard" : "#/register"}>Try the workspace →</a>
      </aside>
    </main>
  );
}

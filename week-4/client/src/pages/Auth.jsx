import React, { useEffect, useRef, useState } from "react";
export default function Auth({ mode, onAuthenticate, message }) {
  const register = mode === "register";
  const [values, setValues] = useState({ name: "", email: "", password: "" }),
    [fields, setFields] = useState({}),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const form = useRef(null),
    heading = useRef(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    if (Object.keys(fields).length)
      form.current?.querySelector('[aria-invalid="true"]')?.focus();
  }, [fields]);
  const set = (key, value) => setValues((v) => ({ ...v, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    const errors = {};
    if (register && (!values.name.trim() || values.name.trim().length > 80))
      errors.name = "Enter a name using 1–80 characters.";
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()) ||
      values.email.trim().length > 254
    )
      errors.email = "Enter a valid email address.";
    if (values.password.length < 12 || values.password.length > 128)
      errors.password = "Use 12–128 characters. Spaces are preserved.";
    setFields(errors);
    setError("");
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      await onAuthenticate(mode, {
        ...(register ? { name: values.name.trim() } : {}),
        email: values.email.trim(),
        password: values.password,
      });
    } catch (e) {
      setFields(e.fields || {});
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main id="main-content" className="auth-main" tabIndex="-1">
      <section className="auth-story">
        <p className="eyebrow">ONE HOME FOR YOUR NEXT CHAPTER</p>
        <h1 ref={heading} tabIndex="-1">
          {register
            ? "Make room for your ideas."
            : "Pick up where you left off."}
        </h1>
        <p>
          Your projects, tasks, and next small steps. Saved to your account,
          ready when you return.
        </p>
        <div className="auth-art" aria-hidden="true">
          ✳
        </div>
        <p className="auth-caption">
          A little structure. A lot of possibility.
        </p>
      </section>
      <section className="auth-card" aria-labelledby="auth-title">
        <p className="eyebrow">YOUR PERSONAL WORKSPACE</p>
        <h2 id="auth-title">
          {register ? "Create your account" : "Welcome back"}
        </h2>
        <p className="form-intro">
          {register
            ? "Start with an empty workspace and make it yours."
            : "Sign in to open your projects and tasks."}
        </p>
        {message && (
          <p className="form-error" role="status">
            {message}
          </p>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <form ref={form} noValidate onSubmit={submit}>
          <fieldset disabled={busy}>
            {register && (
              <>
                <label htmlFor="account-name">
                  Your name <span className="required">Required</span>
                </label>
                <input
                  id="account-name"
                  autoComplete="name"
                  value={values.name}
                  onChange={(e) => set("name", e.target.value)}
                  maxLength={80}
                  required
                  aria-invalid={Boolean(fields.name)}
                  aria-describedby={
                    fields.name ? "account-name-error" : undefined
                  }
                />
                {fields.name && (
                  <p id="account-name-error" className="field-error">
                    {fields.name}
                  </p>
                )}
              </>
            )}
            <label htmlFor="account-email">
              Email address <span className="required">Required</span>
            </label>
            <input
              id="account-email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={(e) => set("email", e.target.value)}
              maxLength={254}
              required
              aria-invalid={Boolean(fields.email)}
              aria-describedby={
                fields.email ? "account-email-error" : undefined
              }
            />
            {fields.email && (
              <p id="account-email-error" className="field-error">
                {fields.email}
              </p>
            )}
            <label htmlFor="account-password">
              Password <span className="required">Required</span>
            </label>
            <input
              id="account-password"
              type="password"
              autoComplete={register ? "new-password" : "current-password"}
              value={values.password}
              onChange={(e) => set("password", e.target.value)}
              minLength={12}
              maxLength={128}
              required
              aria-invalid={Boolean(fields.password)}
              aria-describedby="password-hint account-password-error"
            />
            <p className="input-hint" id="password-hint">
              Use 12–128 characters. Spaces are preserved.
            </p>
            <p id="account-password-error" className="field-error">
              {fields.password || ""}
            </p>
          </fieldset>
          <button className="button auth-submit" disabled={busy}>
            {busy
              ? "Opening your workspace…"
              : register
                ? "Create account"
                : "Sign in"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </form>
        <p className="auth-switch">
          {register ? "Already have an account?" : "New to TaskNest?"}{" "}
          <a href={register ? "#/login" : "#/register"}>
            {register ? "Sign in" : "Create an account"}
          </a>
        </p>
      </section>
    </main>
  );
}

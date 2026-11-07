import { useState } from "react";
import "../styles/signin.css";

export default function SignInPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Enter your email and password.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // TODO: call your login API here
      console.log(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ph-si-auth">
      <aside className="ph-si-auth__brand">
        <div className="ph-si-auth__logo">
          <span className="ph-si-auth__logo-mark" />
          ProofHire
        </div>

        <div>
          <h1 className="ph-si-auth__headline">
            Prove your skills, not your prompts.
          </h1>
          <p className="ph-si-auth__sub">
            Apply with your CV, then talk through your own work with an AI
            interviewer. Recruiters see who really understands it.
          </p>
        </div>

        <p className="ph-si-auth__footnote">Proof of skills in the AI era</p>
      </aside>

      <main className="ph-si-auth__main">
        <div className="ph-si-card">
          <h2 className="ph-si-card__title">Welcome back</h2>
          <p className="ph-si-card__desc">Sign in to continue to ProofHire.</p>

          <form className="ph-si-form" onSubmit={onSubmit} noValidate>
            <div className="ph-si-field">
              <label className="ph-si-label" htmlFor="email">
                Email
              </label>
              <input
                className="ph-si-input"
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@email.com"
                value={form.email}
                onChange={onChange}
              />
            </div>

            <div className="ph-si-field">
              <label className="ph-si-label" htmlFor="password">
                Password
              </label>
              <input
                className="ph-si-input"
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={form.password}
                onChange={onChange}
                aria-invalid={!!error}
              />
            </div>

            <div className="ph-si-row">
              <a className="ph-si-link" href="/forgot-password">
                Forgot password?
              </a>
            </div>

            {error && (
              <p className="ph-si-error" role="alert">
                {error}
              </p>
            )}

            <button className="ph-si-btn" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="ph-si-card__foot">
            New to ProofHire?{" "}
            <a className="ph-si-link" href="/signup">
              Create account
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}

import { useState } from "react";
import AuthLayout from "../components/AuthLayout.jsx";

export default function SignUp() {
  const [role, setRole] = useState("candidate");
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState("");

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = (e) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setError("");
    // TODO: call your API here
    console.log({ role, ...form });
  };

  return (
    <AuthLayout>
      <div className="ph-card">
        <h2 className="ph-card__title">Create your account</h2>
        <p className="ph-card__desc">
          Choose how you will use thibitishaSkillz.
        </p>

        <div className="ph-toggle">
          <button
            type="button"
            className="ph-toggle__btn"
            aria-pressed={role === "candidate"}
            onClick={() => setRole("candidate")}
          >
            Candidate
          </button>
          <button
            type="button"
            className="ph-toggle__btn"
            aria-pressed={role === "recruiter"}
            onClick={() => setRole("recruiter")}
          >
            Recruiter
          </button>
        </div>

        <form className="ph-form" onSubmit={onSubmit} noValidate>
          <div className="ph-field">
            <label className="ph-label" htmlFor="fullName">
              Full name
            </label>
            <input
              className="ph-input"
              id="fullName"
              name="fullName"
              type="text"
              autoComplete="name"
              placeholder="Amina Wanjiru"
              value={form.fullName}
              onChange={onChange}
              required
            />
          </div>

          <div className="ph-field">
            <label className="ph-label" htmlFor="email">
              Email
            </label>
            <input
              className="ph-input"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="name@email.com"
              value={form.email}
              onChange={onChange}
              required
            />
          </div>

          <div className="ph-field">
            <label className="ph-label" htmlFor="password">
              Password
            </label>
            <input
              className="ph-input"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={form.password}
              onChange={onChange}
              aria-invalid={!!error}
              required
            />
          </div>

          {error && (
            <p className="ph-error" role="alert">
              {error}
            </p>
          )}

          <button className="ph-btn" type="submit">
            Create account
          </button>
        </form>

        <p className="ph-card__foot">
          Already have an account?{" "}
          <a className="ph-link" href="/signin">
            Sign in
          </a>
        </p>
      </div>
    </AuthLayout>
  );
}

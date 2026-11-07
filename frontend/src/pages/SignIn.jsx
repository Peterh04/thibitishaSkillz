import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";

export default function SignIn() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Please provide your email and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await login(form.email, form.password);
      // Determine destination
      const redirectPath = location.state?.from?.pathname;
      if (redirectPath) {
        navigate(redirectPath);
      } else if (data.user?.role === "employer") {
        navigate("/recruiter");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="ph-card">
        <h2 className="ph-card__title">Sign in to your account</h2>
        <p className="ph-card__desc">
          Access your verified skills, jobs, and assessments.
        </p>

        <form className="ph-form" onSubmit={onSubmit} noValidate>
          <div className="ph-field">
            <label className="ph-label" htmlFor="email">
              Email address
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
              autoComplete="current-password"
              placeholder="Enter your password"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>

          {error && (
            <p className="ph-error" role="alert" style={{ marginTop: "12px" }}>
              {error}
            </p>
          )}

          <button
            className="ph-btn"
            type="submit"
            disabled={submitting}
            style={{ marginTop: "16px" }}
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p className="ph-card__foot">
          Don't have an account?{" "}
          <Link className="ph-link" to="/signup">
            Create account
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}


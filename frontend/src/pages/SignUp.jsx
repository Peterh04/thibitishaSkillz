import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import { useAuth } from "../context/AuthContext";

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("candidate"); // 'candidate' or 'recruiter'
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    location: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!form.email.trim()) {
      setError("Please enter a valid email address.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const backendRole = role === "candidate" ? "job_seeker" : "employer";
      const data = await register({
        full_name: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        role: backendRole,
        phone_number: form.phoneNumber.trim() || undefined,
        location: form.location.trim() || undefined,
      });

      if (backendRole === "employer") {
        navigate("/recruiter");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message || "Registration failed. Please check your information.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <div className="ph-card">
        <h2 className="ph-card__title">Create your account</h2>
        <p className="ph-card__desc">
          Choose how you will use Thibitisha Skills.
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
              placeholder="e.g. Amina Wanjiru"
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
            <label className="ph-label" htmlFor="phoneNumber">
              Phone number (optional)
            </label>
            <input
              className="ph-input"
              id="phoneNumber"
              name="phoneNumber"
              type="tel"
              autoComplete="tel"
              placeholder="+254 712 345 678"
              value={form.phoneNumber}
              onChange={onChange}
            />
          </div>

          <div className="ph-field">
            <label className="ph-label" htmlFor="location">
              Location (optional)
            </label>
            <input
              className="ph-input"
              id="location"
              name="location"
              type="text"
              placeholder="Nairobi, Kenya"
              value={form.location}
              onChange={onChange}
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
            {submitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="ph-card__foot">
          Already have an account?{" "}
          <Link className="ph-link" to="/signin">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import Card, { CardBody } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { IconBriefcase, IconUser, IconArrowRight } from "../components/ui/Icons";

export default function SignUp() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("candidate"); // 'candidate' or 'recruiter'
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    phoneNumber: "",
    location: "Nairobi, Kenya",
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
      await register({
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
      setError(err.message || "Failed to create account. Please verify your details.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      <Card>
        <CardBody style={{ padding: "var(--space-8)" }}>
          <div style={{ marginBottom: "var(--space-5)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--text)",
                marginBottom: "var(--space-2)",
              }}
            >
              Create your account
            </h2>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
              Join the skills verification network for engineers and hiring teams.
            </p>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: "var(--space-5)" }}>
            <label className="tb-label" style={{ marginBottom: "var(--space-2)" }}>
              I am registering as:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
              <button
                type="button"
                onClick={() => setRole("candidate")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${role === "candidate" ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor:
                    role === "candidate" ? "var(--accent-subtle)" : "var(--surface)",
                  color: role === "candidate" ? "var(--accent)" : "var(--text)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: role === "candidate" ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  transition: "all var(--duration-micro) var(--ease-enter)",
                }}
              >
                <IconUser size={16} />
                <span>Job Seeker</span>
              </button>
              <button
                type="button"
                onClick={() => setRole("recruiter")}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "var(--space-3)",
                  borderRadius: "var(--radius-md)",
                  border: `1px solid ${role === "recruiter" ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor:
                    role === "recruiter" ? "var(--accent-subtle)" : "var(--surface)",
                  color: role === "recruiter" ? "var(--accent)" : "var(--text)",
                  cursor: "pointer",
                  fontSize: "var(--font-size-sm)",
                  fontWeight: role === "recruiter" ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  transition: "all var(--duration-micro) var(--ease-enter)",
                }}
              >
                <IconBriefcase size={16} />
                <span>Employer</span>
              </button>
            </div>
          </div>

          {error && (
            <Alert variant="danger" style={{ marginBottom: "var(--space-4)" }}>
              {error}
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate>
            <Input
              label="Full name"
              id="fullName"
              name="fullName"
              required
              placeholder={role === "candidate" ? "e.g. Amina Wanjiru" : "e.g. David Kimani"}
              value={form.fullName}
              onChange={onChange}
              disabled={submitting}
            />

            <Input
              label="Work or personal email"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="name@company.com"
              value={form.email}
              onChange={onChange}
              disabled={submitting}
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              helper="Must be at least 8 characters"
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              disabled={submitting}
            />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-3)" }}>
              <Input
                label="Phone (optional)"
                id="phoneNumber"
                name="phoneNumber"
                type="tel"
                placeholder="+254 700 000 000"
                value={form.phoneNumber}
                onChange={onChange}
                disabled={submitting}
              />
              <Input
                label="Location"
                id="location"
                name="location"
                placeholder="Nairobi, Kenya"
                value={form.location}
                onChange={onChange}
                disabled={submitting}
              />
            </div>

            <div style={{ marginTop: "var(--space-5)" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                style={{ width: "100%" }}
                icon={<IconArrowRight size={16} />}
              >
                Create {role === "candidate" ? "Seeker" : "Employer"} Account
              </Button>
            </div>
          </form>

          <div
            style={{
              marginTop: "var(--space-5)",
              paddingTop: "var(--space-5)",
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
            }}
          >
            Already have an account?{" "}
            <Link
              to="/signin"
              style={{
                color: "var(--accent)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Sign in
            </Link>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}

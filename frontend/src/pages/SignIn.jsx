import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { useAuth } from "../context/AuthContext";
import Card, { CardBody } from "../components/ui/Card";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Alert from "../components/ui/Alert";
import { IconArrowRight } from "../components/ui/Icons";

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
      setError("Please enter both your email address and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await login(form.email, form.password);
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
      <Card>
        <CardBody style={{ padding: "var(--space-8)" }}>
          <div style={{ marginBottom: "var(--space-6)" }}>
            <h2
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--text)",
                marginBottom: "var(--space-2)",
              }}
            >
              Sign in to your account
            </h2>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
              Access your verified skills, technical assessments, and job applications.
            </p>
          </div>

          {error && (
            <Alert variant="danger" style={{ marginBottom: "var(--space-5)" }}>
              {error}
            </Alert>
          )}

          <form onSubmit={onSubmit} noValidate>
            <Input
              label="Email address"
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="e.g. amina@example.com"
              value={form.email}
              onChange={onChange}
              disabled={submitting}
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={form.password}
              onChange={onChange}
              disabled={submitting}
            />

            <div style={{ marginTop: "var(--space-6)" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting}
                style={{ width: "100%" }}
                icon={<IconArrowRight size={16} />}
              >
                Sign in
              </Button>
            </div>
          </form>

          <div
            style={{
              marginTop: "var(--space-6)",
              paddingTop: "var(--space-6)",
              borderTop: "1px solid var(--border-subtle)",
              textAlign: "center",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
            }}
          >
            Don't have an account yet?{" "}
            <Link
              to="/signup"
              style={{
                color: "var(--accent)",
                fontWeight: "var(--font-weight-medium)",
              }}
            >
              Create account
            </Link>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
}

import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import { IconCheckCircle, IconArrowRight, IconBriefcase } from "../components/ui/Icons";

export default function InterviewSubmitted({ result }) {
  const data = result || {
    jobTitle: "Technical Assessment",
    company: "Hiring Employer",
    answered: 5,
    total: 5,
    timeTaken: "12 min",
  };

  return (
    <AppShell>
      <div style={{ maxWidth: "580px", margin: "var(--space-8) auto" }}>
        <Card>
          <CardBody style={{ padding: "var(--space-10)", textAlign: "center" }}>
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "var(--color-success-bg)",
                color: "var(--color-success)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto var(--space-4)",
              }}
            >
              <IconCheckCircle size={32} />
            </div>

            <h1
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-semibold)",
                color: "var(--text)",
                marginBottom: "var(--space-2)",
              }}
            >
              Interview Submitted
            </h1>
            <p
              style={{
                fontSize: "var(--font-size-base)",
                color: "var(--text-muted)",
                marginBottom: "var(--space-6)",
              }}
            >
              Your conversational voice answers have been securely recorded and sent to Gemini AI for
              transcription and technical evaluation.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-4)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface-raised)",
                border: "1px solid var(--border-subtle)",
                marginBottom: "var(--space-8)",
                textAlign: "left",
              }}
            >
              <div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
                  Questions Answered
                </span>
                <strong className="tabular-nums" style={{ fontSize: "var(--font-size-lg)", color: "var(--text)" }}>
                  {data.answered} / {data.total}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
                  Completion Status
                </span>
                <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--color-success)" }}>
                  Verified Complete
                </strong>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)" }}>
              <Link to="/dashboard">
                <Button variant="primary" size="md">
                  View Candidate Dashboard
                </Button>
              </Link>
              <Link to="/jobs">
                <Button variant="secondary" size="md" icon={<IconBriefcase size={15} />}>
                  Browse Open Jobs
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

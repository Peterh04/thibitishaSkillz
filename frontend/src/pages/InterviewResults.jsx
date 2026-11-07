import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import Card, { CardBody, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import StatTile from "../components/ui/StatTile";
import {
  IconCheckCircle,
  IconAward,
  IconShield,
  IconFileText,
  IconArrowLeft,
  IconBriefcase,
} from "../components/ui/Icons";

const DEFAULT_RESULT = {
  jobTitle: "Software Engineer",
  company: "Verified Hiring Partner",
  status: "Shortlisted",
  cvMatch: 92,
  interview: 88,
  overall: 90,
  breakdown: [
    {
      criterion: "Technical depth & architecture",
      score: 92,
      note: "Clear explanation of database concurrency and indexing strategies under heavy write load.",
    },
    {
      criterion: "Problem-solving & edge cases",
      score: 88,
      note: "Identified edge conditions in distributed cache invalidation correctly.",
    },
    {
      criterion: "Communication & ownership",
      score: 91,
      note: "Articulated tradeoffs with high clarity and concise terminology.",
    },
  ],
};

export default function InterviewResults({ result = DEFAULT_RESULT }) {
  return (
    <AppShell>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Navigation back */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <Link
            to="/dashboard"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            <IconArrowLeft size={16} /> Return to Dashboard
          </Link>
        </div>

        {/* Top Summary Banner */}
        <Card style={{ marginBottom: "var(--space-6)" }}>
          <CardBody style={{ padding: "var(--space-8)" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "var(--space-4)",
                marginBottom: "var(--space-6)",
              }}
            >
              <div>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    textTransform: "uppercase",
                    letterSpacing: "var(--tracking-wide)",
                    color: "var(--text-muted)",
                    fontWeight: "var(--font-weight-semibold)",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Verified Technical Evaluation
                </span>
                <h1
                  style={{
                    fontSize: "var(--font-size-2xl)",
                    fontWeight: "var(--font-weight-semibold)",
                    color: "var(--text)",
                    margin: 0,
                  }}
                >
                  {result.jobTitle} &bull; {result.company}
                </h1>
              </div>

              <Badge
                variant={
                  result.status === "Shortlisted"
                    ? "success"
                    : result.status === "Under review"
                    ? "accent"
                    : "neutral"
                }
              >
                {result.status}
              </Badge>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              <StatTile
                label="Overall Verified"
                value={`${result.overall}%`}
                icon={<IconAward size={20} />}
                trend="Strong match"
                trendType="positive"
              />
              <StatTile
                label="CV Competency Match"
                value={`${result.cvMatch}%`}
                icon={<IconFileText size={20} />}
              />
              <StatTile
                label="Voice Reasoning Score"
                value={`${result.interview}%`}
                icon={<IconShield size={20} />}
              />
            </div>
          </CardBody>
        </Card>

        {/* Criteria Breakdown */}
        {result.breakdown && result.breakdown.length > 0 && (
          <Card style={{ marginBottom: "var(--space-6)" }}>
            <CardHeader>
              <CardTitle>Evaluation Criteria Breakdown</CardTitle>
              <CardDescription>
                Detailed assessment of technical claims, reasoning, and system architecture.
              </CardDescription>
            </CardHeader>
            <CardBody style={{ padding: "var(--space-6)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {result.breakdown.map((item, idx) => (
                  <div
                    key={idx}
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
                      <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                        {item.criterion}
                      </strong>
                      <span
                        className="tabular-nums"
                        style={{
                          fontWeight: "var(--font-weight-semibold)",
                          color: "var(--accent)",
                          fontSize: "var(--font-size-sm)",
                        }}
                      >
                        {item.score}%
                      </span>
                    </div>
                    <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", margin: 0 }}>
                      {item.note}
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* Next Steps */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
          <Link to="/leaderboard">
            <Button variant="secondary" size="md">
              View Verified Leaderboard
            </Button>
          </Link>
          <Link to="/jobs">
            <Button variant="primary" size="md" icon={<IconBriefcase size={15} />}>
              Explore More Roles
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}

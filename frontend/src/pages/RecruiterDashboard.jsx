import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import employersApi from "../api/employers";
import jobsApi from "../api/jobs";
import applicationsApi from "../api/applications";
import Card, { CardBody, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import Modal from "../components/ui/Modal";
import StatTile from "../components/ui/StatTile";
import DataTable from "../components/ui/DataTable";
import {
  IconUser,
  IconCheckCircle,
  IconAward,
  IconBriefcase,
  IconCheck,
  IconClock,
} from "../components/ui/Icons";

const TOP_N = 3;

export default function RecruiterDashboard() {
  const { jobId: routeJobId } = useParams();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(routeJobId ? parseInt(routeJobId, 10) : null);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [updatingAppId, setUpdatingAppId] = useState(null);

  // 1. Load employer's jobs
  useEffect(() => {
    async function loadEmployerJobs() {
      try {
        const data = await employersApi.getMyJobs();
        const items = data.items || [];
        setJobs(items);
        if (!selectedJobId && items.length > 0) {
          setSelectedJobId(items[0].id);
        }
      } catch (err) {
        setError(err.message || "Failed to load employer jobs.");
      }
    }
    loadEmployerJobs();
  }, [selectedJobId]);

  // 2. Load job details and applicants when selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) {
      setLoading(false);
      return;
    }

    async function loadJobData() {
      setLoading(true);
      setError("");
      try {
        const [jobData, appsData] = await Promise.all([
          jobsApi.getJob(selectedJobId).catch(() => null),
          applicationsApi.getJobApplications(selectedJobId).catch(() => ({ items: [] })),
        ]);

        setJob(jobData);
        setApplications(appsData.items || []);
      } catch (err) {
        setError(err.message || "Failed to load candidates for this job.");
      } finally {
        setLoading(false);
      }
    }

    loadJobData();
  }, [selectedJobId]);

  const ranked = useMemo(() => {
    return [...applications].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [applications]);

  const stats = useMemo(() => {
    const total = applications.length;
    const shortlisted = applications.filter(
      (a) => a.application_status === "shortlisted" || a.application_status === "accepted"
    ).length;
    const avgScore = total
      ? Math.round(applications.reduce((acc, c) => acc + (c.match_score || 0), 0) / total)
      : 0;

    return {
      applicants: total,
      shortlisted,
      avg: avgScore,
    };
  }, [applications]);

  const handleStatusChange = async (appId, newStatus) => {
    setUpdatingAppId(appId);
    setError("");
    setSuccessMsg("");
    try {
      const updated = await applicationsApi.updateApplicationStatus(appId, {
        application_status: newStatus,
      });
      setApplications((list) =>
        list.map((a) => (a.id === appId ? { ...a, application_status: updated.application_status } : a))
      );
      setSuccessMsg(`Status updated to "${newStatus}".`);
    } catch (err) {
      setError(err.message || "Failed to update candidate status.");
    } finally {
      setUpdatingAppId(null);
    }
  };

  const handleSendInvites = () => {
    const topCandidates = ranked.slice(0, TOP_N);
    topCandidates.forEach((c) => {
      handleStatusChange(c.id, "shortlisted");
    });
    setSuccessMsg(`Successfully shortlisted top ${topCandidates.length} ranked candidates.`);
  };

  const columns = useMemo(
    () => [
      {
        key: "rank",
        label: "Rank",
        numeric: true,
        align: "center",
        render: (_, __, i) => {
          const rank = i + 1;
          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: rank <= 3 ? "var(--accent)" : "var(--surface-sunken)",
                color: rank <= 3 ? "var(--accent-contrast)" : "var(--text-muted)",
                fontFamily: "var(--font-mono)",
                fontWeight: "var(--font-weight-semibold)",
                fontSize: "var(--font-size-xs)",
              }}
            >
              #{rank}
            </span>
          );
        },
      },
      {
        key: "candidate_name",
        label: "Candidate",
        sortable: true,
        render: (name, row) => (
          <div>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
              {name || `Candidate #${row.candidate_id}`}
            </strong>
            <span style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              Applied {new Date(row.applied_at).toLocaleDateString()}
            </span>
          </div>
        ),
      },
      {
        key: "match_score",
        label: "Verified Fit Score",
        sortable: true,
        numeric: true,
        align: "right",
        render: (score) => (
          <span
            className="tabular-nums"
            style={{
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--accent)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {score != null ? `${Math.round(score)}%` : "—"}
          </span>
        ),
      },
      {
        key: "application_status",
        label: "Pipeline Stage",
        render: (status, row) => (
          <select
            value={status}
            disabled={updatingAppId === row.id}
            onChange={(e) => handleStatusChange(row.id, e.target.value)}
            className="tb-select"
            style={{
              height: "28px",
              padding: "0 var(--space-5) 0 var(--space-2)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              textTransform: "capitalize",
              width: "auto",
            }}
          >
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="interviewed">Interviewed</option>
            <option value="shortlisted">Shortlisted</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
        ),
      },
      {
        key: "actions",
        label: "Action",
        align: "right",
        render: (_, row) => (
          <Button variant="secondary" size="sm" onClick={() => setSelectedCandidate(row)}>
            Inspect Details
          </Button>
        ),
      },
    ],
    [updatingAppId]
  );

  return (
    <AppShell>
      {/* Header & Job Switcher */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "4px" }}>
            <h1
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "var(--tracking-tighter)",
                color: "var(--text)",
                margin: 0,
              }}
            >
              {job?.title || "Candidate Evaluation"}
            </h1>
            <Badge variant="accent">Ranked by Fit</Badge>
          </div>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
            {job?.company_name || "Organization"} &bull; Candidates ranked top-to-bottom by verified
            technical abilities and AI interview reasoning.
          </p>
        </div>

        {jobs.length > 1 && (
          <div style={{ minWidth: "220px" }}>
            <label className="tb-label" htmlFor="switchJob" style={{ marginBottom: "var(--space-1)" }}>
              Switch Job Requisition
            </label>
            <select
              id="switchJob"
              className="tb-select"
              value={selectedJobId || ""}
              onChange={(e) => {
                const id = parseInt(e.target.value, 10);
                setSelectedJobId(id);
                navigate(`/recruiter/jobs/${id}/candidates`);
              }}
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} ({j.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="danger" title="Notice" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-5)" }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onDismiss={() => setSuccessMsg("")} style={{ marginBottom: "var(--space-5)" }}>
          {successMsg}
        </Alert>
      )}

      {/* Stats Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <StatTile
          label="Total Applicants"
          value={loading ? "..." : stats.applicants}
          icon={<IconUser size={20} />}
          subtext="Received for this role"
        />
        <StatTile
          label="Shortlisted"
          value={loading ? "..." : stats.shortlisted}
          icon={<IconCheckCircle size={20} />}
          trendType="positive"
          subtext="Advanced to final round"
        />
        <StatTile
          label="Average Match"
          value={loading ? "..." : `${stats.avg}%`}
          icon={<IconAward size={20} />}
          subtext="Verified benchmark score"
        />
      </div>

      {/* Action Strip */}
      {ranked.length > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "var(--space-4)",
          }}
        >
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            Showing {ranked.length} verified candidate{ranked.length > 1 ? "s" : ""}
          </span>
          <Button variant="primary" size="sm" icon={<IconCheck size={14} />} onClick={handleSendInvites}>
            Shortlist Top {Math.min(TOP_N, ranked.length)} Matches
          </Button>
        </div>
      )}

      {/* Candidates Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={ranked}
            loading={loading}
            emptyTitle="No candidates have applied yet"
            emptyDescription="Ensure your requisition is published. Once candidates submit verified CVs and complete assessments, their scores will rank here."
            keyExtractor={(c) => c.id}
          />
        </CardBody>
      </Card>

      {/* Candidate Detail Inspection Modal */}
      <Modal
        isOpen={!!selectedCandidate}
        onClose={() => setSelectedCandidate(null)}
        title={selectedCandidate?.candidate_name || `Candidate Evaluation #${selectedCandidate?.candidate_id}`}
        maxWidth="600px"
      >
        {selectedCandidate && (
          <div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "var(--space-4)",
                padding: "var(--space-4)",
                borderRadius: "var(--radius-md)",
                backgroundColor: "var(--surface-raised)",
                marginBottom: "var(--space-5)",
              }}
            >
              <div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
                  Verified Fit Score
                </span>
                <strong className="tabular-nums" style={{ fontSize: "var(--font-size-2xl)", color: "var(--accent)" }}>
                  {selectedCandidate.match_score != null ? `${Math.round(selectedCandidate.match_score)}%` : "N/A"}
                </strong>
              </div>

              <div>
                <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
                  Current Status
                </span>
                <Badge variant="accent" style={{ textTransform: "capitalize", marginTop: "4px" }}>
                  {selectedCandidate.application_status}
                </Badge>
              </div>
            </div>

            <div style={{ marginBottom: "var(--space-5)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                Candidate Note / Cover Letter:
              </span>
              <p
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text)",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-sm)",
                  padding: "var(--space-3)",
                  margin: 0,
                  lineHeight: "var(--line-height-relaxed)",
                }}
              >
                {selectedCandidate.cover_letter || "No cover note provided by candidate."}
              </p>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-3)" }}>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  handleStatusChange(selectedCandidate.id, "shortlisted");
                  setSelectedCandidate(null);
                }}
              >
                Mark as Shortlisted
              </Button>
              <Button variant="secondary" size="md" onClick={() => setSelectedCandidate(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}

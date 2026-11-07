import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import employersApi from "../api/employers";
import jobsApi from "../api/jobs";
import Card, { CardBody, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import DataTable from "../components/ui/DataTable";
import {
  IconBriefcase,
  IconSearch,
  IconPlus,
  IconRefreshCw,
  IconCheck,
  IconX,
} from "../components/ui/Icons";

const FILTERS = ["All", "published", "closed", "draft"];

export default function RecruiterJobs() {
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [error, setError] = useState("");
  const [togglingId, setTogglingId] = useState(null);

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await employersApi.getMyJobs();
      setJobs(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load jobs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  const visibleJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const matchesFilter = filter === "All" || j.status === filter;
      const matchesQuery =
        !q ||
        j.title?.toLowerCase().includes(q) ||
        j.location?.toLowerCase().includes(q) ||
        j.company_name?.toLowerCase().includes(q);
      return matchesFilter && matchesQuery;
    });
  }, [jobs, query, filter]);

  const handleToggleStatus = async (job) => {
    const next = job.status === "published" ? "closed" : "published";
    setTogglingId(job.id);
    setError("");
    try {
      const updated = await jobsApi.updateJob(job.id, { status: next });
      setJobs((list) => list.map((j) => (j.id === job.id ? { ...j, status: updated.status } : j)));
    } catch (err) {
      setError(err.message || "Failed to update job status.");
    } finally {
      setTogglingId(null);
    }
  };

  const columns = useMemo(
    () => [
      {
        key: "title",
        label: "Position Title",
        sortable: true,
        render: (title, row) => (
          <div>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>{title}</strong>
            <span style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              {row.location || "Nairobi, Kenya"} &bull;{" "}
              {row.employment_type?.replace("_", " ") || "Full time"}
            </span>
          </div>
        ),
      },
      {
        key: "experience_level",
        label: "Seniority",
        render: (lvl) => (
          <span style={{ fontSize: "var(--font-size-xs)", textTransform: "capitalize", color: "var(--text-muted)" }}>
            {lvl || "Mid-level"}
          </span>
        ),
      },
      {
        key: "skills",
        label: "Required Skills",
        render: (skillsList) => (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", maxWidth: "260px" }}>
            {skillsList && skillsList.length > 0 ? (
              skillsList.map((s) => (
                <Badge key={s.id || s.skill_id} variant="neutral">
                  {s.skill_name}
                  {s.minimum_score > 0 && ` (≥${s.minimum_score}%)`}
                </Badge>
              ))
            ) : (
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)" }}>
                No requirements set
              </span>
            )}
          </div>
        ),
      },
      {
        key: "status",
        label: "Status",
        sortable: true,
        render: (status) => (
          <Badge variant={status === "published" ? "success" : "neutral"} dot>
            {status}
          </Badge>
        ),
      },
      {
        key: "actions",
        label: "Actions",
        align: "right",
        render: (_, row) => (
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(`/recruiter/jobs/${row.id}/candidates`)}
            >
              Candidates
            </Button>
            <Button
              variant="ghost"
              size="sm"
              loading={togglingId === row.id}
              onClick={() => handleToggleStatus(row)}
            >
              {row.status === "published" ? "Close" : "Publish"}
            </Button>
          </div>
        ),
      },
    ],
    [togglingId, navigate]
  );

  return (
    <AppShell>
      {/* Header */}
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
          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--tracking-tighter)",
              color: "var(--text)",
              marginBottom: "var(--space-2)",
            }}
          >
            Manage Job Requisitions
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
            Publish open opportunities, configure skill threshold requirements, and review verified
            applicant matches.
          </p>
        </div>

        <Link to="/recruiter/jobs/new">
          <Button variant="primary" size="md" icon={<IconPlus size={16} />}>
            Post New Job
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant="danger" title="Notice" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </Alert>
      )}

      {/* Filter toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        {/* Status Filter Chips */}
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {FILTERS.map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                style={{
                  padding: "4px 12px",
                  borderRadius: "var(--radius-pill)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  backgroundColor: active ? "var(--accent-subtle)" : "var(--surface)",
                  color: active ? "var(--accent)" : "var(--text-muted)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {f}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div style={{ display: "flex", gap: "var(--space-2)", width: "320px" }}>
          <Input
            type="search"
            placeholder="Search by title, location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            startIcon={<IconSearch size={15} />}
            wrapperClassName="mb-0"
            style={{ height: "34px" }}
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<IconRefreshCw size={14} />}
            onClick={loadJobs}
            loading={loading}
          />
        </div>
      </div>

      {/* Jobs Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={visibleJobs}
            loading={loading}
            emptyTitle="No requisitions found"
            emptyDescription={
              query
                ? `No positions matched "${query}".`
                : "No job postings in this filter. Click 'Post New Job' to create one."
            }
            keyExtractor={(j) => j.id}
          />
        </CardBody>
      </Card>
    </AppShell>
  );
}

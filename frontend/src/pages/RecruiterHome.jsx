import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import employersApi from "../api/employers";
import applicationsApi from "../api/applications";
import Card, { CardBody, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import StatTile from "../components/ui/StatTile";
import DataTable from "../components/ui/DataTable";
import Skeleton from "../components/ui/Skeleton";
import {
  IconBuilding,
  IconBriefcase,
  IconUser,
  IconPlus,
  IconArrowRight,
  IconCheckCircle,
  IconClock,
} from "../components/ui/Icons";

export default function RecruiterHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [error, setError] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");
  const [updatingProfile, setUpdatingProfile] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [profData, jobsData] = await Promise.all([
        employersApi.getProfile().catch(() => null),
        employersApi.getMyJobs().catch(() => ({ items: [] })),
      ]);

      setProfile(profData);
      if (profData?.company_name) {
        setCompanyName(profData.company_name);
        setIndustry(profData.industry || "");
      }

      const jobList = jobsData.items || [];
      setJobs(jobList);

      const appsPromises = jobList.map((j) =>
        applicationsApi.getJobApplications(j.id).catch(() => ({ items: [] }))
      );
      const appsResults = await Promise.all(appsPromises);
      const flattenedApps = appsResults.flatMap((r) => r.items || []);
      setAllApplications(flattenedApps);
    } catch (err) {
      setError(err.message || "Failed to load employer dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!companyName.trim()) return;
    setUpdatingProfile(true);
    try {
      const updated = await employersApi.updateProfile({
        company_name: companyName.trim(),
        industry: industry.trim() || undefined,
      });
      setProfile(updated);
    } catch (err) {
      setError(err.message || "Failed to update company profile.");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const totals = useMemo(() => {
    const openJobs = jobs.filter((j) => j.status === "published").length;
    const totalApplicants = allApplications.length;
    const shortlisted = allApplications.filter(
      (a) => a.application_status === "shortlisted" || a.application_status === "accepted"
    ).length;
    const interviewed = allApplications.filter(
      (a) => a.application_status === "interviewed" || a.application_status === "shortlisted"
    ).length;

    return {
      open: openJobs,
      applicants: totalApplicants,
      interviewed,
      shortlisted,
    };
  }, [jobs, allApplications]);

  const jobColumns = useMemo(
    () => [
      {
        key: "title",
        label: "Job Requisition",
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
        key: "status",
        label: "Status",
        render: (status) => (
          <Badge variant={status === "published" ? "success" : "neutral"} dot>
            {status}
          </Badge>
        ),
      },
      {
        key: "applicants_count",
        label: "Applicants",
        numeric: true,
        render: (_, row) => {
          const count = allApplications.filter((a) => a.job_id === row.id).length;
          return <span className="tabular-nums">{count} applicants</span>;
        },
      },
      {
        key: "actions",
        label: "Evaluation",
        align: "right",
        render: (_, row) => (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => navigate(`/recruiter/jobs/${row.id}/candidates`)}
          >
            Review Candidates
          </Button>
        ),
      },
    ],
    [allApplications, navigate]
  );

  return (
    <AppShell>
      {/* Recruiter Header */}
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
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <h1
              style={{
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-semibold)",
                letterSpacing: "var(--tracking-tighter)",
                color: "var(--text)",
                margin: 0,
              }}
            >
              Employer Dashboard
            </h1>
            <Badge variant="accent">Employer</Badge>
          </div>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
            {profile?.company_name ? (
              <span>
                Hiring organization: <strong>{profile.company_name}</strong>{" "}
                {profile.industry ? `(${profile.industry})` : ""}
              </span>
            ) : (
              "Overview of your active technical job requisitions and candidate verification status."
            )}
          </p>
        </div>

        <Link to="/recruiter/jobs/new">
          <Button variant="primary" size="md" icon={<IconPlus size={16} />}>
            Post New Job
          </Button>
        </Link>
      </div>

      {/* Warning if company name not set */}
      {profile && !profile.company_name && (
        <Card style={{ marginBottom: "var(--space-6)", borderLeft: "3px solid var(--color-warning)" }}>
          <CardBody style={{ padding: "var(--space-6)" }}>
            <h4 style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "4px" }}>
              Complete Your Company Profile
            </h4>
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-4)" }}>
              Before publishing new engineering requisitions, please register your company name and sector.
            </p>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Company Name (e.g. Acme Corp)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="tb-input"
                style={{ flex: 1, minWidth: "220px", height: "36px" }}
              />
              <input
                type="text"
                placeholder="Industry (e.g. Fintech, Healthcare)"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                className="tb-input"
                style={{ flex: 1, minWidth: "180px", height: "36px" }}
              />
              <Button type="submit" variant="primary" size="sm" loading={updatingProfile}>
                Save Company Name
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {error && (
        <Alert variant="danger" title="Notice" style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </Alert>
      )}

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <StatTile
          label="Open Requisitions"
          value={loading ? "..." : totals.open}
          icon={<IconBriefcase size={20} />}
          subtext="Currently published"
        />
        <StatTile
          label="Total Applicants"
          value={loading ? "..." : totals.applicants}
          icon={<IconUser size={20} />}
          subtext="Across all positions"
        />
        <StatTile
          label="Interviews Completed"
          value={loading ? "..." : totals.interviewed}
          icon={<IconClock size={20} />}
          subtext="With AI voice evaluations"
        />
        <StatTile
          label="Shortlisted Candidates"
          value={loading ? "..." : totals.shortlisted}
          icon={<IconCheckCircle size={20} />}
          trendType="positive"
          subtext="High-fit verified talent"
        />
      </div>

      {/* Active Jobs Table Card */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Active Job Postings</CardTitle>
            <CardDescription>
              Monitor candidate pipeline health and click through to evaluate verified applicant fit.
            </CardDescription>
          </div>
          <Link to="/recruiter/jobs">
            <Button variant="ghost" size="sm">
              View All Jobs &rarr;
            </Button>
          </Link>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <DataTable
            columns={jobColumns}
            data={jobs}
            loading={loading}
            emptyTitle="No job postings yet"
            emptyDescription="Create your first job requisition to begin receiving verified candidate submissions."
            keyExtractor={(j) => j.id}
          />
        </CardBody>
      </Card>
    </AppShell>
  );
}

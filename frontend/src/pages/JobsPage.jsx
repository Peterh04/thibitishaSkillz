import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import jobsApi from "../api/jobs";
import Card, { CardBody } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Badge from "../components/ui/Badge";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Alert from "../components/ui/Alert";
import {
  IconSearch,
  IconRefreshCw,
  IconBriefcase,
  IconMapPin,
  IconBuilding,
  IconArrowRight,
  IconSparkles,
} from "../components/ui/Icons";

export default function JobsPage() {
  const navigate = useNavigate();
  const searchInputRef = useRef(null);

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedSkillFilter, setSelectedSkillFilter] = useState("All");

  const loadJobs = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await jobsApi.getJobs({ status: "published" });
      setJobs(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load jobs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobs();
  }, []);

  // Global hotkey: '/' focuses search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Extract unique popular skills for quick filter chips
  const popularSkills = useMemo(() => {
    const skillSet = new Set();
    jobs.forEach((j) => {
      j.skills?.forEach((s) => {
        if (s.skill_name) skillSet.add(s.skill_name);
      });
    });
    return ["All", ...Array.from(skillSet).slice(0, 6)];
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesSkillChip =
        selectedSkillFilter === "All" ||
        job.skills?.some(
          (s) => s.skill_name?.toLowerCase() === selectedSkillFilter.toLowerCase()
        );

      if (!matchesSkillChip) return false;

      if (!q) return true;
      const titleMatch = job.title?.toLowerCase().includes(q);
      const companyMatch = job.company_name?.toLowerCase().includes(q);
      const descMatch = job.description?.toLowerCase().includes(q);
      const locMatch = job.location?.toLowerCase().includes(q);
      const skillMatch = job.skills?.some((s) => s.skill_name?.toLowerCase().includes(q));

      return titleMatch || companyMatch || descMatch || locMatch || skillMatch;
    });
  }, [jobs, query, selectedSkillFilter]);

  const handleApply = (jobId) => {
    navigate(`/apply/${jobId}`);
  };

  return (
    <AppShell>
      {/* Editorial Hero Header */}
      <div style={{ marginBottom: "var(--space-8)" }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            padding: "3px 10px",
            borderRadius: "var(--radius-pill)",
            backgroundColor: "var(--accent-subtle)",
            color: "var(--accent)",
            fontSize: "var(--font-size-xs)",
            fontWeight: "var(--font-weight-medium)",
            marginBottom: "var(--space-2)",
            border: "1px solid var(--accent-subtle-border)",
          }}
        >
          <IconSparkles size={13} /> Verified Hiring Market
        </div>

        <h1
          style={{
            fontSize: "var(--font-size-3xl)",
            fontWeight: "var(--font-weight-semibold)",
            letterSpacing: "var(--tracking-tighter)",
            color: "var(--text)",
            marginBottom: "var(--space-2)",
          }}
        >
          Open technical opportunities
        </h1>
        <p
          style={{
            fontSize: "var(--font-size-base)",
            color: "var(--text-muted)",
            maxWidth: "680px",
          }}
        >
          Apply with your CV. Objective skill scores, verified code challenges, and AI reasoning
          evaluations get your profile shortlisted immediately.
        </p>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", gap: "var(--space-3)", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search by role, tech stack, or employer (e.g. Python, Backend, Nairobi)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              startIcon={<IconSearch size={16} />}
              shortcutHint="/"
              aria-label="Search jobs"
              wrapperClassName="mb-0"
              style={{ margin: 0 }}
            />
          </div>

          <Button
            variant="secondary"
            size="md"
            icon={<IconRefreshCw size={15} />}
            onClick={loadJobs}
            loading={loading}
            title="Refresh job listings"
            aria-label="Refresh job listings"
          >
            Refresh
          </Button>
        </div>

        {/* Quick Filter Skill Chips */}
        {popularSkills.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-faint)",
                fontWeight: "var(--font-weight-medium)",
                marginRight: "4px",
              }}
            >
              Filter by skill:
            </span>
            {popularSkills.map((skill) => {
              const active = selectedSkillFilter === skill;
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => setSelectedSkillFilter(skill)}
                  style={{
                    padding: "3px 10px",
                    borderRadius: "var(--radius-pill)",
                    fontSize: "var(--font-size-xs)",
                    fontWeight: active ? "var(--font-weight-semibold)" : "var(--font-weight-medium)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    backgroundColor: active ? "var(--accent-subtle)" : "var(--surface)",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    cursor: "pointer",
                    transition: "all var(--duration-micro) var(--ease-enter)",
                  }}
                >
                  {skill}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Error Callout */}
      {error && (
        <Alert
          variant="danger"
          title="Could not load jobs"
          style={{ marginBottom: "var(--space-6)" }}
        >
          {error}
          <div style={{ marginTop: "var(--space-2)" }}>
            <Button variant="danger" size="sm" onClick={loadJobs}>
              Try again
            </Button>
          </div>
        </Alert>
      )}

      {/* Loading Skeletons */}
      {loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skeleton-job-${i}`}>
              <CardBody style={{ padding: "var(--space-6)" }}>
                <Skeleton height="20px" width="70%" style={{ marginBottom: "var(--space-2)" }} />
                <Skeleton height="14px" width="40%" style={{ marginBottom: "var(--space-4)" }} />
                <Skeleton height="40px" width="100%" style={{ marginBottom: "var(--space-4)" }} />
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: "var(--space-4)" }}>
                  <Skeleton height="24px" width="60px" radius="var(--radius-pill)" />
                  <Skeleton height="24px" width="70px" radius="var(--radius-pill)" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredJobs.length === 0 && (
        <Card>
          <CardBody>
            <EmptyState
              icon={<IconBriefcase size={24} />}
              title={query ? "No matching roles found" : "No open jobs published yet"}
              description={
                query
                  ? `No opportunities matched "${query}". Try adjusting your keywords or clearing the skill filter.`
                  : "Employers are preparing new requisitions. You can take technical assessments right now to be ready when positions open."
              }
              action={
                query ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setSelectedSkillFilter("All");
                    }}
                  >
                    Clear Search Filters
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => navigate("/assessments")}
                  >
                    Browse Skill Assessments
                  </Button>
                )
              }
            />
          </CardBody>
        </Card>
      )}

      {/* Job Grid */}
      {!loading && !error && filteredJobs.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: "var(--space-4)",
          }}
        >
          {filteredJobs.map((job) => {
            const formattedType = job.employment_type
              ? job.employment_type.replace("_", " ")
              : "Full time";

            return (
              <Card key={job.id} interactive style={{ display: "flex", flexDirection: "column" }}>
                <CardBody
                  style={{
                    padding: "var(--space-6)",
                    display: "flex",
                    flexDirection: "column",
                    flex: 1,
                  }}
                >
                  {/* Top Bar: Title & Employment Type */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "var(--space-3)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "var(--font-size-lg)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--text)",
                        letterSpacing: "var(--tracking-tight)",
                        margin: 0,
                      }}
                    >
                      {job.title}
                    </h3>
                    <Badge variant="accent" style={{ textTransform: "capitalize" }}>
                      {formattedType}
                    </Badge>
                  </div>

                  {/* Company & Location Metadata */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-3)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--text-muted)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <IconBuilding size={14} />
                      {job.company_name || "Verified Employer"}
                    </span>
                    {job.location && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        <IconMapPin size={14} />
                        {job.location}
                      </span>
                    )}
                  </div>

                  {/* Description snippet */}
                  <p
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-muted)",
                      lineHeight: "var(--line-height-relaxed)",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      marginBottom: "var(--space-5)",
                    }}
                  >
                    {job.description}
                  </p>

                  {/* Required Skills Chips */}
                  <div style={{ marginTop: "auto" }}>
                    {job.skills && job.skills.length > 0 && (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "var(--space-1)",
                          marginBottom: "var(--space-5)",
                        }}
                      >
                        {job.skills.map((s) => (
                          <Badge
                            key={s.id || s.skill_id}
                            variant="neutral"
                            style={{ fontSize: "var(--font-size-xs)" }}
                          >
                            <span>{s.skill_name}</span>
                            {s.minimum_score > 0 && (
                              <span
                                style={{
                                  marginLeft: "4px",
                                  color: "var(--text-faint)",
                                  fontFamily: "var(--font-mono)",
                                }}
                              >
                                &ge;{s.minimum_score}%
                              </span>
                            )}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Action button */}
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => handleApply(job.id)}
                      style={{ width: "100%" }}
                      icon={<IconArrowRight size={15} />}
                    >
                      Apply with Verified Skills
                    </Button>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}

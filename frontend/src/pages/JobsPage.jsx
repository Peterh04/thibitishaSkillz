import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import jobsApi from "../api/jobs";
import "../styles/jobs.css";

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

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

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return jobs;
    return jobs.filter((job) => {
      const titleMatch = job.title?.toLowerCase().includes(q);
      const companyMatch = job.company_name?.toLowerCase().includes(q);
      const descMatch = job.description?.toLowerCase().includes(q);
      const skillMatch = job.skills?.some((s) => s.skill_name?.toLowerCase().includes(q));
      return titleMatch || companyMatch || descMatch || skillMatch;
    });
  }, [jobs, query]);

  const handleApply = (job) => {
    navigate(`/apply/${job.id}`);
  };

  return (
    <div className="ph-jobs">
      <Navbar />

      <main className="ph-jobs__main">
        <h1 className="ph-jobs__title">Open jobs</h1>
        <p className="ph-jobs__desc">
          Apply with your CV. Verified skills and demonstrated abilities get you noticed first.
        </p>

        <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
          <input
            className="ph-jobs__search"
            type="search"
            placeholder="Search by title, company, or skill (e.g. Python, SQL)"
            aria-label="Search jobs by title or skill"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1, margin: 0 }}
          />
          <button
            type="button"
            onClick={loadJobs}
            style={{
              padding: "0 16px",
              background: "#fff",
              border: "1px solid #d4d4d4",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
              color: "#555",
            }}
          >
            Refresh
          </button>
        </div>

        {loading && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>
            <p>Loading available opportunities...</p>
          </div>
        )}

        {error && (
          <div style={{ padding: "16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px" }}>
            <p style={{ margin: 0 }}>{error}</p>
            <button
              type="button"
              onClick={loadJobs}
              style={{ marginTop: "8px", background: "#b42318", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "4px", cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && filteredJobs.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", background: "#fff", borderRadius: "12px", border: "1px solid #e8e8e6" }}>
            <p className="ph-jobs__empty" style={{ fontSize: "16px", color: "#666", marginBottom: "8px" }}>
              {query ? `No jobs found matching "${query}".` : "No open jobs posted yet."}
            </p>
            <p style={{ fontSize: "14px", color: "#888" }}>
              Check back soon or explore the skills assessments to boost your profile.
            </p>
          </div>
        )}

        {!loading && !error && filteredJobs.length > 0 && (
          <div className="ph-jobs__grid">
            {filteredJobs.map((job) => (
              <article className="ph-job" key={job.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                  <h2 className="ph-job__title" style={{ margin: 0 }}>{job.title}</h2>
                  <span style={{ fontSize: "11px", textTransform: "capitalize", padding: "3px 8px", background: "#f0f4f8", color: "#1a5fa6", borderRadius: "6px", fontWeight: "600", whiteSpace: "nowrap" }}>
                    {job.employment_type ? job.employment_type.replace("_", " ") : "Full time"}
                  </span>
                </div>
                <p className="ph-job__company">
                  {job.company_name || "Hiring Employer"} {job.location ? `· ${job.location}` : ""}
                </p>
                <p className="ph-job__desc" style={{ minHeight: "42px" }}>
                  {job.description}
                </p>

                {job.skills && job.skills.length > 0 ? (
                  <ul className="ph-job__tags">
                    {job.skills.map((s) => (
                      <li className="ph-job__tag" key={s.id || s.skill_id}>
                        {s.skill_name}
                        {s.minimum_score > 0 && (
                          <span style={{ marginLeft: "4px", opacity: 0.75, fontSize: "11px" }}>
                            (min {s.minimum_score}%)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div style={{ height: "30px" }} />
                )}

                <button
                  className="ph-job__apply"
                  type="button"
                  onClick={() => handleApply(job)}
                >
                  Apply Now
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

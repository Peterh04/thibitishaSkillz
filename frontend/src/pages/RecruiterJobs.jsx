import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import employersApi from "../api/employers";
import jobsApi from "../api/jobs";
import "../styles/recruiter-jobs.css";

const FILTERS = ["All", "published", "closed", "draft"];

export default function RecruiterJobs() {
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

  return (
    <div className="ph-rj">
      <Navbar />

      <main className="ph-rj__main">
        <div className="ph-rj__head">
          <div>
            <h1 className="ph-rj__title">Posted Jobs</h1>
            <p className="ph-rj__sub">
              Manage your job openings and view candidate rankings based on verified abilities.
            </p>
          </div>
          <Link className="ph-btn" to="/recruiter/jobs/new">
            + Post New Job
          </Link>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div className="ph-rj__controls">
          <input
            className="ph-rj__search"
            type="search"
            placeholder="Search jobs by title or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="ph-rj__filters">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={
                  "ph-rj__filter" + (filter === f ? " ph-rj__filter--active" : "")
                }
                onClick={() => setFilter(f)}
              >
                {f === "published" ? "Open" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>
            <p>Loading your jobs...</p>
          </div>
        ) : visibleJobs.length === 0 ? (
          <div className="ph-rj__card" style={{ textAlign: "center", padding: "48px 0" }}>
            <p style={{ fontSize: "16px", color: "#666", margin: "0 0 12px" }}>
              {query ? `No jobs found matching "${query}".` : "No jobs matching the selected filter."}
            </p>
            <Link
              to="/recruiter/jobs/new"
              style={{
                display: "inline-block",
                padding: "8px 16px",
                background: "#1a5fa6",
                color: "#fff",
                borderRadius: "6px",
                textDecoration: "none",
                fontWeight: "500",
                fontSize: "14px",
              }}
            >
              Post a Job Now
            </Link>
          </div>
        ) : (
          <div className="ph-rj__card">
            <table className="ph-rj__table">
              <thead>
                <tr>
                  <th>Job Title</th>
                  <th>Location</th>
                  <th>Type</th>
                  <th>Required Skills</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {visibleJobs.map((job) => {
                  const isOpen = job.status === "published";
                  return (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.title}</strong>
                        <div style={{ fontSize: "12px", color: "#777", marginTop: "2px" }}>
                          Posted {new Date(job.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td style={{ color: "#555" }}>{job.location || "Remote"}</td>
                      <td style={{ textTransform: "capitalize", color: "#555" }}>
                        {job.employment_type ? job.employment_type.replace("_", " ") : "Full time"}
                      </td>
                      <td>
                        {job.skills && job.skills.length > 0 ? (
                          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                            {job.skills.map((s) => (
                              <span
                                key={s.id || s.skill_id}
                                style={{
                                  fontSize: "11px",
                                  padding: "2px 6px",
                                  background: "#f0f4f8",
                                  color: "#1a5fa6",
                                  borderRadius: "4px",
                                }}
                              >
                                {s.skill_name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ color: "#999", fontSize: "12px" }}>None</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            "ph-rj__badge" +
                            (isOpen ? " ph-rj__badge--open" : " ph-rj__badge--closed")
                          }
                        >
                          {isOpen ? "Open" : job.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: "8px", alignItems: "center" }}>
                          <button
                            type="button"
                            className="ph-rj__btn ph-rj__btn--ghost"
                            onClick={() => handleToggleStatus(job)}
                            disabled={togglingId === job.id}
                          >
                            {togglingId === job.id
                              ? "Updating..."
                              : isOpen
                              ? "Close job"
                              : "Reopen"}
                          </button>
                          <Link
                            className="ph-rj__btn"
                            to={`/recruiter/jobs/${job.id}/candidates`}
                          >
                            Candidates →
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

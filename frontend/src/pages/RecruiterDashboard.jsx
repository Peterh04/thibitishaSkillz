import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import employersApi from "../api/employers";
import jobsApi from "../api/jobs";
import applicationsApi from "../api/applications";
import "../styles/dashboard.css";

const TOP_N = 3;

export default function RecruiterDashboard() {
  const { jobId: routeJobId } = useParams();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState([]);
  const [selectedJobId, setSelectedJobId] = useState(routeJobId ? parseInt(routeJobId, 10) : null);
  const [job, setJob] = useState(null);
  const [applications, setApplications] = useState([]);
  const [matches, setMatches] = useState([]);
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

  // 2. Load job details, applicants, and candidate matches when selectedJobId changes
  useEffect(() => {
    if (!selectedJobId) {
      setLoading(false);
      return;
    }

    async function loadJobData() {
      setLoading(true);
      setError("");
      try {
        const [jobData, appsData, matchesData] = await Promise.all([
          jobsApi.getJob(selectedJobId).catch(() => null),
          applicationsApi.getJobApplications(selectedJobId).catch(() => ({ items: [] })),
          jobsApi.getJobMatches(selectedJobId).catch(() => ({ items: [] })),
        ]);

        setJob(jobData);
        setApplications(appsData.items || []);
        setMatches(matchesData.items || []);
      } catch (err) {
        setError(err.message || "Failed to load candidates for this job.");
      } finally {
        setLoading(false);
      }
    }

    loadJobData();
  }, [selectedJobId]);

  // Rank applications top to bottom by match score
  const ranked = useMemo(() => {
    return [...applications].sort((a, b) => (b.match_score || 0) - (a.match_score || 0));
  }, [applications]);

  // Compute statistics
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

  return (
    <div className="ph-dash">
      <Navbar />

      <main className="ph-dash__main">
        {/* Job Header & Job Selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="ph-dash__title">{job?.title || "Candidate Evaluation"}</h1>
            <p className="ph-dash__sub">
              {job?.company_name || "Company"} · Ranked top-to-bottom by verified technical match
            </p>
          </div>

          {jobs.length > 1 && (
            <div>
              <label style={{ fontSize: "12px", color: "#666", display: "block", marginBottom: "4px" }}>
                Switch Job:
              </label>
              <select
                value={selectedJobId || ""}
                onChange={(e) => {
                  const id = parseInt(e.target.value, 10);
                  setSelectedJobId(id);
                  navigate(`/recruiter/jobs/${id}/candidates`);
                }}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", background: "#fff", fontSize: "14px" }}
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

        {/* Alerts */}
        {error && (
          <div style={{ padding: "12px 16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{ padding: "12px 16px", background: "#edf7ed", border: "1px solid #c8e6c9", borderRadius: "8px", color: "#1e4620", marginBottom: "20px", fontSize: "14px" }}>
            {successMsg}
          </div>
        )}

        {/* Stats Row */}
        <div className="ph-dash__stats">
          <div className="ph-stat">
            <p className="ph-stat__label">Total Applicants</p>
            <p className="ph-stat__value">{stats.applicants}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Shortlisted</p>
            <p className="ph-stat__value">{stats.shortlisted}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Average Verified Match</p>
            <p className="ph-stat__value">{stats.avg}%</p>
          </div>
        </div>

        {/* Action bar */}
        {ranked.length > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", color: "#666" }}>
              Showing {ranked.length} candidate{ranked.length > 1 ? "s" : ""}
            </span>
            <button
              type="button"
              onClick={handleSendInvites}
              style={{
                padding: "8px 16px",
                background: "#1a5fa6",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "500",
                fontSize: "13px",
              }}
            >
              Shortlist Top {Math.min(TOP_N, ranked.length)} Candidates
            </button>
          </div>
        )}

        {/* Candidate Ranking Table */}
        <div className="ph-table-card">
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>
              <p>Evaluating candidate skills & applications...</p>
            </div>
          ) : ranked.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>
              <p style={{ fontSize: "16px", margin: "0 0 8px" }}>No applications received yet for this role.</p>
              <p style={{ fontSize: "13px", color: "#888" }}>
                Make sure your job status is set to <strong>Open</strong> to receive applications from verified job seekers.
              </p>
            </div>
          ) : (
            <table className="ph-table">
              <thead>
                <tr>
                  <th style={{ width: "70px" }}>Rank</th>
                  <th>Candidate</th>
                  <th>Match Score</th>
                  <th>Applied</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((candidate, i) => {
                  const rank = i + 1;
                  const isShortlisted =
                    candidate.application_status === "shortlisted" ||
                    candidate.application_status === "accepted";

                  return (
                    <tr
                      key={candidate.id}
                      style={{
                        background: isShortlisted ? "#fcfefc" : undefined,
                      }}
                    >
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "26px",
                            height: "26px",
                            borderRadius: "50%",
                            background: rank <= 3 ? "#eef4fa" : "#f0f0f0",
                            color: rank <= 3 ? "#1a5fa6" : "#666",
                            fontWeight: "700",
                            fontSize: "12px",
                          }}
                        >
                          #{rank}
                        </span>
                      </td>
                      <td>
                        <strong>{candidate.candidate_name || `Candidate #${candidate.candidate_id}`}</strong>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <strong style={{ fontSize: "15px", color: "#1a5fa6" }}>
                            {candidate.match_score != null ? `${Math.round(candidate.match_score)}%` : "—"}
                          </strong>
                        </div>
                      </td>
                      <td style={{ color: "#666", fontSize: "13px" }}>
                        {new Date(candidate.applied_at).toLocaleDateString()}
                      </td>
                      <td>
                        <select
                          value={candidate.application_status}
                          disabled={updatingAppId === candidate.id}
                          onChange={(e) => handleStatusChange(candidate.id, e.target.value)}
                          style={{
                            padding: "4px 8px",
                            borderRadius: "6px",
                            fontSize: "12px",
                            fontWeight: "600",
                            border: "1px solid #d4d4d4",
                            textTransform: "capitalize",
                            background: isShortlisted ? "#e3f1d9" : "#fff",
                            color: isShortlisted ? "#2c5a14" : "#333",
                            cursor: "pointer",
                          }}
                        >
                          <option value="pending">Pending</option>
                          <option value="reviewing">Reviewing</option>
                          <option value="interviewed">Interviewed</option>
                          <option value="shortlisted">Shortlisted</option>
                          <option value="accepted">Accepted</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setSelectedCandidate(candidate)}
                          style={{
                            padding: "5px 12px",
                            background: "#fff",
                            border: "1px solid #d4d4d4",
                            borderRadius: "4px",
                            fontSize: "12px",
                            cursor: "pointer",
                            fontWeight: "500",
                            color: "#1a5fa6",
                          }}
                        >
                          Inspect Application
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 1000,
              padding: "20px",
            }}
          >
            <div
              style={{
                background: "#fff",
                borderRadius: "12px",
                width: "100%",
                maxWidth: "600px",
                padding: "32px",
                boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "20px", margin: 0, fontWeight: "600" }}>
                  {selectedCandidate.candidate_name || `Candidate #${selectedCandidate.candidate_id}`}
                </h2>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#666" }}
                >
                  ✕
                </button>
              </div>

              <div style={{ background: "#f8f9fa", padding: "16px", borderRadius: "8px", marginBottom: "20px" }}>
                <p style={{ margin: "0 0 6px", fontSize: "14px" }}>
                  <strong>Match Score:</strong>{" "}
                  <span style={{ color: "#1a5fa6", fontWeight: "700" }}>
                    {selectedCandidate.match_score != null ? `${Math.round(selectedCandidate.match_score)}%` : "N/A"}
                  </span>
                </p>
                <p style={{ margin: "0 0 6px", fontSize: "14px" }}>
                  <strong>Applied Date:</strong> {new Date(selectedCandidate.applied_at).toLocaleString()}
                </p>
                <p style={{ margin: 0, fontSize: "14px", textTransform: "capitalize" }}>
                  <strong>Status:</strong> {selectedCandidate.application_status}
                </p>
              </div>

              {selectedCandidate.cover_letter ? (
                <div style={{ marginBottom: "20px" }}>
                  <h4 style={{ margin: "0 0 8px", fontSize: "14px", color: "#555" }}>Candidate Note / Cover Letter:</h4>
                  <p style={{ margin: 0, fontSize: "14px", color: "#333", background: "#fafafa", padding: "12px", borderRadius: "6px", border: "1px solid #eee", lineHeight: "1.5" }}>
                    {selectedCandidate.cover_letter}
                  </p>
                </div>
              ) : (
                <p style={{ fontSize: "13px", color: "#888", fontStyle: "italic", marginBottom: "20px" }}>
                  No cover note submitted.
                </p>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => {
                    handleStatusChange(selectedCandidate.id, "shortlisted");
                    setSelectedCandidate(null);
                  }}
                  style={{
                    padding: "8px 16px",
                    background: "#2c5a14",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: "500",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Mark as Shortlisted
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  style={{
                    padding: "8px 16px",
                    background: "#fff",
                    border: "1px solid #d4d4d4",
                    borderRadius: "6px",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

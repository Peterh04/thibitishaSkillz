import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import employersApi from "../api/employers";
import applicationsApi from "../api/applications";
import "../styles/recruiter-home.css";

export default function RecruiterHome() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [allApplications, setAllApplications] = useState([]);
  const [error, setError] = useState("");

  // Profile modal state if company name is missing
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

      // Load applications for these jobs
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

  return (
    <div className="ph-home">
      <Navbar />

      <main className="ph-home__main">
        {/* Recruiter Header */}
        <div className="ph-home__head">
          <div>
            <h1 className="ph-home__title">
              Welcome back, {user?.full_name || "Recruiter"}
            </h1>
            <p className="ph-home__sub">
              {profile?.company_name ? (
                <span>
                  Hiring for <strong>{profile.company_name}</strong> {profile.industry ? `(${profile.industry})` : ""}
                </span>
              ) : (
                "Here is where your skill-verified hiring stands today."
              )}
            </p>
          </div>
          <Link className="ph-btn" to="/recruiter/jobs/new">
            + Post New Job
          </Link>
        </div>

        {/* Company Profile Setup Warning */}
        {profile && !profile.company_name && (
          <div style={{ background: "#fff", border: "1px solid #ffd591", borderRadius: "10px", padding: "20px", marginBottom: "24px" }}>
            <h3 style={{ margin: "0 0 6px", fontSize: "16px", color: "#d46b08" }}>Set Your Company Name</h3>
            <p style={{ margin: "0 0 14px", fontSize: "14px", color: "#666" }}>
              Before publishing job postings, please provide your organization name.
            </p>
            <form onSubmit={handleSaveProfile} style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <input
                type="text"
                placeholder="Company Name (e.g. Acme Corp)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", flex: 1, minWidth: "200px" }}
              />
              <input
                type="text"
                placeholder="Industry (e.g. Fintech, Health, Edtech)"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                style={{ padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", flex: 1, minWidth: "160px" }}
              />
              <button
                type="submit"
                disabled={updatingProfile}
                style={{ padding: "8px 16px", background: "#1a5fa6", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "500" }}
              >
                {updatingProfile ? "Saving..." : "Save Profile"}
              </button>
            </form>
          </div>
        )}

        {/* Stats Grid */}
        <div className="ph-home__stats">
          <div className="ph-stat">
            <p className="ph-stat__label">Open jobs</p>
            <p className="ph-stat__value">{totals.open}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Total applicants</p>
            <p className="ph-stat__value">{totals.applicants}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Interviews / Reviewed</p>
            <p className="ph-stat__value">{totals.interviewed}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Shortlisted candidates</p>
            <p className="ph-stat__value">{totals.shortlisted}</p>
          </div>
        </div>

        {/* Recent Jobs Table */}
        <div className="ph-home__section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 className="ph-home__heading" style={{ margin: 0 }}>Active Job Postings</h2>
            <Link to="/recruiter/jobs" style={{ fontSize: "14px", color: "#1a5fa6", textDecoration: "none", fontWeight: "500" }}>
              View all jobs →
            </Link>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "32px", color: "#666" }}>
              <p>Loading your job listings...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="ph-table-card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <p style={{ fontSize: "16px", color: "#555", margin: "0 0 12px" }}>
                You have not created any job postings yet.
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
                }}
              >
                Create your first job posting
              </Link>
            </div>
          ) : (
            <div className="ph-table-card">
              <table className="ph-table">
                <thead>
                  <tr>
                    <th>Job Title</th>
                    <th>Status</th>
                    <th>Required Skills</th>
                    <th>Location</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td>
                        <strong>{job.title}</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            textTransform: "capitalize",
                            background: job.status === "published" ? "#e3f1d9" : "#f0f0f0",
                            color: job.status === "published" ? "#2c5a14" : "#666",
                          }}
                        >
                          {job.status === "published" ? "Open" : job.status}
                        </span>
                      </td>
                      <td>
                        {job.skills && job.skills.length > 0 ? (
                          <span style={{ fontSize: "13px", color: "#555" }}>
                            {job.skills.map((s) => s.skill_name).join(", ")}
                          </span>
                        ) : (
                          <span style={{ color: "#999", fontSize: "13px" }}>None specified</span>
                        )}
                      </td>
                      <td style={{ color: "#666" }}>{job.location || "Remote"}</td>
                      <td style={{ textAlign: "right" }}>
                        <Link
                          to={`/recruiter/jobs/${job.id}/candidates`}
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            background: "#1a5fa6",
                            color: "#fff",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            textDecoration: "none",
                          }}
                        >
                          View Candidates
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

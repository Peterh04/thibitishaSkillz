import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import cvApi from "../api/cv";
import skillsApi from "../api/skills";
import assessmentsApi from "../api/assessments";
import applicationsApi from "../api/applications";
import voiceInterviewsApi from "../api/voiceInterviews";
import usersApi from "../api/users";
import "../styles/dashboard.css";

export default function CandidateDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  // States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [activeCv, setActiveCv] = useState(null);
  const [cvAnalysis, setCvAnalysis] = useState(null);
  const [analyzingCv, setAnalyzingCv] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);

  const [candidateSkills, setCandidateSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [selectedSkillToAdd, setSelectedSkillToAdd] = useState("");

  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [isPublicProfile, setIsPublicProfile] = useState(false);

  const loadAllData = async () => {
    setLoading(true);
    setError("");
    try {
      // 1. Load active CV
      try {
        const cv = await cvApi.getMyCv();
        setActiveCv(cv);
        if (cv?.id) {
          try {
            const analysis = await cvApi.getCvAnalysis(cv.id);
            setCvAnalysis(analysis);
          } catch {
            // Not analyzed yet
          }
        }
      } catch {
        setActiveCv(null);
      }

      // 2. Load candidate skills & available skills
      const [mySkillsData, availableSkillsData] = await Promise.all([
        skillsApi.getMySkills(),
        skillsApi.getSkills(),
      ]);
      setCandidateSkills(mySkillsData || []);
      setAllSkills(availableSkillsData || []);

      // 3. Load applications
      const apps = await applicationsApi.getMyApplications();
      setApplications(apps.items || []);

      // 4. Load interviews
      try {
        const ivs = await voiceInterviewsApi.getMyInterviews();
        setInterviews(ivs || []);
      } catch {
        setInterviews([]);
      }

      // 5. Load profile public status
      try {
        const me = await usersApi.getMyAccount();
        if (me.candidate_profile) {
          setIsPublicProfile(!!me.candidate_profile.is_public);
        }
      } catch {
        // ignore
      }
    } catch (err) {
      setError(err.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCv(true);
    setError("");
    setSuccessMsg("");

    try {
      const uploaded = await cvApi.uploadCv(file);
      setActiveCv(uploaded);
      setSuccessMsg("CV uploaded successfully! Starting AI skill extraction...");

      // Automatically trigger AI analysis
      try {
        setAnalyzingCv(true);
        const analysis = await cvApi.analyzeCv(uploaded.id);
        setCvAnalysis(analysis);
        setActiveCv((prev) => (prev ? { ...prev, analysis_status: "completed" } : null));
        setSuccessMsg("CV analyzed and verified by Gemini AI! Extracted skills have been updated.");
        // Refresh skills list
        const refreshedSkills = await skillsApi.getMySkills();
        setCandidateSkills(refreshedSkills || []);
      } catch (aiErr) {
        setSuccessMsg("CV uploaded. Click 'Run AI Analysis' to extract skills.");
      } finally {
        setAnalyzingCv(false);
      }
    } catch (err) {
      setError(err.message || "Failed to upload CV.");
    } finally {
      setUploadingCv(false);
    }
  };

  const handleTriggerAnalysis = async () => {
    if (!activeCv) return;
    setAnalyzingCv(true);
    setError("");
    setSuccessMsg("");
    try {
      const analysis = await cvApi.analyzeCv(activeCv.id);
      setCvAnalysis(analysis);
      setActiveCv((prev) => (prev ? { ...prev, analysis_status: "completed" } : null));
      setSuccessMsg("AI analysis complete! Skills and credentials extracted.");
      const refreshedSkills = await skillsApi.getMySkills();
      setCandidateSkills(refreshedSkills || []);
    } catch (err) {
      setError(err.message || "Failed to analyze CV.");
    } finally {
      setAnalyzingCv(false);
    }
  };

  const handleTogglePublic = async () => {
    try {
      const next = !isPublicProfile;
      await usersApi.updateCandidateProfile({ is_public: next });
      setIsPublicProfile(next);
      setSuccessMsg(`Your profile is now ${next ? "Public (discoverable by recruiters)" : "Private"}.`);
    } catch (err) {
      setError(err.message || "Failed to update profile visibility.");
    }
  };

  const handleAddSkill = async () => {
    if (!selectedSkillToAdd) return;
    try {
      await skillsApi.addMySkill({ skill_id: parseInt(selectedSkillToAdd, 10) });
      setSelectedSkillToAdd("");
      const refreshedSkills = await skillsApi.getMySkills();
      setCandidateSkills(refreshedSkills || []);
      setSuccessMsg("Skill added to profile! Take the assessment to earn verification.");
    } catch (err) {
      setError(err.message || "Failed to add skill.");
    }
  };

  const handleRemoveSkill = async (skillId) => {
    try {
      await skillsApi.removeMySkill(skillId);
      setCandidateSkills((list) => list.filter((s) => s.skill_id !== skillId));
      setSuccessMsg("Skill removed from profile.");
    } catch (err) {
      setError(err.message || "Failed to remove skill.");
    }
  };

  const handleStartInterview = async (applicationId) => {
    try {
      const interview = await voiceInterviewsApi.startInterview(applicationId);
      navigate(`/interview/${interview.id}`);
    } catch (err) {
      setError(err.message || "Unable to start voice interview.");
    }
  };

  const candidateSkillIds = new Set(candidateSkills.map((s) => s.skill_id));
  const unaddedSkills = allSkills.filter((s) => !candidateSkillIds.has(s.id));

  return (
    <div className="ph-dash">
      <Navbar />

      <main className="ph-dash__main">
        {/* Header Profile Summary */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <h1 className="ph-dash__title">Candidate Dashboard</h1>
            <p className="ph-dash__sub">
              Welcome back, <strong>{user?.full_name}</strong> · {user?.email}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "#fff", padding: "8px 16px", borderRadius: "8px", border: "1px solid #e8e8e6" }}>
            <span style={{ fontSize: "13px", color: "#555" }}>Profile Visibility:</span>
            <button
              type="button"
              onClick={handleTogglePublic}
              style={{
                background: isPublicProfile ? "#e3f1d9" : "#f0f0f0",
                color: isPublicProfile ? "#2c5a14" : "#555",
                border: "none",
                padding: "4px 10px",
                borderRadius: "12px",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {isPublicProfile ? "Public to Employers" : "Private"}
            </button>
          </div>
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

        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>
            <p>Loading your skills, tests, and applications...</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>

            {/* 1. CV & AI Analysis Card */}
            <div className="ph-table-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", margin: 0, fontWeight: "600" }}>Your Curriculum Vitae (CV)</h2>
                <div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingCv}
                    style={{
                      background: "#1a5fa6",
                      color: "#fff",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "6px",
                      fontSize: "13px",
                      cursor: "pointer",
                      fontWeight: "500",
                    }}
                  >
                    {uploadingCv ? "Uploading..." : activeCv ? "Replace CV" : "Upload CV"}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,application/pdf"
                    style={{ display: "none" }}
                    onChange={handleCvUpload}
                  />
                </div>
              </div>

              {activeCv ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f7f6f4", padding: "12px 16px", borderRadius: "8px", marginBottom: "16px" }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: "600", fontSize: "14px" }}>{activeCv.file_name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#777" }}>
                        Uploaded {new Date(activeCv.uploaded_at).toLocaleDateString()} · Status: <span style={{ textTransform: "capitalize", fontWeight: "500" }}>{activeCv.analysis_status}</span>
                      </p>
                    </div>
                    {activeCv.analysis_status !== "completed" && (
                      <button
                        type="button"
                        onClick={handleTriggerAnalysis}
                        disabled={analyzingCv}
                        style={{
                          background: "#fff",
                          border: "1px solid #1a5fa6",
                          color: "#1a5fa6",
                          padding: "6px 12px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        {analyzingCv ? "Analyzing..." : "Run AI Analysis"}
                      </button>
                    )}
                  </div>

                  {/* AI Analysis Summary */}
                  {cvAnalysis && (
                    <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: "8px", padding: "16px", marginTop: "12px" }}>
                      <p style={{ fontSize: "12px", fontWeight: "700", textTransform: "uppercase", color: "#1a5fa6", margin: "0 0 8px" }}>
                        Gemini AI Extracted Insights
                      </p>
                      {cvAnalysis.experience_summary && (
                        <p style={{ fontSize: "13px", color: "#444", marginBottom: "8px" }}>
                          <strong>Experience:</strong> {cvAnalysis.experience_summary}
                        </p>
                      )}
                      {cvAnalysis.education && (
                        <p style={{ fontSize: "13px", color: "#444", marginBottom: "8px" }}>
                          <strong>Education:</strong> {cvAnalysis.education}
                        </p>
                      )}
                      {cvAnalysis.skills && cvAnalysis.skills.length > 0 && (
                        <div style={{ marginTop: "12px" }}>
                          <strong style={{ fontSize: "13px", color: "#444", display: "block", marginBottom: "8px" }}>
                            Skills detected in CV:
                          </strong>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                            {cvAnalysis.skills.map((s, idx) => {
                              const skillName = typeof s === "string" ? s : s.name;
                              return (
                                <span
                                  key={idx}
                                  style={{
                                    padding: "3px 10px",
                                    background: "#eef4fa",
                                    color: "#1a5fa6",
                                    borderRadius: "12px",
                                    fontSize: "12px",
                                    fontWeight: "500",
                                  }}
                                >
                                  {skillName}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "24px", color: "#777" }}>
                  <p style={{ margin: "0 0 8px" }}>No CV uploaded yet.</p>
                  <p style={{ margin: 0, fontSize: "13px" }}>
                    Upload your CV so Google Gemini can extract your skills and match you to jobs.
                  </p>
                </div>
              )}
            </div>

            {/* 2. Skills & Verifications Card */}
            <div className="ph-table-card" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
                <div>
                  <h2 style={{ fontSize: "18px", margin: 0, fontWeight: "600" }}>Verified Skills & Certifications</h2>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#666" }}>
                    Complete AI assessments to verify your skills and rank higher with employers.
                  </p>
                </div>

                {/* Add skill dropdown */}
                {unaddedSkills.length > 0 && (
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      value={selectedSkillToAdd}
                      onChange={(e) => setSelectedSkillToAdd(e.target.value)}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", fontSize: "13px" }}
                    >
                      <option value="">Select a skill to add...</option>
                      {unaddedSkills.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={!selectedSkillToAdd}
                      style={{
                        background: "#1a5fa6",
                        color: "#fff",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: "6px",
                        fontSize: "13px",
                        cursor: "pointer",
                      }}
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {candidateSkills.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#777" }}>
                  <p>You haven't added any skills to your profile yet.</p>
                  <p style={{ fontSize: "13px" }}>Select a skill above or upload your CV to automatically extract skills.</p>
                </div>
              ) : (
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Skill</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th>Verified Score</th>
                      <th>Level</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateSkills.map((skill) => (
                      <tr key={skill.id || skill.skill_id}>
                        <td>
                          <strong>{skill.skill_name}</strong>
                        </td>
                        <td>{skill.category || "General"}</td>
                        <td>
                          {skill.is_verified ? (
                            <span style={{ background: "#e3f1d9", color: "#2c5a14", padding: "3px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "600" }}>
                              Verified
                            </span>
                          ) : (
                            <span style={{ background: "#f5f5f5", color: "#666", padding: "3px 8px", borderRadius: "10px", fontSize: "12px" }}>
                              Unverified
                            </span>
                          )}
                        </td>
                        <td>
                          {skill.verification_score != null ? `${Math.round(skill.verification_score)}%` : "—"}
                        </td>
                        <td>
                          {skill.verification_level ? (
                            <span style={{ fontWeight: "600", color: "#1a5fa6" }}>
                              {skill.verification_level}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            to={`/assessments/${skill.skill_id}`}
                            style={{
                              display: "inline-block",
                              background: skill.is_verified ? "#f0f4f8" : "#1a5fa6",
                              color: skill.is_verified ? "#1a5fa6" : "#fff",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              textDecoration: "none",
                              fontWeight: "500",
                              marginRight: "8px",
                            }}
                          >
                            {skill.is_verified ? "Retake Test" : "Take Assessment"}
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemoveSkill(skill.skill_id)}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#888",
                              cursor: "pointer",
                              fontSize: "12px",
                              textDecoration: "underline",
                            }}
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 3. My Applications Card */}
            <div className="ph-table-card" style={{ padding: "24px" }}>
              <h2 style={{ fontSize: "18px", margin: "0 0 16px", fontWeight: "600" }}>Your Job Applications</h2>

              {applications.length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "#777" }}>
                  <p>You haven't submitted any job applications yet.</p>
                  <Link
                    to="/"
                    style={{
                      display: "inline-block",
                      marginTop: "8px",
                      color: "#1a5fa6",
                      fontWeight: "500",
                      fontSize: "14px",
                      textDecoration: "none",
                    }}
                  >
                    Browse Open Jobs →
                  </Link>
                </div>
              ) : (
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Job Title</th>
                      <th>Applied Date</th>
                      <th>Status</th>
                      <th>Match Score</th>
                      <th style={{ textAlign: "right" }}>Next Step</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td>
                          <strong>{app.job_title}</strong>
                        </td>
                        <td>{new Date(app.applied_at).toLocaleDateString()}</td>
                        <td>
                          <span
                            style={{
                              textTransform: "capitalize",
                              padding: "3px 8px",
                              borderRadius: "10px",
                              fontSize: "12px",
                              fontWeight: "600",
                              background:
                                app.application_status === "shortlisted" || app.application_status === "accepted"
                                  ? "#e3f1d9"
                                  : app.application_status === "rejected"
                                  ? "#fee4e2"
                                  : "#eef4fa",
                              color:
                                app.application_status === "shortlisted" || app.application_status === "accepted"
                                  ? "#2c5a14"
                                  : app.application_status === "rejected"
                                  ? "#b42318"
                                  : "#154f8c",
                            }}
                          >
                            {app.application_status}
                          </span>
                        </td>
                        <td>
                          {app.match_score != null ? `${Math.round(app.match_score)}%` : "—"}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => handleStartInterview(app.id)}
                            style={{
                              background: "#1a5fa6",
                              color: "#fff",
                              border: "none",
                              padding: "4px 10px",
                              borderRadius: "4px",
                              fontSize: "12px",
                              cursor: "pointer",
                              fontWeight: "500",
                            }}
                          >
                            Voice Interview
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* 4. Voice Interviews Card */}
            {interviews.length > 0 && (
              <div className="ph-table-card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "18px", margin: "0 0 16px", fontWeight: "600" }}>AI Voice Interviews</h2>
                <table className="ph-table">
                  <thead>
                    <tr>
                      <th>Interview ID</th>
                      <th>Status</th>
                      <th>Overall Score</th>
                      <th>Tech Score</th>
                      <th>Comm Score</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {interviews.map((iv) => (
                      <tr key={iv.id}>
                        <td>#{iv.id}</td>
                        <td style={{ textTransform: "capitalize" }}>{iv.status}</td>
                        <td><strong>{iv.overall_score != null ? `${Math.round(iv.overall_score)}%` : "In Progress"}</strong></td>
                        <td>{iv.technical_score != null ? `${Math.round(iv.technical_score)}%` : "—"}</td>
                        <td>{iv.communication_score != null ? `${Math.round(iv.communication_score)}%` : "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            to={`/interview/${iv.id}`}
                            style={{
                              color: "#1a5fa6",
                              fontSize: "13px",
                              fontWeight: "500",
                              textDecoration: "none",
                            }}
                          >
                            {iv.status === "completed" ? "Review Transcript" : "Resume Interview →"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

          </div>
        )}
      </main>
    </div>
  );
}


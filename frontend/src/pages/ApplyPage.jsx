import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import jobsApi from "../api/jobs";
import cvApi from "../api/cv";
import applicationsApi from "../api/applications";
import voiceInterviewsApi from "../api/voiceInterviews";
import "../styles/apply.css";

export default function ApplyPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isJobSeeker, user } = useAuth();

  const [job, setJob] = useState(null);
  const [loadingJob, setLoadingJob] = useState(true);
  const [existingCv, setExistingCv] = useState(null);
  const [useExistingCv, setUseExistingCv] = useState(true);

  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploadingCv, setUploadingCv] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedApplication, setSubmittedApplication] = useState(null);

  // Load Job Details
  useEffect(() => {
    async function fetchJob() {
      if (!jobId) {
        // Fallback: load first published job
        try {
          const list = await jobsApi.getJobs({ status: "published", page_size: 1 });
          if (list.items && list.items.length > 0) {
            setJob(list.items[0]);
          } else {
            setError("No published job available to apply to.");
          }
        } catch (err) {
          setError(err.message || "Failed to load job.");
        } finally {
          setLoadingJob(false);
        }
        return;
      }

      setLoadingJob(true);
      try {
        const data = await jobsApi.getJob(jobId);
        setJob(data);
      } catch (err) {
        setError(err.message || "Unable to load job details.");
      } finally {
        setLoadingJob(false);
      }
    }
    fetchJob();
  }, [jobId]);

  // Load Existing CV if authenticated candidate
  useEffect(() => {
    async function checkExistingCv() {
      if (!isAuthenticated || !isJobSeeker) return;
      try {
        const cv = await cvApi.getMyCv();
        if (cv && cv.id) {
          setExistingCv(cv);
          setUseExistingCv(true);
        }
      } catch {
        // No existing CV uploaded yet
        setUseExistingCv(false);
      }
    }
    checkExistingCv();
  }, [isAuthenticated, isJobSeeker]);

  const pickFile = (f) => {
    if (!f) return;
    const validTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    const isDocx = f.name.endsWith(".docx") || f.name.endsWith(".doc");
    if (!validTypes.includes(f.type) && !isDocx) {
      setError("Please upload your CV as a PDF or DOCX file.");
      return;
    }
    setError("");
    setFile(f);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const onSubmit = async (e) => {
    e.preventDefault();

    if (!isAuthenticated) {
      navigate("/signin", { state: { from: { pathname: `/apply/${job?.id || ""}` } } });
      return;
    }

    if (!isJobSeeker) {
      setError("Only candidates can submit job applications. Switch to a candidate account.");
      return;
    }

    if (!job) {
      setError("Job details missing.");
      return;
    }

    if (!useExistingCv && !file) {
      setError("Please select a CV file to upload.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // 1. If uploading new CV, upload it and trigger analysis
      let activeCvId = existingCv?.id;
      if (!useExistingCv && file) {
        setUploadingCv(true);
        const uploaded = await cvApi.uploadCv(file);
        activeCvId = uploaded.id;
        // Trigger background AI analysis
        try {
          await cvApi.analyzeCv(uploaded.id);
        } catch (analysisErr) {
          console.warn("CV AI analysis queued:", analysisErr.message);
        }
        setUploadingCv(false);
      }

      // 2. Submit application
      const app = await applicationsApi.applyToJob(job.id, {
        cover_letter: coverLetter.trim() || undefined,
      });

      setSubmittedApplication(app);
    } catch (err) {
      setError(err.message || "Failed to submit application. Please check your inputs.");
    } finally {
      setSubmitting(false);
      setUploadingCv(false);
    }
  };

  const startVoiceInterview = async () => {
    if (!submittedApplication) return;
    try {
      const interview = await voiceInterviewsApi.startInterview(submittedApplication.id);
      navigate(`/interview/${interview.id}`);
    } catch (err) {
      setError(err.message || "Could not launch interview. Please try from your dashboard.");
    }
  };

  if (loadingJob) {
    return (
      <div className="ph-apply">
        <Navbar />
        <main className="ph-apply__main" style={{ textAlign: "center", padding: "60px 0" }}>
          <p>Loading role details...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="ph-apply">
      <Navbar />

      <main className="ph-apply__main">
        {/* Left Side: Job Info */}
        <section className="ph-apply__card">
          <span className="ph-apply__badge" style={{ textTransform: "capitalize" }}>
            {job?.status || "Open"}
          </span>
          <h1 className="ph-apply__job-title">{job?.title || "Role Not Found"}</h1>
          <p className="ph-apply__company">
            {job?.company_name || "Employer"} · {job?.location || "Remote"}
          </p>

          <h2 className="ph-apply__heading">About the role</h2>
          <p className="ph-apply__text">
            {job?.description || "No description provided."}
          </p>

          {job?.responsibilities && (
            <>
              <h2 className="ph-apply__heading">Responsibilities</h2>
              <p className="ph-apply__text" style={{ whiteSpace: "pre-line" }}>
                {job.responsibilities}
              </p>
            </>
          )}

          {job?.skills && job.skills.length > 0 && (
            <>
              <h2 className="ph-apply__heading">Verified skills evaluated</h2>
              <ul className="ph-apply__list">
                {job.skills.map((s) => (
                  <li key={s.id || s.skill_id}>
                    <strong>{s.skill_name}</strong>
                    {s.minimum_score > 0 ? ` (Minimum passing score: ${s.minimum_score}%)` : ""}
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* Right Side: Application Card or Success Card */}
        <section className="ph-apply__card">
          {submittedApplication ? (
            <div style={{ textAlign: "center", padding: "16px 0" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  background: "#e3f1d9",
                  color: "#2c5a14",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "24px",
                  margin: "0 auto 16px",
                }}
              >
                ✓
              </div>
              <h2 className="ph-apply__form-title" style={{ marginBottom: "8px" }}>
                Application Submitted!
              </h2>
              <p style={{ color: "#555", fontSize: "15px", lineHeight: "1.5" }}>
                Your application for <strong>{job.title}</strong> has been received.
              </p>

              {submittedApplication.match_score != null && (
                <div
                  style={{
                    background: "#f7f6f4",
                    border: "1px solid #e8e8e6",
                    borderRadius: "8px",
                    padding: "16px",
                    margin: "20px 0",
                  }}
                >
                  <p style={{ margin: "0 0 4px", fontSize: "13px", color: "#666" }}>
                    Algorithmic Skill Match Score
                  </p>
                  <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#1a5fa6" }}>
                    {Math.round(submittedApplication.match_score)}%
                  </p>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "24px" }}>
                <button
                  type="button"
                  className="ph-apply__submit"
                  onClick={startVoiceInterview}
                  style={{ background: "#1a5fa6" }}
                >
                  Start AI Voice Interview Now
                </button>
                <Link
                  to="/dashboard"
                  style={{
                    display: "block",
                    padding: "12px",
                    textAlign: "center",
                    textDecoration: "none",
                    color: "#555",
                    fontSize: "14px",
                  }}
                >
                  View My Applications on Dashboard
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h2 className="ph-apply__form-title">Your application</h2>

              {!isAuthenticated && (
                <div
                  style={{
                    background: "#eef4fa",
                    padding: "16px",
                    borderRadius: "8px",
                    marginBottom: "20px",
                    fontSize: "14px",
                  }}
                >
                  <p style={{ margin: "0 0 10px", color: "#154f8c" }}>
                    You need to be signed in as a candidate to submit your verified application.
                  </p>
                  <Link
                    to="/signin"
                    state={{ from: { pathname: `/apply/${job?.id || ""}` } }}
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
                    Sign in to Continue
                  </Link>
                </div>
              )}

              <form onSubmit={onSubmit} noValidate>
                {/* CV Selection */}
                {existingCv && (
                  <div style={{ marginBottom: "20px" }}>
                    <div style={{ display: "flex", gap: "16px", marginBottom: "12px" }}>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="cvChoice"
                          checked={useExistingCv}
                          onChange={() => setUseExistingCv(true)}
                        />
                        Use Current CV ({existingCv.file_name})
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", cursor: "pointer" }}>
                        <input
                          type="radio"
                          name="cvChoice"
                          checked={!useExistingCv}
                          onChange={() => setUseExistingCv(false)}
                        />
                        Upload New CV
                      </label>
                    </div>

                    {useExistingCv && (
                      <div style={{ padding: "12px", background: "#f8f9fa", borderRadius: "8px", border: "1px solid #e2e4e8", fontSize: "13px", color: "#444" }}>
                        <span>Active file: <strong>{existingCv.file_name}</strong></span>
                        <span style={{ marginLeft: "12px", color: "#2c5a14", background: "#e3f1d9", padding: "2px 6px", borderRadius: "4px" }}>
                          Verified in system
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {(!existingCv || !useExistingCv) && (
                  <div
                    className={"ph-drop" + (dragging ? " ph-drop--active" : "")}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragging(true);
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                  >
                    <p className="ph-drop__label">
                      {file ? file.name : "Upload your CV (PDF or DOCX)"}
                    </p>
                    <button
                      className="ph-drop__btn"
                      type="button"
                      onClick={() => fileInput.current?.click()}
                    >
                      {file ? "Change File" : "Choose File"}
                    </button>
                    <input
                      ref={fileInput}
                      className="ph-drop__input"
                      type="file"
                      accept=".pdf,.docx,.doc,application/pdf"
                      onChange={(e) => pickFile(e.target.files?.[0])}
                    />
                  </div>
                )}

                <label className="ph-apply__label" htmlFor="coverLetter" style={{ marginTop: "16px" }}>
                  Short note to hiring team (optional)
                </label>
                <textarea
                  id="coverLetter"
                  className="ph-apply__input"
                  rows={3}
                  placeholder="Highlight key skills or relevant projects..."
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  style={{ resize: "vertical", height: "auto" }}
                />

                {error && (
                  <p className="ph-apply__error" role="alert">
                    {error}
                  </p>
                )}

                <button
                  className="ph-apply__submit"
                  type="submit"
                  disabled={submitting || uploadingCv || !job}
                  style={{ marginTop: "20px" }}
                >
                  {uploadingCv
                    ? "Analyzing CV with AI..."
                    : submitting
                    ? "Submitting Application..."
                    : "Submit Application"}
                </button>
              </form>

              <p className="ph-apply__note">
                Our AI verifies your skills and projects directly. Candidates with high verified skill matches are prioritized.
              </p>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

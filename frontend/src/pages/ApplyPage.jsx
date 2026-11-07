import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import jobsApi from "../api/jobs";
import cvApi from "../api/cv";
import applicationsApi from "../api/applications";
import Card, { CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Textarea from "../components/ui/Textarea";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import Skeleton from "../components/ui/Skeleton";
import {
  IconBuilding,
  IconMapPin,
  IconFileText,
  IconUploadCloud,
  IconCheck,
  IconCheckCircle,
  IconArrowLeft,
  IconArrowRight,
  IconAward,
  IconMic,
  IconX,
} from "../components/ui/Icons";

export default function ApplyPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isJobSeeker } = useAuth();

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

  // 1. Fetch Job info
  useEffect(() => {
    async function fetchJob() {
      if (!jobId) {
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

  // 2. Fetch existing CV
  useEffect(() => {
    async function fetchCv() {
      if (!isAuthenticated || !isJobSeeker) return;
      try {
        const cv = await cvApi.getMyCv();
        if (cv && cv.id) {
          setExistingCv(cv);
          setUseExistingCv(true);
        } else {
          setUseExistingCv(false);
        }
      } catch {
        setUseExistingCv(false);
      }
    }
    fetchCv();
  }, [isAuthenticated, isJobSeeker]);

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (f) validateAndSetFile(f);
  };

  const validateAndSetFile = (f) => {
    const validExts = [".pdf", ".docx", ".doc"];
    const ext = "." + f.name.split(".").pop().toLowerCase();
    if (!validExts.includes(ext)) {
      setError("Please upload your CV as a PDF or Word document (.pdf, .docx).");
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setError("File exceeds the 5MB size limit. Please upload a smaller file.");
      return;
    }
    setError("");
    setFile(f);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/signin", { state: { from: { pathname: `/apply/${jobId || ""}` } } });
      return;
    }

    if (!useExistingCv && !file) {
      setError("Please select or upload a CV to attach to your application.");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      let finalCvId = existingCv?.id;

      // Upload new CV if requested
      if (!useExistingCv || !finalCvId) {
        setUploadingCv(true);
        const formData = new FormData();
        formData.append("file", file);
        const cvResult = await cvApi.uploadCv(formData);
        finalCvId = cvResult.id;
        setUploadingCv(false);
      }

      // Submit application
      const activeJobId = job?.id || jobId;
      const appResult = await (applicationsApi.applyToJob || applicationsApi.applyForJob)(activeJobId, {
        cover_letter: coverLetter.trim() || undefined,
        cv_id: finalCvId,
      });

      setSubmittedApplication(appResult);
    } catch (err) {
      setError(err.message || "Failed to submit application. Please verify your details.");
    } finally {
      setSubmitting(false);
      setUploadingCv(false);
    }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        {/* Back Link */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <Link
            to="/jobs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            <IconArrowLeft size={16} /> Back to all jobs
          </Link>
        </div>

        {/* Loading State */}
        {loadingJob && (
          <Card>
            <CardBody style={{ padding: "var(--space-8)" }}>
              <Skeleton height="28px" width="60%" style={{ marginBottom: "var(--space-2)" }} />
              <Skeleton height="16px" width="35%" style={{ marginBottom: "var(--space-6)" }} />
              <Skeleton height="100px" width="100%" />
            </CardBody>
          </Card>
        )}

        {/* Error Callout */}
        {error && (
          <Alert variant="danger" title="Application issue" style={{ marginBottom: "var(--space-6)" }}>
            {error}
          </Alert>
        )}

        {/* Submitted Confirmation State */}
        {submittedApplication && (
          <Card>
            <CardBody style={{ padding: "var(--space-10)", textAlign: "center" }}>
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "50%",
                  backgroundColor: "var(--color-success-bg)",
                  color: "var(--color-success)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto var(--space-4)",
                }}
              >
                <IconCheckCircle size={32} />
              </div>

              <h2
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text)",
                  marginBottom: "var(--space-2)",
                }}
              >
                Application submitted successfully
              </h2>
              <p
                style={{
                  fontSize: "var(--font-size-base)",
                  color: "var(--text-muted)",
                  maxWidth: "520px",
                  margin: "0 auto var(--space-8)",
                }}
              >
                Your profile has been delivered to <strong>{job?.company_name || "the hiring team"}</strong>.
                Boost your placement score by completing the required technical assessments and the AI
                interview.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "var(--space-4)",
                  textAlign: "left",
                  marginBottom: "var(--space-8)",
                }}
              >
                <div
                  style={{
                    padding: "var(--space-5)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--surface-raised)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
                    <IconAward size={18} color="var(--accent)" />
                    <strong style={{ fontSize: "var(--font-size-sm)" }}>Skill Assessments</strong>
                  </div>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
                    Demonstrate technical proficiency in role-relevant skills.
                  </p>
                  <Link to="/assessments">
                    <Button variant="secondary" size="sm">
                      Take Assessments
                    </Button>
                  </Link>
                </div>

                <div
                  style={{
                    padding: "var(--space-5)",
                    borderRadius: "var(--radius-lg)",
                    border: "1px solid var(--border-subtle)",
                    backgroundColor: "var(--surface-raised)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "var(--space-2)" }}>
                    <IconMic size={18} color="var(--accent)" />
                    <strong style={{ fontSize: "var(--font-size-sm)" }}>AI Voice Interview</strong>
                  </div>
                  <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", marginBottom: "var(--space-3)" }}>
                    Explain your project decisions and technical reasoning.
                  </p>
                  <Link to="/interview">
                    <Button variant="primary" size="sm">
                      Start Voice Interview
                    </Button>
                  </Link>
                </div>
              </div>

              <Link to="/dashboard">
                <Button variant="ghost" size="md">
                  View My Candidate Dashboard
                </Button>
              </Link>
            </CardBody>
          </Card>
        )}

        {/* Normal Application Form */}
        {!loadingJob && !submittedApplication && job && (
          <form onSubmit={handleSubmit} noValidate>
            {/* Job Summary Banner Card */}
            <Card style={{ marginBottom: "var(--space-6)" }}>
              <CardBody style={{ padding: "var(--space-6)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "var(--space-4)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  <div>
                    <h1
                      style={{
                        fontSize: "var(--font-size-2xl)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--text)",
                        letterSpacing: "var(--tracking-tight)",
                        marginBottom: "4px",
                      }}
                    >
                      {job.title}
                    </h1>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-muted)",
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
                  </div>

                  <Badge variant="accent" style={{ textTransform: "capitalize" }}>
                    {job.employment_type?.replace("_", " ") || "Full time"}
                  </Badge>
                </div>

                {job.skills && job.skills.length > 0 && (
                  <div style={{ marginTop: "var(--space-4)", paddingTop: "var(--space-4)", borderTop: "1px solid var(--border-subtle)" }}>
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-wide)",
                        display: "block",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      Required Verified Skills
                    </span>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-1)" }}>
                      {job.skills.map((s) => (
                        <Badge key={s.id || s.skill_id} variant="neutral">
                          {s.skill_name}
                          {s.minimum_score > 0 && (
                            <span style={{ marginLeft: "4px", color: "var(--text-faint)", fontFamily: "var(--font-mono)" }}>
                              (min {s.minimum_score}%)
                            </span>
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Application Details Card */}
            <Card style={{ marginBottom: "var(--space-6)" }}>
              <CardHeader>
                <div>
                  <CardTitle>Curriculum Vitae (CV)</CardTitle>
                  <CardDescription>
                    Your CV will be analyzed for skill claims and matched against role criteria.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                {/* Existing CV Toggle Option */}
                {existingCv && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-3)",
                      marginBottom: "var(--space-5)",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${useExistingCv ? "var(--accent)" : "var(--border)"}`,
                        backgroundColor: useExistingCv ? "var(--accent-subtle)" : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="cvSource"
                        checked={useExistingCv}
                        onChange={() => setUseExistingCv(true)}
                      />
                      <IconFileText size={18} color="var(--accent)" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                          Use current saved CV
                        </strong>
                        <span style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                          {existingCv.filename || "Uploaded CV document"}
                        </span>
                      </div>
                    </label>

                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${!useExistingCv ? "var(--accent)" : "var(--border)"}`,
                        backgroundColor: !useExistingCv ? "var(--accent-subtle)" : "var(--surface)",
                        cursor: "pointer",
                      }}
                    >
                      <input
                        type="radio"
                        name="cvSource"
                        checked={!useExistingCv}
                        onChange={() => setUseExistingCv(false)}
                      />
                      <IconUploadCloud size={18} color="var(--text-muted)" />
                      <div style={{ flex: 1 }}>
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                          Upload a different CV for this application
                        </strong>
                      </div>
                    </label>
                  </div>
                )}

                {/* Upload Zone (If no existing CV or upload selected) */}
                {(!existingCv || !useExistingCv) && (
                  <div>
                    <input
                      ref={fileInput}
                      type="file"
                      accept=".pdf,.docx,.doc"
                      style={{ display: "none" }}
                      onChange={onPickFile}
                    />

                    {file ? (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "var(--space-4)",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--surface-raised)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                          <IconFileText size={22} color="var(--accent)" />
                          <div>
                            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                              {file.name}
                            </strong>
                            <span style={{ display: "block", fontSize: "var(--font-size-xs)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                              {(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFile(null)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "var(--text-faint)",
                            cursor: "pointer",
                            padding: "4px",
                          }}
                          aria-label="Remove uploaded file"
                        >
                          <IconX size={18} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDragging(true);
                        }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={onDrop}
                        onClick={() => fileInput.current?.click()}
                        style={{
                          border: `2px dashed ${dragging ? "var(--accent)" : "var(--border)"}`,
                          borderRadius: "var(--radius-lg)",
                          backgroundColor: dragging ? "var(--accent-subtle)" : "var(--surface-raised)",
                          padding: "var(--space-8) var(--space-4)",
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all var(--duration-micro) var(--ease-enter)",
                        }}
                      >
                        <div
                          style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "var(--radius-md)",
                            backgroundColor: "var(--surface)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto var(--space-3)",
                            color: "var(--accent)",
                            boxShadow: "var(--shadow-xs)",
                          }}
                        >
                          <IconUploadCloud size={24} />
                        </div>
                        <h4 style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "4px" }}>
                          Drop your CV here, or click to browse
                        </h4>
                        <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                          Supported formats: PDF or Word (.pdf, .docx). Maximum size: 5MB.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Cover Letter Section */}
                <div style={{ marginTop: "var(--space-6)" }}>
                  <Textarea
                    label="Personal note or cover letter (Optional)"
                    id="coverLetter"
                    placeholder="Briefly describe your interest in this role and any relevant projects..."
                    value={coverLetter}
                    onChange={(e) => setCoverLetter(e.target.value)}
                    rows={4}
                  />
                </div>
              </CardBody>
              <CardFooter>
                <Link to="/jobs">
                  <Button variant="ghost" size="md">
                    Cancel
                  </Button>
                </Link>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  loading={submitting || uploadingCv}
                  icon={<IconArrowRight size={15} />}
                >
                  {uploadingCv ? "Uploading CV..." : "Submit Application"}
                </Button>
              </CardFooter>
            </Card>
          </form>
        )}
      </div>
    </AppShell>
  );
}

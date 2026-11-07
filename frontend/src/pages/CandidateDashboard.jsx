import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import cvApi from "../api/cv";
import skillsApi from "../api/skills";
import applicationsApi from "../api/applications";
import voiceInterviewsApi from "../api/voiceInterviews";
import usersApi from "../api/users";
import Card, { CardBody, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import StatTile from "../components/ui/StatTile";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import {
  IconFileText,
  IconUploadCloud,
  IconSparkles,
  IconAward,
  IconBriefcase,
  IconMic,
  IconCheckCircle,
  IconAlertCircle,
  IconPlus,
  IconExternalLink,
  IconTrash,
  IconArrowRight,
  IconRefreshCw,
  IconShield,
} from "../components/ui/Icons";

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
  const [addingSkill, setAddingSkill] = useState(false);

  const [applications, setApplications] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [isPublicProfile, setIsPublicProfile] = useState(false);
  const [savingVisibility, setSavingVisibility] = useState(false);

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

      // 2. Load candidate skills & available catalog
      const [mySkillsData, availableSkillsData] = await Promise.all([
        skillsApi.getMySkills().catch(() => []),
        skillsApi.getSkills().catch(() => []),
      ]);
      setCandidateSkills(mySkillsData || []);
      setAllSkills(availableSkillsData || []);

      // 3. Load applications
      const apps = await applicationsApi.getMyApplications().catch(() => ({ items: [] }));
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
      const formData = new FormData();
      formData.append("file", file);
      const newCv = await cvApi.uploadCv(formData);
      setActiveCv(newCv);
      setSuccessMsg("CV uploaded successfully.");
    } catch (err) {
      setError(err.message || "Failed to upload CV.");
    } finally {
      setUploadingCv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAnalyzeCv = async () => {
    if (!activeCv?.id) return;
    setAnalyzingCv(true);
    setError("");
    setSuccessMsg("");

    try {
      const analysis = await cvApi.analyzeCv(activeCv.id);
      setCvAnalysis(analysis);
      setSuccessMsg("CV analyzed with Gemini AI. Review extracted skills below.");
      // Reload skills in case new skills were extracted
      const mySkillsData = await skillsApi.getMySkills();
      setCandidateSkills(mySkillsData || []);
    } catch (err) {
      setError(err.message || "Failed to analyze CV.");
    } finally {
      setAnalyzingCv(false);
    }
  };

  const handleAddSkill = async () => {
    if (!selectedSkillToAdd) return;
    setAddingSkill(true);
    setError("");

    try {
      await skillsApi.addCandidateSkill({ skill_id: parseInt(selectedSkillToAdd, 10) });
      const updated = await skillsApi.getMySkills();
      setCandidateSkills(updated || []);
      setSelectedSkillToAdd("");
      setSuccessMsg("Skill added to profile. Take the assessment to verify it!");
    } catch (err) {
      setError(err.message || "Failed to add skill.");
    } finally {
      setAddingSkill(false);
    }
  };

  const handleTogglePublic = async () => {
    setSavingVisibility(true);
    setError("");
    const nextVal = !isPublicProfile;

    try {
      await usersApi.updateProfile({ is_public: nextVal });
      setIsPublicProfile(nextVal);
      setSuccessMsg(`Profile is now ${nextVal ? "publicly searchable by employers" : "private"}.`);
    } catch (err) {
      setError(err.message || "Failed to update profile visibility.");
    } finally {
      setSavingVisibility(false);
    }
  };

  // Metrics computation
  const verifiedSkillsCount = candidateSkills.filter((s) => s.is_verified).length;
  const verifiedScores = candidateSkills
    .filter((s) => s.is_verified && s.verified_score)
    .map((s) => s.verified_score);
  const avgScore =
    verifiedScores.length > 0
      ? Math.round(verifiedScores.reduce((a, b) => a + b, 0) / verifiedScores.length)
      : null;

  return (
    <AppShell>
      {/* Dashboard Top Header & Visibility Toggle */}
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
                color: "var(--text)",
                letterSpacing: "var(--tracking-tighter)",
                margin: 0,
              }}
            >
              Candidate Command Center
            </h1>
            <Badge variant="accent">Job Seeker</Badge>
          </div>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
            Welcome back, {user?.full_name || "Candidate"}. Manage your CV, verified technical scores,
            and employer matches.
          </p>
        </div>

        {/* Visibility Switch & Action Buttons */}
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
          <button
            type="button"
            onClick={handleTogglePublic}
            disabled={savingVisibility}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              backgroundColor: isPublicProfile ? "var(--color-success-bg)" : "var(--surface-sunken)",
              border: `1px solid ${isPublicProfile ? "var(--color-success-border)" : "var(--border)"}`,
              color: isPublicProfile ? "var(--color-success)" : "var(--text-muted)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              cursor: "pointer",
            }}
          >
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isPublicProfile ? "var(--color-success)" : "var(--text-faint)",
              }}
            />
            {isPublicProfile ? "Public to Employers" : "Private Profile"}
          </button>

          <Button
            variant="secondary"
            size="sm"
            icon={<IconRefreshCw size={14} />}
            onClick={loadAllData}
            loading={loading}
          >
            Sync
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <Alert variant="danger" title="Notice" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </Alert>
      )}
      {successMsg && (
        <Alert variant="success" onDismiss={() => setSuccessMsg("")} style={{ marginBottom: "var(--space-6)" }}>
          {successMsg}
        </Alert>
      )}

      {/* Stat Tiles Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <StatTile
          label="Verified Skills"
          value={loading ? "..." : `${verifiedSkillsCount}/${candidateSkills.length}`}
          icon={<IconAward size={20} />}
          subtext={
            verifiedSkillsCount > 0
              ? `${candidateSkills.length - verifiedSkillsCount} pending assessment`
              : "Take test to verify"
          }
        />
        <StatTile
          label="Average Score"
          value={loading ? "..." : avgScore ? `${avgScore}%` : "—"}
          icon={<IconShield size={20} />}
          trend={avgScore && avgScore >= 75 ? "Top 15%" : null}
          trendType={avgScore && avgScore >= 75 ? "positive" : "neutral"}
          subtext="Objective technical marks"
        />
        <StatTile
          label="Active Applications"
          value={loading ? "..." : applications.length}
          icon={<IconBriefcase size={20} />}
          subtext={
            applications.length > 0 ? "Under employer review" : "Explore open jobs"
          }
        />
        <StatTile
          label="AI Voice Interviews"
          value={loading ? "..." : interviews.length}
          icon={<IconMic size={20} />}
          subtext="Verifiable audio evaluations"
        />
      </div>

      {/* Main Grid: 2-Column Layout */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: "var(--space-6)",
        }}
      >
        {/* Row 1: CV Management & Analysis Card */}
        <Card>
          <CardHeader>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <span
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-sm)",
                  backgroundColor: "var(--accent-subtle)",
                  color: "var(--accent)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconFileText size={18} />
              </span>
              <div>
                <CardTitle>Curriculum Vitae & Parsing</CardTitle>
                <CardDescription>
                  Upload your CV to extract skill claims and automatically match against open roles.
                </CardDescription>
              </div>
            </div>

            <div style={{ display: "flex", gap: "var(--space-2)" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: "none" }}
                onChange={handleCvUpload}
              />
              <Button
                variant="secondary"
                size="sm"
                icon={<IconUploadCloud size={14} />}
                onClick={() => fileInputRef.current?.click()}
                loading={uploadingCv}
              >
                {activeCv ? "Replace CV" : "Upload CV"}
              </Button>
            </div>
          </CardHeader>

          <CardBody style={{ padding: "var(--space-6)" }}>
            {activeCv ? (
              <div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "var(--space-4)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--surface-raised)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: "var(--space-4)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                    <IconFileText size={24} color="var(--accent)" />
                    <div>
                      <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                        {activeCv.filename || "Curriculum_Vitae.pdf"}
                      </strong>
                      <span
                        style={{
                          display: "block",
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-muted)",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        Uploaded on{" "}
                        {activeCv.created_at
                          ? new Date(activeCv.created_at).toLocaleDateString()
                          : "Recently"}
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    icon={<IconSparkles size={14} />}
                    onClick={handleAnalyzeCv}
                    loading={analyzingCv}
                  >
                    {cvAnalysis ? "Re-analyze with AI" : "Analyze CV with AI"}
                  </Button>
                </div>

                {/* CV Analysis Output if present */}
                {cvAnalysis && (
                  <div
                    style={{
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--accent-subtle)",
                      border: "1px solid var(--accent-subtle-border)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "var(--font-size-xs)",
                        fontWeight: "var(--font-weight-semibold)",
                        color: "var(--accent)",
                        marginBottom: "var(--space-2)",
                        textTransform: "uppercase",
                        letterSpacing: "var(--tracking-wide)",
                      }}
                    >
                      <IconSparkles size={14} /> AI Analysis Summary
                    </div>
                    {cvAnalysis.summary && (
                      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text)", marginBottom: "var(--space-3)" }}>
                        {cvAnalysis.summary}
                      </p>
                    )}
                    {cvAnalysis.extracted_skills && cvAnalysis.extracted_skills.length > 0 && (
                      <div>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block", marginBottom: "4px" }}>
                          Identified Competencies:
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                          {cvAnalysis.extracted_skills.map((s, idx) => (
                            <Badge key={idx} variant="accent">
                              {typeof s === "string" ? s : s.name}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<IconUploadCloud size={24} />}
                title="No CV uploaded yet"
                description="Upload your PDF or Word document to unlock verified assessments and AI job matching."
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<IconUploadCloud size={14} />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload CV Now
                  </Button>
                }
              />
            )}
          </CardBody>
        </Card>

        {/* Row 2: Candidate Skills & Technical Verification */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Skills Verification Matrix</CardTitle>
              <CardDescription>
                Take standardized technical assessments to verify your skills with tamper-proof scores.
              </CardDescription>
            </div>

            {/* Quick add skill control */}
            <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
              <select
                className="tb-select"
                style={{ height: "32px", fontSize: "var(--font-size-xs)", padding: "0 var(--space-6) 0 var(--space-2)" }}
                value={selectedSkillToAdd}
                onChange={(e) => setSelectedSkillToAdd(e.target.value)}
              >
                <option value="">Select skill to add...</option>
                {allSkills
                  .filter((as) => !candidateSkills.some((cs) => cs.skill_id === as.id || cs.id === as.id))
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category || "General"})
                    </option>
                  ))}
              </select>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconPlus size={14} />}
                onClick={handleAddSkill}
                disabled={!selectedSkillToAdd}
                loading={addingSkill}
              >
                Add
              </Button>
            </div>
          </CardHeader>

          <CardBody style={{ padding: 0 }}>
            {candidateSkills.length === 0 ? (
              <div style={{ padding: "var(--space-6)" }}>
                <EmptyState
                  icon={<IconAward size={24} />}
                  title="No skills added yet"
                  description="Add technologies you work with from the catalog above to begin technical verification."
                />
              </div>
            ) : (
              <div className="tb-table-container" style={{ border: "none", borderRadius: 0 }}>
                <table className="tb-table">
                  <thead>
                    <tr>
                      <th>Skill / Technology</th>
                      <th>Category</th>
                      <th>Status</th>
                      <th className="num-col">Score</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidateSkills.map((sk) => {
                      const skillName = sk.skill_name || sk.name || "Skill";
                      const isVerified = !!sk.is_verified;
                      const score = sk.verified_score;

                      return (
                        <tr key={sk.id || sk.skill_id}>
                          <td>
                            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                              {skillName}
                            </strong>
                          </td>
                          <td style={{ color: "var(--text-muted)", fontSize: "var(--font-size-xs)" }}>
                            {sk.category || "Development"}
                          </td>
                          <td>
                            {isVerified ? (
                              <Badge variant="success" dot>
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="warning" dot>
                                Unverified
                              </Badge>
                            )}
                          </td>
                          <td className="num-col">
                            {score ? (
                              <span style={{ fontWeight: "var(--font-weight-semibold)", color: "var(--accent)" }}>
                                {score}%
                              </span>
                            ) : (
                              <span style={{ color: "var(--text-faint)" }}>—</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Button
                              variant={isVerified ? "ghost" : "primary"}
                              size="sm"
                              onClick={() => navigate(`/assessments/${sk.skill_id || sk.id}`)}
                            >
                              {isVerified ? "Retake" : "Take Assessment"}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardBody>
        </Card>

        {/* Row 3: Two Sub-Cards (Applications & Voice Interviews) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
            gap: "var(--space-6)",
          }}
        >
          {/* Applications Tracking Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Job Applications</CardTitle>
                <CardDescription>Track status and employer match scores.</CardDescription>
              </div>
              <Link to="/jobs">
                <Button variant="ghost" size="sm" icon={<IconExternalLink size={13} />}>
                  Browse Jobs
                </Button>
              </Link>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {applications.length === 0 ? (
                <div style={{ padding: "var(--space-6)" }}>
                  <EmptyState
                    icon={<IconBriefcase size={22} />}
                    title="No active applications"
                    description="You haven't submitted any job applications yet."
                    action={
                      <Link to="/jobs">
                        <Button variant="secondary" size="sm">
                          Explore Open Roles
                        </Button>
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {applications.map((app) => (
                    <div
                      key={app.id}
                      style={{
                        padding: "var(--space-4) var(--space-6)",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-3)",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)", display: "block" }}>
                          {app.job_title || "Software Engineering Role"}
                        </strong>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                          {app.company_name || "Employer"} &bull;{" "}
                          {app.created_at ? new Date(app.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        {app.fit_score && (
                          <span
                            style={{
                              fontSize: "var(--font-size-xs)",
                              fontFamily: "var(--font-mono)",
                              color: "var(--accent)",
                              fontWeight: "var(--font-weight-semibold)",
                            }}
                          >
                            Fit {app.fit_score}%
                          </span>
                        )}
                        <Badge
                          variant={
                            app.status === "shortlisted"
                              ? "success"
                              : app.status === "rejected"
                              ? "danger"
                              : "neutral"
                          }
                          style={{ textTransform: "capitalize" }}
                        >
                          {app.status || "Submitted"}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>

          {/* AI Voice Interviews Card */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>AI Voice Interviews</CardTitle>
                <CardDescription>Conversational technical reasoning evaluations.</CardDescription>
              </div>
              <Link to="/interview">
                <Button variant="primary" size="sm" icon={<IconMic size={14} />}>
                  Start Interview
                </Button>
              </Link>
            </CardHeader>
            <CardBody style={{ padding: 0 }}>
              {interviews.length === 0 ? (
                <div style={{ padding: "var(--space-6)" }}>
                  <EmptyState
                    icon={<IconMic size={22} />}
                    title="No interviews completed yet"
                    description="Take an interactive conversational AI interview to showcase your design choices and reasoning."
                    action={
                      <Link to="/interview">
                        <Button variant="secondary" size="sm">
                          Begin AI Voice Session
                        </Button>
                      </Link>
                    }
                  />
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {interviews.map((iv) => (
                    <div
                      key={iv.id}
                      style={{
                        padding: "var(--space-4) var(--space-6)",
                        borderBottom: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "var(--space-3)",
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)", display: "block" }}>
                          Interview #{iv.id}
                        </strong>
                        <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                          {iv.created_at ? new Date(iv.created_at).toLocaleDateString() : "Recent"}
                        </span>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                        <Badge
                          variant={
                            iv.status === "completed"
                              ? "success"
                              : iv.status === "in_progress"
                              ? "accent"
                              : "warning"
                          }
                        >
                          {iv.status?.replace("_", " ") || "Pending"}
                        </Badge>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            navigate(iv.status === "completed" ? "/interview/results" : `/interview/${iv.id}`)
                          }
                        >
                          {iv.status === "completed" ? "Results" : "Continue"}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

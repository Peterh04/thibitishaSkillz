import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import jobsApi from "../api/jobs";
import skillsApi from "../api/skills";
import employersApi from "../api/employers";
import Card, { CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import {
  IconArrowLeft,
  IconPlus,
  IconTrash,
  IconBriefcase,
  IconAward,
  IconBuilding,
} from "../components/ui/Icons";

export default function NewJobPage() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    description: "",
    responsibilities: "",
    qualifications: "",
    location: "Nairobi, Kenya",
    employment_type: "full_time",
    experience_level: "mid",
    application_deadline: "",
    status: "published",
  });

  const [employerProfile, setEmployerProfile] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("");

  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]);
  const [currentSkillId, setCurrentSkillId] = useState("");
  const [currentMinScore, setCurrentMinScore] = useState(60);
  const [currentWeight, setCurrentWeight] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [skillsData, profData] = await Promise.all([
          skillsApi.getSkills().catch(() => []),
          employersApi.getProfile().catch(() => null),
        ]);
        setAvailableSkills(skillsData || []);
        setEmployerProfile(profData);
        if (profData?.company_name) {
          setCompanyName(profData.company_name);
          setIndustry(profData.industry || "");
        }
      } catch (err) {
        console.warn("Failed to load skills or employer profile:", err.message);
      }
    }
    init();
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleAddSkill = () => {
    if (!currentSkillId) return;
    const skillObj = availableSkills.find((s) => s.id === parseInt(currentSkillId, 10));
    if (!skillObj) return;

    if (selectedSkills.some((s) => s.skill_id === skillObj.id)) {
      setError("This skill has already been added to the requirements.");
      return;
    }

    setSelectedSkills([
      ...selectedSkills,
      {
        skill_id: skillObj.id,
        skill_name: skillObj.name,
        minimum_score: parseInt(currentMinScore, 10) || 60,
        importance_weight: parseInt(currentWeight, 10) || 1,
      },
    ]);
    setCurrentSkillId("");
    setError("");
  };

  const handleRemoveSkill = (skillId) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skillId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Please specify a position title.");
      return;
    }
    if (!form.description.trim()) {
      setError("Please provide a description of the role.");
      return;
    }

    // Check if company name is set
    const finalCompanyName = companyName.trim() || employerProfile?.company_name;
    if (!finalCompanyName && form.status === "published") {
      setError("Please specify your company or organization name before publishing.");
      return;
    }

    // Check required skill for publishing
    if (form.status === "published" && selectedSkills.length === 0) {
      setError(
        "Before publishing, please add at least one required skill using the 'Add Requirement' button below. Alternatively, you can select 'Save as Draft'."
      );
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      // 1. If employer profile doesn't have company_name yet, save it
      if (!employerProfile?.company_name && finalCompanyName) {
        await employersApi.updateProfile({
          company_name: finalCompanyName,
          industry: industry.trim() || undefined,
        });
      }

      // 2. Prepare payload
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        responsibilities: form.responsibilities.trim() || undefined,
        qualifications: form.qualifications.trim() || undefined,
        location: form.location.trim() || undefined,
        employment_type: form.employment_type,
        experience_level: form.experience_level,
        application_deadline: form.application_deadline ? new Date(form.application_deadline).toISOString() : undefined,
        status: form.status,
        skills: selectedSkills.map((s) => ({
          skill_id: s.skill_id,
          minimum_score: s.minimum_score,
          importance_weight: s.importance_weight,
        })),
      };

      const createdJob = await jobsApi.createJob(payload);

      // 3. Fallback: ensure skills are linked
      if (selectedSkills.length > 0 && (!createdJob.skills || createdJob.skills.length === 0)) {
        await jobsApi.addJobSkills(createdJob.id, {
          skills: selectedSkills.map((s) => ({
            skill_id: s.skill_id,
            minimum_score: s.minimum_score,
            importance_weight: s.importance_weight,
          })),
        });

        if (form.status === "published") {
          await jobsApi.updateJob(createdJob.id, { status: "published" });
        }
      }

      navigate("/recruiter/jobs");
    } catch (err) {
      setError(err.message || "Failed to create job requisition.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Navigation back */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <Link
            to="/recruiter/jobs"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "var(--font-size-sm)",
              color: "var(--text-muted)",
              fontWeight: "var(--font-weight-medium)",
            }}
          >
            <IconArrowLeft size={16} /> Back to Job Postings
          </Link>
        </div>

        {/* Title */}
        <div style={{ marginBottom: "var(--space-6)" }}>
          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--tracking-tighter)",
              color: "var(--text)",
              marginBottom: "var(--space-2)",
            }}
          >
            Create New Requisition
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
            Post a verified technical role with explicit skill score thresholds for candidate matching.
          </p>
        </div>

        {error && (
          <Alert variant="danger" title="Notice" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-6)" }}>
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Section 0: Company Info if profile missing company_name */}
          {(!employerProfile || !employerProfile.company_name) && (
            <Card style={{ marginBottom: "var(--space-6)", borderLeft: "3px solid var(--accent)" }}>
              <CardHeader>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                  <IconBuilding size={18} color="var(--accent)" />
                  <div>
                    <CardTitle>Hiring Organization Details</CardTitle>
                    <CardDescription>
                      Your employer profile requires a registered company name before jobs can be published.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <Input
                    label="Company / Organization Name"
                    id="companyName"
                    name="companyName"
                    required
                    placeholder="e.g. Acme Corporation"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                  <Input
                    label="Industry / Domain"
                    id="industry"
                    name="industry"
                    placeholder="e.g. Fintech, Healthcare, Cloud"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                  />
                </div>
              </CardBody>
            </Card>
          )}

          {/* Section 1: Role Overview */}
          <Card style={{ marginBottom: "var(--space-6)" }}>
            <CardHeader>
              <CardTitle>Role Details</CardTitle>
            </CardHeader>
            <CardBody style={{ padding: "var(--space-6)" }}>
              <Input
                label="Position Title"
                id="title"
                name="title"
                required
                placeholder="e.g. Senior Backend Engineer (Python / FastAPI)"
                value={form.title}
                onChange={onChange}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                <Input
                  label="Location"
                  id="location"
                  name="location"
                  placeholder="e.g. Nairobi, Kenya or Remote"
                  value={form.location}
                  onChange={onChange}
                />

                <Select
                  label="Employment Type"
                  id="employment_type"
                  name="employment_type"
                  value={form.employment_type}
                  onChange={onChange}
                >
                  <option value="full_time">Full Time</option>
                  <option value="part_time">Part Time</option>
                  <option value="contract">Contract</option>
                  <option value="internship">Internship</option>
                </Select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--space-4)" }}>
                <Select
                  label="Seniority Level"
                  id="experience_level"
                  name="experience_level"
                  value={form.experience_level}
                  onChange={onChange}
                >
                  <option value="entry">Entry Level / Junior</option>
                  <option value="mid">Mid Level</option>
                  <option value="senior">Senior Engineer</option>
                  <option value="lead">Tech Lead / Principal</option>
                </Select>

                <Select
                  label="Publication Status"
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={onChange}
                >
                  <option value="published">Publish Immediately</option>
                  <option value="draft">Save as Draft</option>
                </Select>

                <Input
                  label="Application Deadline"
                  id="application_deadline"
                  name="application_deadline"
                  type="date"
                  value={form.application_deadline}
                  onChange={onChange}
                />
              </div>

              <Textarea
                label="Role Description"
                id="description"
                name="description"
                required
                rows={4}
                placeholder="Overview of the engineering team, tech stack, and primary mission..."
                value={form.description}
                onChange={onChange}
              />

              <Textarea
                label="Key Responsibilities"
                id="responsibilities"
                name="responsibilities"
                rows={3}
                placeholder="Core day-to-day expectations and engineering deliverables..."
                value={form.responsibilities}
                onChange={onChange}
              />

              <Textarea
                label="Qualifications & Architecture Background"
                id="qualifications"
                name="qualifications"
                rows={3}
                placeholder="Required technical background, distributed systems experience, etc..."
                value={form.qualifications}
                onChange={onChange}
              />
            </CardBody>
          </Card>

          {/* Section 2: Required Verified Skills */}
          <Card style={{ marginBottom: "var(--space-6)" }}>
            <CardHeader>
              <div>
                <CardTitle>Required Verified Skills & Thresholds</CardTitle>
                <CardDescription>
                  Candidates who meet or exceed these scores will be automatically ranked at the top of your applicant list.
                </CardDescription>
              </div>
            </CardHeader>
            <CardBody style={{ padding: "var(--space-6)" }}>
              {/* Add Skill Row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: "var(--space-3)",
                  alignItems: "flex-end",
                  padding: "var(--space-4)",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--surface-raised)",
                  marginBottom: "var(--space-4)",
                }}
              >
                <div>
                  <label className="tb-label" style={{ marginBottom: "var(--space-1)" }}>
                    Technical Skill
                  </label>
                  <select
                    className="tb-select"
                    value={currentSkillId}
                    onChange={(e) => setCurrentSkillId(e.target.value)}
                  >
                    <option value="">Select skill...</option>
                    {availableSkills
                      .filter((as) => !selectedSkills.some((s) => s.skill_id === as.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.category})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="tb-label" style={{ marginBottom: "var(--space-1)" }}>
                    Min Score (%)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    step={5}
                    className="tb-input"
                    value={currentMinScore}
                    onChange={(e) => setCurrentMinScore(e.target.value)}
                  />
                </div>

                <div>
                  <label className="tb-label" style={{ marginBottom: "var(--space-1)" }}>
                    Weight
                  </label>
                  <select
                    className="tb-select"
                    value={currentWeight}
                    onChange={(e) => setCurrentWeight(e.target.value)}
                  >
                    <option value="1">1 (Standard)</option>
                    <option value="2">2 (High)</option>
                    <option value="3">3 (Critical)</option>
                  </select>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  icon={<IconPlus size={15} />}
                  onClick={handleAddSkill}
                  disabled={!currentSkillId}
                >
                  Add Requirement
                </Button>
              </div>

              {/* Selected Skills List */}
              {selectedSkills.length === 0 ? (
                <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)", margin: 0, fontStyle: "italic" }}>
                  No skills attached yet. Click 'Add Requirement' above to attach at least one skill before publishing.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
                  {selectedSkills.map((s) => (
                    <div
                      key={s.skill_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--space-3) var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--surface)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                        <IconAward size={16} color="var(--accent)" />
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                          {s.skill_name}
                        </strong>
                        <Badge variant="accent">Min Score: {s.minimum_score}%</Badge>
                        <Badge variant="neutral">Weight: &times;{s.importance_weight}</Badge>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(s.skill_id)}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--color-danger)",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        aria-label="Remove skill requirement"
                      >
                        <IconTrash size={15} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
            <CardFooter>
              <Link to="/recruiter/jobs">
                <Button variant="ghost" size="md">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="md" loading={submitting}>
                {form.status === "published" ? "Publish Requisition" : "Save Draft"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AppShell>
  );
}

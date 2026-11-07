import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import jobsApi from "../api/jobs";
import skillsApi from "../api/skills";
import employersApi from "../api/employers";
import "../styles/jobs.css";

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

  const [availableSkills, setAvailableSkills] = useState([]);
  const [selectedSkills, setSelectedSkills] = useState([]); // [{ skill_id, skill_name, minimum_score, importance_weight }]
  const [currentSkillId, setCurrentSkillId] = useState("");
  const [currentMinScore, setCurrentMinScore] = useState(60);
  const [currentWeight, setCurrentWeight] = useState(1);

  const [employerProfile, setEmployerProfile] = useState(null);
  const [companyName, setCompanyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const [skillsData, profData] = await Promise.all([
          skillsApi.getSkills(),
          employersApi.getProfile().catch(() => null),
        ]);
        setAvailableSkills(skillsData || []);
        setEmployerProfile(profData);
        if (profData?.company_name) {
          setCompanyName(profData.company_name);
        }
      } catch (err) {
        console.warn("Failed to load initial skills or profile:", err.message);
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
      setError("This skill is already added.");
      return;
    }

    setSelectedSkills([
      ...selectedSkills,
      {
        skill_id: skillObj.id,
        skill_name: skillObj.name,
        minimum_score: parseInt(currentMinScore, 10) || 50,
        importance_weight: parseInt(currentWeight, 10) || 1,
      },
    ]);
    setCurrentSkillId("");
    setError("");
  };

  const handleRemoveSkill = (skillId) => {
    setSelectedSkills(selectedSkills.filter((s) => s.skill_id !== skillId));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Please enter a job title.");
      return;
    }
    if (!form.description.trim()) {
      setError("Please enter a job description.");
      return;
    }
    if (selectedSkills.length === 0) {
      setError("Please add at least one required skill for automated verification matching.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      // 1. Ensure employer company name exists
      if (!employerProfile?.company_name && companyName.trim()) {
        await employersApi.updateProfile({ company_name: companyName.trim() });
      }

      // 2. Format deadline if provided
      let deadlineIso = undefined;
      if (form.application_deadline) {
        const d = new Date(form.application_deadline);
        deadlineIso = d.toISOString();
      } else {
        // Default deadline: 30 days in future
        const d = new Date();
        d.setDate(d.getDate() + 30);
        deadlineIso = d.toISOString();
      }

      // 3. Create job
      const jobData = {
        title: form.title.trim(),
        description: form.description.trim(),
        responsibilities: form.responsibilities.trim() || undefined,
        qualifications: form.qualifications.trim() || undefined,
        location: form.location.trim() || undefined,
        employment_type: form.employment_type,
        experience_level: form.experience_level,
        application_deadline: deadlineIso,
        status: "draft", // create as draft first so skills can be attached before publishing
      };

      const createdJob = await jobsApi.createJob(jobData);

      // 4. Attach skills
      const skillsPayload = {
        skills: selectedSkills.map((s) => ({
          skill_id: s.skill_id,
          minimum_score: s.minimum_score,
          importance_weight: s.importance_weight,
        })),
      };
      await jobsApi.addJobSkills(createdJob.id, skillsPayload);

      // 5. Publish if requested
      if (form.status === "published") {
        await jobsApi.updateJob(createdJob.id, { status: "published" });
      }

      navigate("/recruiter/jobs");
    } catch (err) {
      setError(err.message || "Failed to create job posting.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="ph-jobs">
      <Navbar />

      <main className="ph-jobs__main" style={{ maxWidth: "840px" }}>
        <div style={{ marginBottom: "28px" }}>
          <Link to="/recruiter/jobs" style={{ fontSize: "14px", color: "#1a5fa6", textDecoration: "none" }}>
            ← Back to posted jobs
          </Link>
          <h1 className="ph-jobs__title" style={{ marginTop: "12px" }}>Post a New Job</h1>
          <p className="ph-jobs__desc">
            Define requirements and verified skills. Candidates will be ranked automatically by demonstrated ability.
          </p>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} style={{ background: "#fff", padding: "32px", borderRadius: "12px", border: "1px solid #e8e8e6" }}>
          {/* Company Name if missing */}
          {!employerProfile?.company_name && (
            <div style={{ marginBottom: "20px", background: "#f8f9fa", padding: "16px", borderRadius: "8px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
                Company Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Safaricom, Acme Health, KCB"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d4d4d4", boxSizing: "border-box" }}
              />
            </div>
          )}

          {/* Job Title */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
              Job Title *
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g. Senior Full-Stack Engineer"
              value={form.title}
              onChange={onChange}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d4d4d4", fontSize: "15px", boxSizing: "border-box" }}
            />
          </div>

          {/* Description */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "14px", fontWeight: "600", marginBottom: "6px" }}>
              About the Role / Overview *
            </label>
            <textarea
              name="description"
              rows={4}
              placeholder="Describe what the team does and what success looks like in this position..."
              value={form.description}
              onChange={onChange}
              required
              style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d4d4d4", fontSize: "14px", boxSizing: "border-box", resize: "vertical" }}
            />
          </div>

          {/* Grid: Location, Employment Type, Experience Level */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Location
              </label>
              <input
                type="text"
                name="location"
                placeholder="e.g. Nairobi, Kenya or Remote"
                value={form.location}
                onChange={onChange}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Employment Type
              </label>
              <select
                name="employment_type"
                value={form.employment_type}
                onChange={onChange}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", boxSizing: "border-box" }}
              >
                <option value="full_time">Full Time</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract</option>
                <option value="remote">Remote</option>
                <option value="internship">Internship</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Experience Level
              </label>
              <select
                name="experience_level"
                value={form.experience_level}
                onChange={onChange}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", boxSizing: "border-box" }}
              >
                <option value="entry">Entry Level</option>
                <option value="mid">Mid Level</option>
                <option value="senior">Senior</option>
                <option value="lead">Lead / Architect</option>
              </select>
            </div>
          </div>

          {/* Responsibilities & Qualifications */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Key Responsibilities (optional)
              </label>
              <textarea
                name="responsibilities"
                rows={3}
                placeholder="• Build and maintain APIs&#10;• Collaborate with product teams"
                value={form.responsibilities}
                onChange={onChange}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px" }}>
                Qualifications (optional)
              </label>
              <textarea
                name="qualifications"
                rows={3}
                placeholder="• Degree or equivalent portfolio&#10;• Experience with microservices"
                value={form.qualifications}
                onChange={onChange}
                style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", fontSize: "13px", boxSizing: "border-box" }}
              />
            </div>
          </div>

          {/* Required Skills Section */}
          <div style={{ borderTop: "1px solid #e8e8e6", paddingTop: "24px", marginBottom: "28px" }}>
            <h3 style={{ fontSize: "16px", fontWeight: "600", margin: "0 0 4px" }}>
              Required Technical Skills & Verification Criteria *
            </h3>
            <p style={{ fontSize: "13px", color: "#666", margin: "0 0 16px" }}>
              Thibitisha Skills uses these skills to automatically score, rank, and match candidate applications.
            </p>

            {/* Add skill row */}
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap", marginBottom: "16px", background: "#f8f9fa", padding: "14px", borderRadius: "8px" }}>
              <div style={{ flex: 2, minWidth: "200px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Skill</label>
                <select
                  value={currentSkillId}
                  onChange={(e) => setCurrentSkillId(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d4d4d4" }}
                >
                  <option value="">Select skill...</option>
                  {availableSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.category})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ flex: 1, minWidth: "120px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Min Passing %</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentMinScore}
                  onChange={(e) => setCurrentMinScore(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d4d4d4", boxSizing: "border-box" }}
                />
              </div>

              <div style={{ flex: 1, minWidth: "100px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px" }}>Weight (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={currentWeight}
                  onChange={(e) => setCurrentWeight(e.target.value)}
                  style={{ width: "100%", padding: "8px 10px", borderRadius: "6px", border: "1px solid #d4d4d4", boxSizing: "border-box" }}
                />
              </div>

              <button
                type="button"
                onClick={handleAddSkill}
                disabled={!currentSkillId}
                style={{
                  padding: "9px 18px",
                  background: "#1a5fa6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: "500",
                }}
              >
                + Add Skill
              </button>
            </div>

            {/* Selected skills list */}
            {selectedSkills.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedSkills.map((s) => (
                  <div
                    key={s.skill_id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 14px",
                      background: "#fff",
                      border: "1px solid #e8e8e6",
                      borderRadius: "6px",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: "14px" }}>{s.skill_name}</strong>
                      <span style={{ fontSize: "12px", color: "#666", marginLeft: "12px" }}>
                        Minimum score: {s.minimum_score}% · Importance weight: {s.importance_weight}x
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(s.skill_id)}
                      style={{ background: "none", border: "none", color: "#b42318", cursor: "pointer", fontSize: "13px" }}
                    >
                      ✕ Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontSize: "13px", color: "#888", fontStyle: "italic", margin: 0 }}>
                No skills added yet. Add at least one skill above.
              </p>
            )}
          </div>

          {/* Publishing Option */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #e8e8e6", paddingTop: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={form.status === "published"}
                onChange={(e) => setForm({ ...form, status: e.target.checked ? "published" : "draft" })}
              />
              Publish immediately (visible to candidates on Open Jobs page)
            </label>

            <div style={{ display: "flex", gap: "12px" }}>
              <Link
                to="/recruiter/jobs"
                style={{
                  padding: "10px 18px",
                  background: "#fff",
                  border: "1px solid #d4d4d4",
                  borderRadius: "6px",
                  color: "#555",
                  textDecoration: "none",
                  fontSize: "14px",
                }}
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: "10px 24px",
                  background: "#1a5fa6",
                  color: "#fff",
                  border: "none",
                  borderRadius: "6px",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                {submitting ? "Posting Job..." : form.status === "published" ? "Publish Job" : "Save as Draft"}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}


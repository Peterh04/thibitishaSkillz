import { useEffect, useRef, useState } from "react";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import usersApi from "../api/users";
import cvApi from "../api/cv";
import applicationsApi from "../api/applications";
import Card, { CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import Textarea from "../components/ui/Textarea";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import Skeleton from "../components/ui/Skeleton";
import {
  IconUser,
  IconFileText,
  IconUploadCloud,
  IconCheck,
  IconShield,
  IconBriefcase,
  IconExternalLink,
} from "../components/ui/Icons";

export default function CandidateProfile() {
  const { user, fetchCurrentUser } = useAuth();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phoneNumber: "",
    location: "",
    bio: "",
    githubUrl: "",
    portfolioUrl: "",
  });

  const [cv, setCv] = useState(null);
  const [applications, setApplications] = useState([]);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");
      try {
        const [meData, cvData, appsData] = await Promise.all([
          usersApi.getMyAccount().catch(() => null),
          cvApi.getMyCv().catch(() => null),
          applicationsApi.getMyApplications().catch(() => ({ items: [] })),
        ]);

        if (meData) {
          setForm({
            fullName: meData.full_name || user?.full_name || "",
            email: meData.email || user?.email || "",
            phoneNumber: meData.phone_number || "",
            location: meData.location || "",
            bio: meData.bio || "",
            githubUrl: meData.candidate_profile?.github_url || "",
            portfolioUrl: meData.candidate_profile?.portfolio_url || "",
          });
        }
        setCv(cvData);
        setApplications(appsData.items || []);
      } catch (err) {
        setError(err.message || "Failed to load profile details.");
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [user]);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const onSave = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      setError("Please provide your full name.");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await usersApi.updateMyAccount({
        full_name: form.fullName.trim(),
        phone_number: form.phoneNumber.trim() || undefined,
        location: form.location.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });

      if (form.githubUrl || form.portfolioUrl) {
        await usersApi.updateCandidateProfile({
          github_url: form.githubUrl.trim() || undefined,
          portfolio_url: form.portfolioUrl.trim() || undefined,
        });
      }

      await fetchCurrentUser?.();
      setSuccess("Profile settings saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCv(true);
    setError("");
    setSuccess("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      const newCv = await cvApi.uploadCv(formData);
      setCv(newCv);
      setSuccess("CV updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to upload new CV.");
    } finally {
      setUploadingCv(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <AppShell>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        {/* Page Title */}
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
            Candidate Profile & Account
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
            Keep your contact details, portfolio links, and resume up to date for hiring employers.
          </p>
        </div>

        {error && (
          <Alert variant="danger" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-5)" }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert variant="success" onDismiss={() => setSuccess("")} style={{ marginBottom: "var(--space-5)" }}>
            {success}
          </Alert>
        )}

        {loading ? (
          <Card>
            <CardBody style={{ padding: "var(--space-8)" }}>
              <Skeleton height="32px" width="40%" style={{ marginBottom: "var(--space-4)" }} />
              <Skeleton height="40px" width="100%" style={{ marginBottom: "var(--space-4)" }} />
              <Skeleton height="40px" width="100%" />
            </CardBody>
          </Card>
        ) : (
          <form onSubmit={onSave} noValidate>
            {/* Personal Details Card */}
            <Card style={{ marginBottom: "var(--space-6)" }}>
              <CardHeader>
                <div>
                  <CardTitle>Personal Information</CardTitle>
                  <CardDescription>Your name and primary contact coordinates.</CardDescription>
                </div>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <Input
                    label="Full name"
                    id="fullName"
                    name="fullName"
                    required
                    value={form.fullName}
                    onChange={onChange}
                  />
                  <Input
                    label="Email address"
                    id="email"
                    name="email"
                    type="email"
                    disabled
                    value={form.email}
                    helper="Email cannot be changed"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <Input
                    label="Phone number"
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="+254 700 000 000"
                    value={form.phoneNumber}
                    onChange={onChange}
                  />
                  <Input
                    label="Location"
                    id="location"
                    name="location"
                    placeholder="Nairobi, Kenya"
                    value={form.location}
                    onChange={onChange}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-4)" }}>
                  <Input
                    label="GitHub profile URL"
                    id="githubUrl"
                    name="githubUrl"
                    placeholder="https://github.com/username"
                    value={form.githubUrl}
                    onChange={onChange}
                  />
                  <Input
                    label="Portfolio or website"
                    id="portfolioUrl"
                    name="portfolioUrl"
                    placeholder="https://mywork.dev"
                    value={form.portfolioUrl}
                    onChange={onChange}
                  />
                </div>

                <Textarea
                  label="Bio / Technical Summary"
                  id="bio"
                  name="bio"
                  rows={3}
                  placeholder="Brief summary of your technical background, domain focus, and key interests..."
                  value={form.bio}
                  onChange={onChange}
                />
              </CardBody>
              <CardFooter>
                <Button type="submit" variant="primary" size="md" loading={saving}>
                  Save Profile Changes
                </Button>
              </CardFooter>
            </Card>

            {/* Active CV Document Card */}
            <Card style={{ marginBottom: "var(--space-6)" }}>
              <CardHeader>
                <div>
                  <CardTitle>Curriculum Vitae</CardTitle>
                  <CardDescription>The active document sent to employers when applying.</CardDescription>
                </div>
                <div>
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
                    Upload New Version
                  </Button>
                </div>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                {cv ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--space-4)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--surface-raised)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                      <IconFileText size={24} color="var(--accent)" />
                      <div>
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                          {cv.filename || "Uploaded_CV.pdf"}
                        </strong>
                        <span
                          style={{
                            display: "block",
                            fontSize: "var(--font-size-xs)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                          }}
                        >
                          Uploaded {cv.created_at ? new Date(cv.created_at).toLocaleDateString() : "Recently"}
                        </span>
                      </div>
                    </div>
                    <Badge variant="success">Active</Badge>
                  </div>
                ) : (
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)" }}>
                    No CV uploaded. Upload your CV to enable AI parsing and 1-click job applications.
                  </p>
                )}
              </CardBody>
            </Card>
          </form>
        )}
      </div>
    </AppShell>
  );
}

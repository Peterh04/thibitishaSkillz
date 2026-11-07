import { useRef, useState } from "react";
import "../styles/candidate-profile.css";

// Replace with data from your API
const PROFILE = {
  fullName: "Amina Wanjiru",
  email: "amina@email.com",
  phone: "+254 712 345 678",
  cv: { name: "Amina_Wanjiru_CV.pdf", uploaded: "2 Nov 2026" },
};

const APPLICATIONS = [
  {
    id: 1,
    title: "Junior Data Analyst",
    company: "Acme Insurance",
    applied: "2 Nov 2026",
    status: "Shortlisted",
  },
  {
    id: 2,
    title: "Cloud Support Associate",
    company: "[COMPANY]",
    applied: "5 Nov 2026",
    status: "Interview invited",
    interviewUrl: "/interview",
  },
  {
    id: 3,
    title: "Mobile Developer Intern",
    company: "[COMPANY]",
    applied: "20 Oct 2026",
    status: "Not selected",
  },
];

// Adjust these routes to match your router
const ROUTES = { jobs: "/jobs", profile: "/profile" };

const badgeClass = (status) => {
  if (status === "Shortlisted") return "ph-badge ph-badge--good";
  if (status === "Not selected") return "ph-badge ph-badge--grey";
  return "ph-badge";
};

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");

export default function CandidateProfile({
  profile = PROFILE,
  applications = APPLICATIONS,
}) {
  const fileInput = useRef(null);
  const [fullName, setFullName] = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone);
  const [cv, setCv] = useState(profile.cv);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const onSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      return setMessage({ type: "error", text: "Enter your full name." });
    }
    if (phone.replace(/\D/g, "").length < 9) {
      return setMessage({ type: "error", text: "Enter a valid phone number." });
    }
    setSaving(true);
    try {
      // TODO: await fetch("/api/profile", { method: "PATCH", body: JSON.stringify({ fullName, phone }) });
      setMessage({ type: "ok", text: "Changes saved." });
    } finally {
      setSaving(false);
    }
  };

  const onPickCv = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf") {
      return setMessage({ type: "error", text: "Upload your CV as a PDF." });
    }
    // TODO: upload with FormData to your API
    setCv({ name: f.name, uploaded: "Just now" });
    setMessage({ type: "ok", text: "CV updated." });
  };

  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-cp">
      <header className="ph-cp__bar">
        <a className="ph-cp__logo" href="/">
          <span className="ph-cp__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-cp__nav">
          <a className="ph-cp__nav-link" href={ROUTES.jobs}>
            Open jobs
          </a>
          <a
            className="ph-cp__nav-link ph-cp__nav-link--active"
            href={ROUTES.profile}
          >
            Profile
          </a>
          <button
            className="ph-cp__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-cp__main">
        <div className="ph-cp__head">
          <span className="ph-cp__avatar" aria-hidden="true">
            {initials(fullName)}
          </span>
          <div>
            <h1 className="ph-cp__title">{fullName}</h1>
            <p className="ph-cp__sub">{profile.email}</p>
          </div>
        </div>

        <div className="ph-cp__grid">
          <div>
            <section className="ph-cp__card">
              <h2 className="ph-cp__card-title">Your details</h2>
              <form onSubmit={onSave} noValidate>
                <div className="ph-cp__field">
                  <label className="ph-cp__label" htmlFor="fullName">
                    Full name
                  </label>
                  <input
                    className="ph-cp__input"
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>

                <div className="ph-cp__field">
                  <label className="ph-cp__label" htmlFor="email">
                    Email
                  </label>
                  <input
                    className="ph-cp__input"
                    id="email"
                    type="email"
                    value={profile.email}
                    disabled
                  />
                </div>

                <div className="ph-cp__field">
                  <label className="ph-cp__label" htmlFor="phone">
                    Phone number
                  </label>
                  <input
                    className="ph-cp__input"
                    id="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="+254 712 345 678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="ph-cp__hint">
                    We text your interview link to this number.
                  </p>
                </div>

                {message.text && (
                  <p
                    className={"ph-cp__msg ph-cp__msg--" + message.type}
                    role={message.type === "error" ? "alert" : "status"}
                  >
                    {message.text}
                  </p>
                )}

                <button
                  className="ph-btn ph-btn--full"
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </form>
            </section>

            <section className="ph-cp__card">
              <h2 className="ph-cp__card-title">Your CV</h2>
              <div className="ph-cv">
                <div>
                  <p className="ph-cv__name">
                    {cv ? cv.name : "No CV uploaded"}
                  </p>
                  {cv && <p className="ph-cv__meta">Uploaded {cv.uploaded}</p>}
                </div>
                <button
                  className="ph-btn ph-btn--ghost"
                  type="button"
                  onClick={() => fileInput.current?.click()}
                >
                  {cv ? "Replace PDF" : "Choose PDF"}
                </button>
                <input
                  ref={fileInput}
                  className="ph-cv__input"
                  type="file"
                  accept="application/pdf"
                  onChange={onPickCv}
                />
              </div>
            </section>
          </div>

          <section className="ph-cp__card">
            <h2 className="ph-cp__card-title">Your applications</h2>
            {applications.length === 0 ? (
              <p className="ph-cp__empty">
                You have not applied to any jobs yet.{" "}
                <a href={ROUTES.jobs}>Browse open jobs</a>
              </p>
            ) : (
              <ul className="ph-apps">
                {applications.map((a) => (
                  <li className="ph-app" key={a.id}>
                    <div>
                      <p className="ph-app__title">{a.title}</p>
                      <p className="ph-app__meta">
                        {a.company} · Applied {a.applied}
                      </p>
                    </div>
                    <div className="ph-app__right">
                      <span className={badgeClass(a.status)}>{a.status}</span>
                      {a.interviewUrl && (
                        <a className="ph-app__link" href={a.interviewUrl}>
                          Start interview
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

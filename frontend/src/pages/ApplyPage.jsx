import { useRef, useState } from "react";
import "../styles/apply.css";

// Replace with data from your API (e.g. fetched by job id)
const JOB = {
  id: 1,
  status: "Open",
  title: "Junior Data Analyst",
  company: "Acme Insurance",
  about:
    "Build loss-ratio reports and dashboards for the claims team and explain the numbers to non-technical colleagues.",
  requirements: [
    "SQL and Python",
    "Basic statistics",
    "Clear written communication",
  ],
};

export default function ApplyPage({ job = JOB }) {
  const fileInput = useRef(null);
  const [file, setFile] = useState(null);
  const [phone, setPhone] = useState("");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pickFile = (f) => {
    if (!f) return;
    if (f.type !== "application/pdf") {
      setError("Upload your CV as a PDF.");
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
    if (!file) return setError("Upload your CV as a PDF.");
    if (phone.replace(/\D/g, "").length < 9)
      return setError("Enter a valid phone number.");
    setError("");
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append("cv", file);
      data.append("phone", phone);
      data.append("jobId", job.id);
      // TODO: await fetch("/api/applications", { method: "POST", body: data });
      console.log([...data.entries()]);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-apply">
      <header className="ph-apply__bar">
        <a className="ph-apply__logo" href="/">
          <span className="ph-apply__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-apply__nav">
          <a className="ph-apply__nav-link" href="/jobs">
            Open jobs
          </a>
          <button
            className="ph-apply__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-apply__main">
        <section className="ph-apply__card">
          <span className="ph-apply__badge">{job.status}</span>
          <h1 className="ph-apply__job-title">{job.title}</h1>
          <p className="ph-apply__company">{job.company}</p>

          <h2 className="ph-apply__heading">About the role</h2>
          <p className="ph-apply__text">{job.about}</p>

          <h2 className="ph-apply__heading">Requirements</h2>
          <ul className="ph-apply__list">
            {job.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="ph-apply__card">
          <h2 className="ph-apply__form-title">Your application</h2>

          <form onSubmit={onSubmit} noValidate>
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
                {file ? file.name : "Upload your CV as a PDF"}
              </p>
              <button
                className="ph-drop__btn"
                type="button"
                onClick={() => fileInput.current?.click()}
              >
                {file ? "Change PDF" : "Choose PDF"}
              </button>
              <input
                ref={fileInput}
                className="ph-drop__input"
                type="file"
                accept="application/pdf"
                onChange={(e) => pickFile(e.target.files?.[0])}
              />
            </div>

            <label className="ph-apply__label" htmlFor="phone">
              Phone number
            </label>
            <input
              className="ph-apply__input"
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+254 712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              aria-invalid={!!error && error.includes("phone")}
            />

            {error && (
              <p className="ph-apply__error" role="alert">
                {error}
              </p>
            )}

            <button
              className="ph-apply__submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit application"}
            </button>
          </form>

          <p className="ph-apply__note">
            If your CV matches, we text you a one-time interview link that is
            valid for 48 hours.
          </p>
        </section>
      </main>
    </div>
  );
}

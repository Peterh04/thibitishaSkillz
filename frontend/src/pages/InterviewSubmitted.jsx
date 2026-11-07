import "../styles/submitted.css";

// Replace with data from your API
const RESULT = {
  jobTitle: "Junior Data Analyst",
  company: "Acme Insurance",
  answered: 8,
  total: 8,
  timeTaken: "14 min",
};

// Adjust these routes to match your router
const ROUTES = { jobs: "/jobs", profile: "/profile" };

export default function InterviewSubmitted({ result = RESULT }) {
  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-done">
      <header className="ph-done__bar">
        <a className="ph-done__logo" href="/">
          <span className="ph-done__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-done__nav">
          <a className="ph-done__nav-link" href={ROUTES.jobs}>
            Open jobs
          </a>
          <button
            className="ph-done__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-done__main">
        <section className="ph-done__card" role="status">
          <div className="ph-done__icon" aria-hidden="true">
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h1 className="ph-done__title">Interview submitted</h1>
          <p className="ph-done__lead">
            Thank you for completing your interview for {result.jobTitle} at{" "}
            {result.company}. Your answers are now with the recruiter.
          </p>

          <ul className="ph-done__summary">
            <li className="ph-done__stat">
              <p className="ph-done__stat-value">
                {result.answered} of {result.total}
              </p>
              <p className="ph-done__stat-label">Questions answered</p>
            </li>
            <li className="ph-done__stat">
              <p className="ph-done__stat-value">{result.timeTaken}</p>
              <p className="ph-done__stat-label">Time taken</p>
            </li>
            <li className="ph-done__stat">
              <p className="ph-done__stat-value">Submitted</p>
              <p className="ph-done__stat-label">Status</p>
            </li>
          </ul>

          <h2 className="ph-done__steps-title">What happens next</h2>
          <ol className="ph-done__steps">
            <li className="ph-done__step">
              <span className="ph-done__step-num">1</span>
              <span>We score your answers against the role requirements.</span>
            </li>
            <li className="ph-done__step">
              <span className="ph-done__step-num">2</span>
              <span>The recruiter reviews your transcript and ranking.</span>
            </li>
            <li className="ph-done__step">
              <span className="ph-done__step-num">3</span>
              <span>
                If you are shortlisted, you get an invite to an in-person
                interview.
              </span>
            </li>
          </ol>

          <div className="ph-done__actions">
            <a className="ph-btn" href={ROUTES.profile}>
              View my applications
            </a>
            <a className="ph-btn ph-btn--ghost" href={ROUTES.jobs}>
              Browse open jobs
            </a>
          </div>

          <p className="ph-done__note">
            Your interview link has been used and cannot be opened again.
          </p>
        </section>
      </main>
    </div>
  );
}

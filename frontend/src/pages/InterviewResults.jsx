import "../styles/results.css";

// Replace with data from your API
const RESULT = {
  jobTitle: "Junior Data Analyst",
  company: "Acme Insurance",
  status: "Under review", // "Under review" | "Shortlisted" | "Not selected"
  cvMatch: 91,
  interview: 94,
  overall: 93,
  breakdown: [
    {
      criterion: "Technical understanding",
      score: 95,
      note: "You explained why your approach suited the data and named its limits.",
    },
    {
      criterion: "Reasoning under skewed data",
      score: 92,
      note: "You spotted outliers and suggested a fix before fitting the model.",
    },
    {
      criterion: "Communication",
      score: 90,
      note: "Clear and well structured. Try adding one concrete example.",
    },
    {
      criterion: "Ownership of your work",
      score: 96,
      note: "You described your own decisions in detail.",
    },
  ],
  questions: [
    {
      question:
        "Your CV mentions a loss-ratio model in Python. Why did you choose that approach, and what breaks if the data is skewed?",
      score: 94,
      feedback:
        "Strong answer. You covered the trade-off and what you would check first.",
    },
    {
      question:
        "How would you explain a drop in the loss ratio to a non-technical manager?",
      score: 90,
      feedback: "Good structure. A simple example would make it even clearer.",
    },
  ],
};

// Adjust these routes to match your router
const ROUTES = { jobs: "/jobs", profile: "/profile" };

const MESSAGES = {
  "Under review":
    "The recruiter is reviewing your results. If you are shortlisted, we will text you an invite to an in-person interview.",
  Shortlisted:
    "You have been shortlisted. We will text you the details of your in-person interview.",
  "Not selected":
    "You were not selected for this role this time. Your feedback below may help with your next application.",
};

export default function InterviewResults({ result = RESULT }) {
  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-rs">
      <header className="ph-rs__bar">
        <a className="ph-rs__logo" href="/">
          <span className="ph-rs__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-rs__nav">
          <a className="ph-rs__nav-link" href={ROUTES.jobs}>
            Open jobs
          </a>
          <a className="ph-rs__nav-link" href={ROUTES.profile}>
            Profile
          </a>
          <button
            className="ph-rs__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-rs__main">
        <h1 className="ph-rs__title">Your results</h1>
        <p className="ph-rs__sub">
          {result.jobTitle} · {result.company}
        </p>

        <section className="ph-rs__card">
          <div className="ph-overall">
            <div className="ph-overall__score">
              <p className="ph-overall__value">{result.overall}</p>
              <p className="ph-overall__max">out of 100</p>
            </div>
            <div>
              <p className="ph-overall__label">Overall score</p>
              <span
                className={
                  "ph-badge" +
                  (result.status === "Shortlisted" ? " ph-badge--good" : "")
                }
              >
                {result.status}
              </span>
              <p className="ph-overall__text">{MESSAGES[result.status]}</p>
            </div>
          </div>
        </section>

        <div className="ph-rs__stats">
          <div className="ph-stat">
            <p className="ph-stat__label">CV match</p>
            <p className="ph-stat__value">
              {result.cvMatch} <small>/ 100</small>
            </p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Interview</p>
            <p className="ph-stat__value">
              {result.interview} <small>/ 100</small>
            </p>
          </div>
        </div>

        <section className="ph-rs__card">
          <h2 className="ph-rs__card-title">Your breakdown</h2>
          <ul className="ph-list">
            {result.breakdown.map((b) => (
              <li className="ph-list__item" key={b.criterion}>
                <div className="ph-list__top">
                  <span>{b.criterion}</span>
                  <span className="ph-list__score">{b.score}</span>
                </div>
                <div
                  className="ph-track"
                  role="progressbar"
                  aria-label={b.criterion}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={b.score}
                >
                  <div
                    className="ph-track__fill"
                    style={{ width: `${b.score}%` }}
                  />
                </div>
                <p className="ph-list__note">{b.note}</p>
              </li>
            ))}
          </ul>
        </section>

        <p className="ph-rs__note">
          Scores are based on your CV and your interview answers, and are
          reviewed by the recruiter.
        </p>

        <div className="ph-rs__actions">
          <a className="ph-btn" href={ROUTES.jobs}>
            Browse open jobs
          </a>
          <a className="ph-btn ph-btn--ghost" href={ROUTES.profile}>
            View my applications
          </a>
        </div>
      </main>
    </div>
  );
}

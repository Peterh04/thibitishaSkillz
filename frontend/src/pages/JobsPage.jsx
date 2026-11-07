import { useMemo, useState } from "react";
import "../styles/jobs.css";

// Replace with data from your API
const JOBS = [
  {
    id: 1,
    title: "Junior Data Analyst",
    company: "Acme Insurance",
    description: "Build loss-ratio reports and dashboards for the claims team.",
    skills: ["SQL", "Python"],
  },
  {
    id: 2,
    title: "Cloud Support Associate",
    company: "[COMPANY]",
    description: "Troubleshoot customer cloud issues and write clear fixes.",
    skills: ["AWS", "Linux"],
  },
  {
    id: 3,
    title: "Mobile Developer Intern",
    company: "[COMPANY]",
    description: "Ship features in a Flutter app alongside senior engineers.",
    skills: ["Flutter", "Dart"],
  },
];

export default function JobsPage() {
  const [query, setQuery] = useState("");

  const jobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return JOBS;
    return JOBS.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q)),
    );
  }, [query]);

  const handleApply = (job) => {
    // TODO: navigate to your apply flow, e.g. navigate(`/jobs/${job.id}/apply`)
    console.log("apply", job.id);
  };

  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-jobs">
      <header className="ph-jobs__bar">
        <a className="ph-jobs__logo" href="/">
          <span className="ph-jobs__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-jobs__nav">
          <a
            className="ph-jobs__nav-link ph-jobs__nav-link--active"
            href="/jobs"
          >
            Open jobs
          </a>
          <button
            className="ph-jobs__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-jobs__main">
        <h1 className="ph-jobs__title">Open jobs</h1>
        <p className="ph-jobs__desc">
          Apply with your CV. Strong matches get an SMS invite to a short AI
          interview.
        </p>

        <input
          className="ph-jobs__search"
          type="search"
          placeholder="Search by title or skill"
          aria-label="Search jobs by title or skill"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {jobs.length === 0 ? (
          <p className="ph-jobs__empty">No jobs match your search.</p>
        ) : (
          <div className="ph-jobs__grid">
            {jobs.map((job) => (
              <article className="ph-job" key={job.id}>
                <h2 className="ph-job__title">{job.title}</h2>
                <p className="ph-job__company">{job.company}</p>
                <p className="ph-job__desc">{job.description}</p>
                <ul className="ph-job__tags">
                  {job.skills.map((s) => (
                    <li className="ph-job__tag" key={s}>
                      {s}
                    </li>
                  ))}
                </ul>
                <button
                  className="ph-job__apply"
                  type="button"
                  onClick={() => handleApply(job)}
                >
                  Apply
                </button>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

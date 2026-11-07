import { useMemo, useState } from "react";
import "../styles/recruiter-jobs.css";

// Replace with data from your API
const INITIAL_JOBS = [
  {
    id: 1,
    title: "Junior Data Analyst",
    company: "Acme Insurance",
    status: "Open",
    applicants: 5,
    interviewed: 5,
    posted: "2 Nov 2026",
  },
  {
    id: 2,
    title: "Cloud Support Associate",
    company: "[COMPANY]",
    status: "Open",
    applicants: 0,
    interviewed: 0,
    posted: "5 Nov 2026",
  },
  {
    id: 3,
    title: "Mobile Developer Intern",
    company: "[COMPANY]",
    status: "Closed",
    applicants: 0,
    interviewed: 0,
    posted: "20 Oct 2026",
  },
];

// Adjust these routes to match your router
const ROUTES = {
  home: "/recruiter",
  jobs: "/recruiter/jobs",
  newJob: "/recruiter/jobs/new",
  candidates: "/recruiter/candidates",
  job: (id) => `/recruiter/jobs/${id}`,
};

const FILTERS = ["All", "Open", "Closed"];

export default function RecruiterJobs({ jobs: initialJobs = INITIAL_JOBS }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (j) =>
        (filter === "All" || j.status === filter) &&
        (!q ||
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q)),
    );
  }, [jobs, query, filter]);

  const toggleStatus = (job) => {
    const next = job.status === "Open" ? "Closed" : "Open";
    // TODO: await fetch(`/api/jobs/${job.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
    setJobs((list) =>
      list.map((j) => (j.id === job.id ? { ...j, status: next } : j)),
    );
  };

  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-rj">
      <header className="ph-rj__bar">
        <a className="ph-rj__logo" href={ROUTES.home}>
          <span className="ph-rj__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-rj__nav">
          <a className="ph-rj__nav-link" href={ROUTES.home}>
            Home
          </a>
          <a
            className="ph-rj__nav-link ph-rj__nav-link--active"
            href={ROUTES.jobs}
          >
            Jobs
          </a>
          <a className="ph-rj__nav-link" href={ROUTES.candidates}>
            Candidates
          </a>
          <button
            className="ph-rj__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-rj__main">
        <div className="ph-rj__head">
          <div>
            <h1 className="ph-rj__title">Jobs</h1>
            <p className="ph-rj__sub">
              Manage your listings and see who has applied.
            </p>
          </div>
          <a className="ph-btn" href={ROUTES.newJob}>
            Post a new job
          </a>
        </div>

        <div className="ph-rj__toolbar">
          <input
            className="ph-rj__search"
            type="search"
            placeholder="Search by title or company"
            aria-label="Search jobs"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="ph-rj__tabs">
            {FILTERS.map((f) => (
              <button
                key={f}
                className="ph-rj__tab"
                type="button"
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="ph-table-card">
          {visible.length === 0 ? (
            <p className="ph-rj__empty">No jobs match your search.</p>
          ) : (
            <table className="ph-table">
              <thead>
                <tr>
                  <th>Job</th>
                  <th>Status</th>
                  <th>Applicants</th>
                  <th>Interviewed</th>
                  <th>Posted</th>
                  <th className="ph-table__actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <p className="ph-job__title">{job.title}</p>
                      <p className="ph-job__company">{job.company}</p>
                    </td>
                    <td>
                      <span
                        className={
                          "ph-badge" +
                          (job.status === "Closed" ? " ph-badge--closed" : "")
                        }
                      >
                        {job.status}
                      </span>
                    </td>
                    <td>{job.applicants}</td>
                    <td>{job.interviewed}</td>
                    <td>{job.posted}</td>
                    <td>
                      <div className="ph-table__actions-cell">
                        <a
                          className="ph-btn ph-btn--ghost"
                          href={ROUTES.job(job.id)}
                        >
                          View ranking
                        </a>
                        <button
                          className="ph-btn ph-btn--ghost"
                          type="button"
                          onClick={() => toggleStatus(job)}
                        >
                          {job.status === "Open" ? "Close" : "Reopen"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}

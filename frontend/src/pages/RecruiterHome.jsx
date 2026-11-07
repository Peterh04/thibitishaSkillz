import { useMemo } from "react";
import "../styles/recruiter-home.css";

// Replace with data from your API
const RECRUITER = { name: "Peter" };

const JOBS = [
  {
    id: 1,
    title: "Junior Data Analyst",
    company: "Acme Insurance",
    status: "Open",
    applicants: 5,
    interviewed: 5,
    shortlisted: 3,
  },
  {
    id: 2,
    title: "Cloud Support Associate",
    company: "[COMPANY]",
    status: "Open",
    applicants: 0,
    interviewed: 0,
    shortlisted: 0,
  },
  {
    id: 3,
    title: "Mobile Developer Intern",
    company: "[COMPANY]",
    status: "Closed",
    applicants: 0,
    interviewed: 0,
    shortlisted: 0,
  },
];

// Adjust these routes to match your router
const ROUTES = {
  jobs: "/recruiter/jobs",
  newJob: "/recruiter/jobs/new",
  candidates: "/recruiter/candidates",
  invites: "/recruiter/invites",
  job: (id) => `/recruiter/jobs/${id}`,
};

export default function RecruiterHome({ recruiter = RECRUITER, jobs = JOBS }) {
  const totals = useMemo(
    () => ({
      open: jobs.filter((j) => j.status === "Open").length,
      applicants: jobs.reduce((n, j) => n + j.applicants, 0),
      interviewed: jobs.reduce((n, j) => n + j.interviewed, 0),
      shortlisted: jobs.reduce((n, j) => n + j.shortlisted, 0),
    }),
    [jobs],
  );

  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-home">
      <header className="ph-home__bar">
        <a className="ph-home__logo" href="/recruiter">
          <span className="ph-home__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-home__nav">
          <a
            className="ph-home__nav-link ph-home__nav-link--active"
            href="/recruiter"
          >
            Home
          </a>
          <a className="ph-home__nav-link" href={ROUTES.jobs}>
            Jobs
          </a>
          <a className="ph-home__nav-link" href={ROUTES.candidates}>
            Candidates
          </a>
          <button
            className="ph-home__nav-link"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-home__main">
        <div className="ph-home__head">
          <div>
            <h1 className="ph-home__title">Welcome back, {recruiter.name}</h1>
            <p className="ph-home__sub">
              Here is where your hiring stands today.
            </p>
          </div>
          <a className="ph-btn" href={ROUTES.newJob}>
            Post a new job
          </a>
        </div>

        <div className="ph-home__stats">
          <div className="ph-stat">
            <p className="ph-stat__label">Open jobs</p>
            <p className="ph-stat__value">{totals.open}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Applicants</p>
            <p className="ph-stat__value">{totals.applicants}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Interviewed</p>
            <p className="ph-stat__value">{totals.interviewed}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Shortlisted</p>
            <p className="ph-stat__value">{totals.shortlisted}</p>
          </div>
        </div>

        <section className="ph-home__section">
          <h2 className="ph-home__section-title">Quick actions</h2>
          <div className="ph-home__quick">
            <a className="ph-quick" href={ROUTES.newJob}>
              <p className="ph-quick__title">Post a job</p>
              <p className="ph-quick__desc">
                Describe the role and the skills you need.
              </p>
            </a>
            <a className="ph-quick" href={ROUTES.candidates}>
              <p className="ph-quick__title">Review candidates</p>
              <p className="ph-quick__desc">
                Read transcripts and rubric scores.
              </p>
            </a>
            <a className="ph-quick" href={ROUTES.invites}>
              <p className="ph-quick__title">Send interview invites</p>
              <p className="ph-quick__desc">
                Invite your top candidates to meet in person.
              </p>
            </a>
          </div>
        </section>

        <section className="ph-home__section">
          <h2 className="ph-home__section-title">Your jobs</h2>

          {jobs.length === 0 ? (
            <p className="ph-home__empty">
              You have not posted any jobs yet. Post your first job to start
              receiving applications.
            </p>
          ) : (
            <div className="ph-home__jobs">
              {jobs.map((job) => (
                <article className="ph-jobrow" key={job.id}>
                  <div>
                    <div className="ph-jobrow__top">
                      <h3 className="ph-jobrow__title">{job.title}</h3>
                      <span
                        className={
                          "ph-badge" +
                          (job.status === "Closed" ? " ph-badge--closed" : "")
                        }
                      >
                        {job.status}
                      </span>
                    </div>
                    <p className="ph-jobrow__company">{job.company}</p>
                  </div>

                  <div className="ph-jobrow__nums">
                    <div>
                      <p className="ph-num__value">{job.applicants}</p>
                      <p className="ph-num__label">Applicants</p>
                    </div>
                    <div>
                      <p className="ph-num__value">{job.interviewed}</p>
                      <p className="ph-num__label">Interviewed</p>
                    </div>
                    <div>
                      <p className="ph-num__value">{job.shortlisted}</p>
                      <p className="ph-num__label">Shortlisted</p>
                    </div>
                  </div>

                  <div className="ph-jobrow__actions">
                    <a
                      className="ph-btn ph-btn--ghost"
                      href={ROUTES.job(job.id)}
                    >
                      View ranking
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

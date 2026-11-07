import { useMemo, useState } from "react";
import "./dashboard.css";

// Replace with data from your API
const JOB = { title: "Junior Data Analyst", company: "Acme Insurance" };

const CANDIDATES = [
  { id: 1, name: "Amina Wanjiru", cv: 91, interview: 94, overall: 93 },
  { id: 2, name: "Brian Otieno", cv: 86, interview: 90, overall: 88 },
  { id: 3, name: "Joy Achieng", cv: 84, interview: 87, overall: 85 },
  { id: 4, name: "Grace Mutua", cv: 80, interview: 71, overall: 75 },
  { id: 5, name: "Kevin Mwangi", cv: 77, interview: 68, overall: 72 },
];

const TOP_N = 3;

export default function RecruiterDashboard({ job = JOB, candidates = CANDIDATES }) {
  const [selectedId, setSelectedId] = useState(null);

  // Ranked top to bottom by overall score
  const ranked = useMemo(
    () => [...candidates].sort((a, b) => b.overall - a.overall),
    [candidates]
  );

  const stats = useMemo(() => {
    const interviewed = candidates.filter((c) => c.interview != null);
    const avg = candidates.length
      ? Math.round(candidates.reduce((sum, c) => sum + c.overall, 0) / candidates.length)
      : 0;
    return { applicants: candidates.length, interviewed: interviewed.length, avg };
  }, [candidates]);

  const openCandidate = (c) => {
    setSelectedId(c.id);
    // TODO: open transcript and rubric, e.g. navigate(`/candidates/${c.id}`)
    console.log("open", c.id);
  };

  const sendInvites = () => {
    // TODO: call your API with the top candidates
    console.log("invite", ranked.slice(0, TOP_N).map((c) => c.id));
  };

  const handleSignOut = () => {
    // TODO: clear session and redirect
    console.log("sign out");
  };

  return (
    <div className="ph-dash">
      <header className="ph-dash__bar">
        <a className="ph-dash__logo" href="/">
          <span className="ph-dash__logo-mark" />
          ProofHire
        </a>
        <nav className="ph-dash__nav">
          <a className="ph-dash__nav-link" href="/jobs">Jobs</a>
          <button className="ph-dash__nav-link" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </nav>
      </header>

      <main className="ph-dash__main">
        <h1 className="ph-dash__title">{job.title}</h1>
        <p className="ph-dash__sub">{job.company} · ranked from top to bottom</p>

        <div className="ph-dash__stats">
          <div className="ph-stat">
            <p className="ph-stat__label">Applicants</p>
            <p className="ph-stat__value">{stats.applicants}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Interviewed</p>
            <p className="ph-stat__value">{stats.interviewed}</p>
          </div>
          <div className="ph-stat">
            <p className="ph-stat__label">Average score</p>
            <p className="ph-stat__value">{stats.avg}</p>
          </div>
        </div>

        <div className="ph-table-card">
          <table className="ph-table">
            <thead>
              <tr>
                <th className="ph-table__rank">Rank</th>
                <th className="ph-table__name">Candidate</th>
                <th className="ph-table__cv">CV match</th>
                <th className="ph-table__iv">Interview</th>
                <th className="ph-table__overall">Overall</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((c, i) => {
                const shortlisted = i < TOP_N;
                return (
                  <tr
                    key={c.id}
                    tabIndex={0}
                    aria-selected={selectedId === c.id}
                    onClick={() => openCandidate(c)}
                    onKeyDown={(e) => e.key === "Enter" && openCandidate(c)}
                  >
                    <td>{i + 1}</td>
                    <td>{c.name}</td>
                    <td>{c.cv}</td>
                    <td>{c.interview}</td>
                    <td>
                      {shortlisted ? <span className="ph-score">{c.overall}</span> : c.overall}
                    </td>
                    <td>{shortlisted ? "Shortlisted" : "Scored"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="ph-dash__foot">
          <p className="ph-dash__hint">Select a row to read the transcript and rubric.</p>
          <button className="ph-dash__cta" type="button" onClick={sendInvites}>
            Send physical interview invites to top {TOP_N}
          </button>
        </div>
      </main>
    </div>
  );
}

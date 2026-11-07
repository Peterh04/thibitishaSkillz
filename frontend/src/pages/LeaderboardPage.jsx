import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import leaderboardApi from "../api/leaderboard";
import skillsApi from "../api/skills";
import "../styles/dashboard.css";

export default function LeaderboardPage() {
  const [entries, setEntries] = useState([]);
  const [skills, setSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSkills() {
      try {
        const skillList = await skillsApi.getSkills();
        setSkills(skillList || []);
      } catch (err) {
        console.warn("Could not load skills list:", err.message);
      }
    }
    loadSkills();
  }, []);

  const loadLeaderboard = async (skillId) => {
    setLoading(true);
    setError("");
    try {
      let data;
      if (skillId) {
        data = await leaderboardApi.getSkillLeaderboard(skillId, { page_size: 50 });
      } else {
        data = await leaderboardApi.getLeaderboard({ page_size: 50 });
      }
      setEntries(data.items || []);
    } catch (err) {
      setError(err.message || "Failed to load leaderboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLeaderboard(selectedSkillId);
  }, [selectedSkillId]);

  return (
    <div className="ph-dash">
      <Navbar />

      <main className="ph-dash__main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 className="ph-dash__title">Verified Skills Leaderboard</h1>
            <p className="ph-dash__sub">
              Top candidates ranked by objective, AI-evaluated technical assessments.
            </p>
          </div>

          <div>
            <select
              value={selectedSkillId}
              onChange={(e) => setSelectedSkillId(e.target.value)}
              style={{
                padding: "8px 14px",
                borderRadius: "8px",
                border: "1px solid #d4d4d4",
                background: "#fff",
                fontSize: "14px",
                color: "#1a1a1a",
                cursor: "pointer",
              }}
            >
              <option value="">All Technical Skills</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.category})
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div style={{ padding: "12px 16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        <div className="ph-table-card">
          {loading ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>
              <p>Loading candidate rankings...</p>
            </div>
          ) : entries.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "#666" }}>
              <p style={{ margin: 0, fontSize: "16px" }}>No verified scores recorded for this skill yet.</p>
              <p style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
                Be the first to complete the assessment and claim the top ranking!
              </p>
            </div>
          ) : (
            <table className="ph-table">
              <thead>
                <tr>
                  <th style={{ width: "80px" }}>Rank</th>
                  <th>Candidate</th>
                  <th>Location</th>
                  <th>Skill</th>
                  <th>Verified Score</th>
                  <th>Level</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, idx) => {
                  const rank = entry.rank || idx + 1;
                  const isTop3 = rank <= 3;
                  return (
                    <tr key={`${entry.candidate_id}-${entry.skill_id}-${idx}`}>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: "28px",
                            height: "28px",
                            borderRadius: "50%",
                            background:
                              rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : rank === 3 ? "#cd7f32" : "#f0f0f0",
                            color: isTop3 ? "#000" : "#555",
                            fontWeight: "700",
                            fontSize: "12px",
                          }}
                        >
                          #{rank}
                        </span>
                      </td>
                      <td>
                        <strong>{entry.full_name}</strong>
                      </td>
                      <td style={{ color: "#666" }}>{entry.location || "Kenya"}</td>
                      <td>
                        <span style={{ fontWeight: "500", color: "#1a5fa6" }}>
                          {entry.skill_name}
                        </span>
                        <span style={{ fontSize: "12px", color: "#888", marginLeft: "6px" }}>
                          ({entry.category})
                        </span>
                      </td>
                      <td>
                        <strong style={{ fontSize: "15px" }}>{Math.round(entry.score)}%</strong>
                      </td>
                      <td>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "10px",
                            fontSize: "12px",
                            fontWeight: "600",
                            background: "#e3f1d9",
                            color: "#2c5a14",
                            textTransform: "capitalize",
                          }}
                        >
                          {entry.verification_level || "Verified"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}


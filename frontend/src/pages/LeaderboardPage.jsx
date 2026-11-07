import { useEffect, useState, useMemo } from "react";
import AppShell from "../components/layout/AppShell";
import leaderboardApi from "../api/leaderboard";
import skillsApi from "../api/skills";
import Card, { CardBody, CardHeader, CardTitle, CardDescription } from "../components/ui/Card";
import DataTable from "../components/ui/DataTable";
import Select from "../components/ui/Select";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import StatTile from "../components/ui/StatTile";
import { IconAward, IconShield, IconSparkles } from "../components/ui/Icons";

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

  const columns = useMemo(
    () => [
      {
        key: "rank",
        label: "Rank",
        sortable: true,
        numeric: true,
        align: "center",
        render: (_, row, idx) => {
          const rank = row.rank || idx + 1;
          const isTop3 = rank <= 3;
          return (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "24px",
                height: "24px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: isTop3 ? "var(--accent)" : "var(--surface-sunken)",
                color: isTop3 ? "var(--accent-contrast)" : "var(--text-muted)",
                fontWeight: "var(--font-weight-semibold)",
                fontSize: "var(--font-size-xs)",
                fontFamily: "var(--font-mono)",
              }}
            >
              #{rank}
            </span>
          );
        },
      },
      {
        key: "full_name",
        label: "Candidate",
        sortable: true,
        render: (name, row) => (
          <div>
            <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
              {name || "Verified Candidate"}
            </strong>
            {row.bio && (
              <span
                style={{
                  display: "block",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-faint)",
                  maxWidth: "240px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {row.bio}
              </span>
            )}
          </div>
        ),
      },
      {
        key: "location",
        label: "Location",
        render: (loc) => (
          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
            {loc || "Nairobi, Kenya"}
          </span>
        ),
      },
      {
        key: "skill_name",
        label: "Technical Skill",
        sortable: true,
        render: (skillName, row) => (
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontWeight: "var(--font-weight-medium)", color: "var(--accent)" }}>
              {skillName}
            </span>
            {row.category && (
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)" }}>
                ({row.category})
              </span>
            )}
          </div>
        ),
      },
      {
        key: "score",
        label: "Verified Score",
        sortable: true,
        numeric: true,
        align: "right",
        render: (score) => (
          <span
            className="tabular-nums"
            style={{
              fontWeight: "var(--font-weight-semibold)",
              color: "var(--text)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            {Math.round(score)}%
          </span>
        ),
      },
      {
        key: "verification_level",
        label: "Standard",
        render: (level) => (
          <Badge variant="success" dot>
            {level || "Verified"}
          </Badge>
        ),
      },
    ],
    []
  );

  return (
    <AppShell>
      {/* Editorial Title & Filter */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "var(--space-4)",
          marginBottom: "var(--space-8)",
        }}
      >
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "3px 10px",
              borderRadius: "var(--radius-pill)",
              backgroundColor: "var(--accent-subtle)",
              color: "var(--accent)",
              fontSize: "var(--font-size-xs)",
              fontWeight: "var(--font-weight-medium)",
              marginBottom: "var(--space-2)",
              border: "1px solid var(--accent-subtle-border)",
            }}
          >
            <IconSparkles size={13} /> Objective Evaluation
          </div>

          <h1
            style={{
              fontSize: "var(--font-size-3xl)",
              fontWeight: "var(--font-weight-semibold)",
              letterSpacing: "var(--tracking-tighter)",
              color: "var(--text)",
              marginBottom: "var(--space-2)",
            }}
          >
            Verified Skills Leaderboard
          </h1>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--text-muted)", maxWidth: "620px" }}>
            Top candidates ranked strictly by objective, AI-proctored technical evaluations and
            verified code challenges.
          </p>
        </div>

        {/* Skill Filter Dropdown */}
        <div style={{ minWidth: "220px" }}>
          <label className="tb-label" htmlFor="skillFilter" style={{ marginBottom: "var(--space-1)" }}>
            Filter by Skill
          </label>
          <select
            id="skillFilter"
            className="tb-select"
            value={selectedSkillId}
            onChange={(e) => setSelectedSkillId(e.target.value)}
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
        <Alert variant="danger" title="Notice" style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </Alert>
      )}

      {/* Rankings Data Table */}
      <Card>
        <CardBody style={{ padding: 0 }}>
          <DataTable
            columns={columns}
            data={entries}
            loading={loading}
            emptyTitle="No verified rankings found"
            emptyDescription="No candidates have taken assessments for this filter yet. Be the first to earn a verified ranking!"
            keyExtractor={(item, idx) => `${item.candidate_id || item.user_id}-${item.skill_id}-${idx}`}
          />
        </CardBody>
      </Card>
    </AppShell>
  );
}

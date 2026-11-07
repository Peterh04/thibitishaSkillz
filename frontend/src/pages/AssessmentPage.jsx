import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import assessmentsApi from "../api/assessments";
import skillsApi from "../api/skills";
import "../styles/dashboard.css";

export default function AssessmentPage() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isJobSeeker } = useAuth();

  // Mode: 'catalog' | 'test' | 'results'
  const [mode, setMode] = useState(skillId ? "ready" : "catalog");

  // Catalog State
  const [skills, setSkills] = useState([]);
  const [selectedSkillId, setSelectedSkillId] = useState(skillId ? parseInt(skillId, 10) : null);
  const [difficulty, setDifficulty] = useState("intermediate");
  const [loadingSkills, setLoadingSkills] = useState(false);

  // Active Assessment State
  const [activeAssessment, setActiveAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // question_id -> candidate_answer string
  const [startingTest, setStartingTest] = useState(false);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(900); // 15 mins default

  // Results State
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Load Skills catalog
  useEffect(() => {
    async function loadCatalog() {
      setLoadingSkills(true);
      try {
        const data = await skillsApi.getSkills();
        setSkills(data || []);
        if (skillId) {
          const found = data.find((s) => s.id === parseInt(skillId, 10));
          if (found) {
            setSelectedSkillId(found.id);
            setMode("ready");
          }
        }
      } catch (err) {
        setError(err.message || "Failed to load skills.");
      } finally {
        setLoadingSkills(false);
      }
    }
    loadCatalog();
  }, [skillId]);

  // Timer countdown during active test
  useEffect(() => {
    if (mode !== "test") return;
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          handleSubmitTest();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [mode, answers, activeAssessment]);

  const handleStartTest = async () => {
    if (!isAuthenticated) {
      navigate("/signin", { state: { from: { pathname: `/assessments/${selectedSkillId || ""}` } } });
      return;
    }
    if (!isJobSeeker) {
      setError("Only candidate accounts can take skill assessments.");
      return;
    }
    if (!selectedSkillId) {
      setError("Please select a skill to test.");
      return;
    }

    setStartingTest(true);
    setError("");

    try {
      // 1. Start assessment
      const assessment = await assessmentsApi.startAssessment({
        skill_id: selectedSkillId,
        difficulty_level: difficulty,
      });
      setActiveAssessment(assessment);

      // 2. Fetch public questions
      const qList = await assessmentsApi.getQuestions(assessment.id);
      setQuestions(qList || []);
      setCurrentIndex(0);
      setAnswers({});
      setSecondsLeft((assessment.total_questions || 5) * 180); // 3 mins per question
      setMode("test");
    } catch (err) {
      setError(err.message || "Failed to start assessment. Please try again.");
    } finally {
      setStartingTest(false);
    }
  };

  const handleSelectAnswer = (questionId, value) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitTest = async () => {
    if (!activeAssessment || submittingTest) return;
    setSubmittingTest(true);
    setError("");

    try {
      const payloadAnswers = questions.map((q) => ({
        question_id: q.id,
        candidate_answer: answers[q.id] || "No answer provided",
      }));

      const res = await assessmentsApi.submitAssessment(activeAssessment.id, {
        answers: payloadAnswers,
      });
      setResult(res);
      setMode("results");
    } catch (err) {
      setError(err.message || "Error scoring assessment.");
    } finally {
      setSubmittingTest(false);
    }
  };

  const currentQ = questions[currentIndex];
  const progressPercent = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;
  const answeredCount = Object.keys(answers).length;

  const formatTimer = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins}:${rem < 10 ? "0" : ""}${rem}`;
  };

  return (
    <div className="ph-dash">
      <Navbar />

      <main className="ph-dash__main">
        {/* Alerts */}
        {error && (
          <div style={{ padding: "12px 16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* MODE 1: Catalog or Ready to Start */}
        {(mode === "catalog" || mode === "ready") && (
          <div>
            <div style={{ marginBottom: "28px" }}>
              <h1 className="ph-dash__title">Skill Assessments & Verification</h1>
              <p className="ph-dash__sub">
                Take an AI-proctored technical test to verify your skills. Earn verified credentials that rank you ahead of unverified CV claims.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "24px", alignItems: "start" }}>
              {/* Skill Selection Grid */}
              <div className="ph-table-card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "18px", margin: "0 0 16px", fontWeight: "600" }}>Choose a Technical Domain</h2>
                {loadingSkills ? (
                  <p style={{ color: "#666" }}>Loading available skills...</p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "12px" }}>
                    {skills.map((s) => {
                      const isSelected = selectedSkillId === s.id;
                      return (
                        <div
                          key={s.id}
                          onClick={() => {
                            setSelectedSkillId(s.id);
                            setMode("ready");
                          }}
                          style={{
                            padding: "14px",
                            borderRadius: "8px",
                            border: `2px solid ${isSelected ? "#1a5fa6" : "#e8e8e6"}`,
                            background: isSelected ? "#f0f4f8" : "#fff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          <p style={{ margin: 0, fontWeight: "600", fontSize: "14px", color: isSelected ? "#1a5fa6" : "#1a1a1a" }}>
                            {s.name}
                          </p>
                          <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#666" }}>
                            {s.category || "Technology"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Start Assessment Config Card */}
              <div className="ph-table-card" style={{ padding: "24px" }}>
                <h2 style={{ fontSize: "18px", margin: "0 0 16px", fontWeight: "600" }}>Test Configuration</h2>

                {selectedSkillId ? (
                  <div>
                    <p style={{ fontSize: "14px", color: "#555", marginBottom: "16px" }}>
                      Selected skill: <strong>{skills.find((s) => s.id === selectedSkillId)?.name || "Technical Skill"}</strong>
                    </p>

                    <label style={{ display: "block", fontSize: "13px", fontWeight: "600", marginBottom: "6px", color: "#333" }}>
                      Difficulty Level
                    </label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: "6px", border: "1px solid #d4d4d4", fontSize: "14px", marginBottom: "20px" }}
                    >
                      <option value="beginner">Beginner (Foundations & Syntax)</option>
                      <option value="intermediate">Intermediate (Real-world scenarios)</option>
                      <option value="advanced">Advanced (Architecture & Optimization)</option>
                    </select>

                    <div style={{ background: "#f8f9fa", padding: "14px", borderRadius: "6px", fontSize: "13px", color: "#555", marginBottom: "20px" }}>
                      <p style={{ margin: "0 0 6px" }}>⏱ <strong>Format:</strong> 5 targeted questions</p>
                      <p style={{ margin: "0 0 6px" }}>🎯 <strong>Scoring:</strong> Multiple choice & practical</p>
                      <p style={{ margin: 0 }}>🛡 <strong>Passing:</strong> 60% or higher for verification</p>
                    </div>

                    <button
                      type="button"
                      className="ph-btn"
                      onClick={handleStartTest}
                      disabled={startingTest}
                      style={{ width: "100%" }}
                    >
                      {startingTest ? "Generating questions with AI..." : "Start Assessment Now"}
                    </button>
                  </div>
                ) : (
                  <p style={{ fontSize: "14px", color: "#777", margin: 0 }}>
                    Select a skill from the list on the left to review instructions and start the assessment.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: Active Test Session */}
        {mode === "test" && currentQ && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            {/* Top Bar with Timer and Progress */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <span style={{ fontSize: "14px", fontWeight: "600", color: "#1a5fa6" }}>
                {activeAssessment?.skill_name} Assessment ({difficulty})
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <span style={{ fontSize: "13px", color: "#666" }}>
                  Question {currentIndex + 1} of {questions.length}
                </span>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    padding: "4px 10px",
                    borderRadius: "6px",
                    background: secondsLeft < 120 ? "#fee4e2" : "#f0f4f8",
                    color: secondsLeft < 120 ? "#b42318" : "#1a5fa6",
                  }}
                >
                  ⏱ {formatTimer(secondsLeft)}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ height: "6px", background: "#e8e8e6", borderRadius: "3px", overflow: "hidden", marginBottom: "24px" }}>
              <div style={{ width: `${progressPercent}%`, height: "100%", background: "#1a5fa6", transition: "width 0.3s ease" }} />
            </div>

            {/* Question Card */}
            <div className="ph-table-card" style={{ padding: "32px", marginBottom: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
                <span style={{ fontSize: "12px", textTransform: "uppercase", fontWeight: "700", color: "#888" }}>
                  Question {currentIndex + 1} ({currentQ.marks || 1} mark{currentQ.marks > 1 ? "s" : ""})
                </span>
                <span style={{ fontSize: "12px", textTransform: "capitalize", color: "#666" }}>
                  {currentQ.question_type.replace("_", " ")}
                </span>
              </div>

              <h2 style={{ fontSize: "18px", fontWeight: "600", lineHeight: "1.4", margin: "0 0 24px", color: "#1a1a1a" }}>
                {currentQ.question_text}
              </h2>

              {/* Options for MCQ */}
              {currentQ.question_type === "multiple_choice" && currentQ.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {currentQ.options.map((opt, i) => {
                    const isChecked = answers[currentQ.id] === opt;
                    return (
                      <label
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "14px 16px",
                          borderRadius: "8px",
                          border: `2px solid ${isChecked ? "#1a5fa6" : "#e8e8e6"}`,
                          background: isChecked ? "#f0f4f8" : "#fff",
                          cursor: "pointer",
                          fontSize: "15px",
                        }}
                      >
                        <input
                          type="radio"
                          name={`q_${currentQ.id}`}
                          value={opt}
                          checked={isChecked}
                          onChange={() => handleSelectAnswer(currentQ.id, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Input for Practical / Open-ended */}
              {currentQ.question_type !== "multiple_choice" && (
                <div>
                  <textarea
                    rows={6}
                    placeholder="Type your explanation or code solution here..."
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    style={{
                      width: "100%",
                      padding: "14px",
                      borderRadius: "8px",
                      border: "1px solid #d4d4d4",
                      fontSize: "14px",
                      fontFamily: "monospace",
                      boxSizing: "border-box",
                      resize: "vertical",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Navigation Actions */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
                disabled={currentIndex === 0}
                style={{
                  padding: "10px 18px",
                  background: "#fff",
                  border: "1px solid #d4d4d4",
                  borderRadius: "6px",
                  fontSize: "14px",
                  cursor: currentIndex === 0 ? "not-allowed" : "pointer",
                  color: currentIndex === 0 ? "#aaa" : "#333",
                }}
              >
                ← Previous
              </button>

              <span style={{ fontSize: "13px", color: "#666" }}>
                Answered {answeredCount} of {questions.length} questions
              </span>

              {currentIndex < questions.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
                  style={{
                    padding: "10px 20px",
                    background: "#1a5fa6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                    fontWeight: "500",
                  }}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  disabled={submittingTest}
                  style={{
                    padding: "10px 24px",
                    background: "#2c5a14",
                    color: "#fff",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    cursor: "pointer",
                    fontWeight: "600",
                  }}
                >
                  {submittingTest ? "Scoring with Gemini AI..." : "Submit Assessment"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* MODE 3: Scorecard & Explanations */}
        {mode === "results" && result && (
          <div style={{ maxWidth: "800px", margin: "0 auto" }}>
            <div className="ph-table-card" style={{ padding: "36px", textAlign: "center", marginBottom: "28px" }}>
              <div
                style={{
                  width: "72px",
                  height: "72px",
                  borderRadius: "50%",
                  background: result.passed ? "#e3f1d9" : "#fee4e2",
                  color: result.passed ? "#2c5a14" : "#b42318",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "32px",
                  margin: "0 auto 16px",
                  fontWeight: "bold",
                }}
              >
                {result.passed ? "✓" : "!"}
              </div>

              <h1 style={{ fontSize: "28px", margin: "0 0 8px", fontWeight: "700" }}>
                {result.passed ? "Assessment Passed!" : "Assessment Complete"}
              </h1>
              <p style={{ color: "#666", fontSize: "15px", margin: "0 0 24px" }}>
                {result.skill_name} Technical Evaluation · {result.difficulty_level}
              </p>

              <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "28px" }}>
                <div style={{ background: "#f7f6f4", padding: "16px 24px", borderRadius: "8px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Score</p>
                  <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#1a5fa6" }}>
                    {result.percentage != null ? `${Math.round(result.percentage)}%` : `${result.score}/${result.total_marks}`}
                  </p>
                </div>
                <div style={{ background: "#f7f6f4", padding: "16px 24px", borderRadius: "8px" }}>
                  <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Credential Level</p>
                  <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#2c5a14", textTransform: "capitalize" }}>
                    {result.verification_level || (result.passed ? "Verified" : "Unverified")}
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "12px" }}>
                <Link
                  to="/dashboard"
                  style={{
                    padding: "10px 20px",
                    background: "#1a5fa6",
                    color: "#fff",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  Return to Dashboard
                </Link>
                <Link
                  to="/leaderboard"
                  style={{
                    padding: "10px 20px",
                    background: "#fff",
                    border: "1px solid #d4d4d4",
                    color: "#333",
                    borderRadius: "6px",
                    textDecoration: "none",
                    fontWeight: "500",
                    fontSize: "14px",
                  }}
                >
                  View Leaderboard
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setMode("catalog");
                    setResult(null);
                  }}
                  style={{
                    padding: "10px 20px",
                    background: "none",
                    border: "none",
                    color: "#555",
                    cursor: "pointer",
                    textDecoration: "underline",
                    fontSize: "14px",
                  }}
                >
                  Test Another Skill
                </button>
              </div>
            </div>

            {/* Detailed Question Review */}
            {result.questions && result.questions.length > 0 && (
              <div className="ph-table-card" style={{ padding: "28px" }}>
                <h2 style={{ fontSize: "18px", margin: "0 0 20px", fontWeight: "600" }}>Question Breakdown & Explanations</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                  {result.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: "16px",
                        borderRadius: "8px",
                        border: `1px solid ${q.is_correct ? "#c8e6c9" : "#ffcdd2"}`,
                        background: q.is_correct ? "#f9fcf8" : "#fffbfa",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                        <span style={{ fontWeight: "600", fontSize: "14px" }}>
                          Question {idx + 1}: {q.question_text}
                        </span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "10px",
                            background: q.is_correct ? "#e3f1d9" : "#fee4e2",
                            color: q.is_correct ? "#2c5a14" : "#b42318",
                          }}
                        >
                          {q.is_correct ? `+${q.awarded_marks || 1} mark` : "0 marks"}
                        </span>
                      </div>

                      <p style={{ margin: "4px 0", fontSize: "13px", color: "#444" }}>
                        <strong>Your answer:</strong> {q.candidate_answer || "None"}
                      </p>
                      <p style={{ margin: "4px 0", fontSize: "13px", color: "#2c5a14" }}>
                        <strong>Correct answer:</strong> {q.correct_answer}
                      </p>
                      {q.explanation && (
                        <p style={{ margin: "6px 0 0", fontSize: "12px", color: "#666", background: "#f0f0f0", padding: "8px", borderRadius: "4px" }}>
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}


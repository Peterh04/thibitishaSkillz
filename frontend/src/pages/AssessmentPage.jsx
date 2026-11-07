import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import assessmentsApi from "../api/assessments";
import skillsApi from "../api/skills";
import Card, { CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import Modal from "../components/ui/Modal";
import Skeleton from "../components/ui/Skeleton";
import {
  IconAward,
  IconShield,
  IconClock,
  IconAlertCircle,
  IconCheckCircle,
  IconVolume2,
  IconArrowLeft,
  IconArrowRight,
  IconSparkles,
} from "../components/ui/Icons";

export default function AssessmentPage() {
  const { skillId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isJobSeeker } = useAuth();

  // Mode: 'catalog' | 'ready' | 'test' | 'results'
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
  const [answers, setAnswers] = useState({});
  const [startingTest, setStartingTest] = useState(false);
  const [submittingTest, setSubmittingTest] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(900);

  // Results State
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  // Proctoring & Anti-Cheat State
  const [tabViolations, setTabViolations] = useState(0);
  const [showViolationModal, setShowViolationModal] = useState(false);
  const [violationMessage, setViolationMessage] = useState("");
  const [showCopyWarning, setShowCopyWarning] = useState(false);
  const violationsRef = useRef(0);
  const lastViolationTimeRef = useRef(0);

  // Audio State
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const currentAudioRef = useRef(null);

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

  // 1. Anti-cheat copy/paste & context menu prevention
  const triggerCopyWarning = (e) => {
    if (e) e.preventDefault();
    setShowCopyWarning(true);
    setTimeout(() => setShowCopyWarning(false), 3000);
  };

  useEffect(() => {
    if (mode !== "test") return;

    const preventClipboard = (e) => triggerCopyWarning(e);
    const preventContextMenu = (e) => {
      e.preventDefault();
      triggerCopyWarning();
    };

    document.addEventListener("copy", preventClipboard);
    document.addEventListener("cut", preventClipboard);
    document.addEventListener("paste", preventClipboard);
    document.addEventListener("contextmenu", preventContextMenu);

    return () => {
      document.removeEventListener("copy", preventClipboard);
      document.removeEventListener("cut", preventClipboard);
      document.removeEventListener("paste", preventClipboard);
      document.removeEventListener("contextmenu", preventContextMenu);
    };
  }, [mode]);

  // 2. Anti-cheat tab switch and window blur detection
  useEffect(() => {
    if (mode !== "test") return;

    const handleWindowViolation = () => {
      const now = Date.now();
      if (now - lastViolationTimeRef.current < 2500) return;
      lastViolationTimeRef.current = now;

      const next = violationsRef.current + 1;
      violationsRef.current = next;
      setTabViolations(next);

      if (next >= 3) {
        setViolationMessage(
          "Maximum window switch limit exceeded (3/3). In accordance with Thibitisha evaluation integrity rules, your assessment has been automatically terminated and submitted."
        );
        setShowViolationModal(true);
        handleSubmitTest();
      } else {
        setViolationMessage(
          `Window / Tab switch detected (Violation ${next} of 3). Navigating away from the active assessment window is strictly prohibited. If you reach 3 violations, your assessment will be immediately terminated.`
        );
        setShowViolationModal(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) handleWindowViolation();
    };

    const handleBlur = () => {
      handleWindowViolation();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [mode, activeAssessment, questions, answers]);

  // 3. Audio Speech Synthesis & Playback
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setAudioPlaying(false);
    setAudioLoading(false);
  };

  const playQuestionAudio = async (question) => {
    if (!question) return;

    if (audioPlaying) {
      stopAudio();
      return;
    }

    stopAudio();
    setAudioLoading(true);

    try {
      const blob = await assessmentsApi.getQuestionAudio(activeAssessment.id, question.id);
      const audioUrl = URL.createObjectURL(blob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setAudioPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        fallbackBrowserSpeech(question.question_text);
      };

      await audio.play();
      setAudioPlaying(true);
    } catch {
      fallbackBrowserSpeech(question.question_text);
    } finally {
      setAudioLoading(false);
    }
  };

  const fallbackBrowserSpeech = (text) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.onend = () => setAudioPlaying(false);
      utterance.onerror = () => setAudioPlaying(false);
      setAudioPlaying(true);
      window.speechSynthesis.speak(utterance);
    } else {
      setAudioPlaying(false);
    }
  };

  useEffect(() => {
    stopAudio();
    if (mode === "test" && autoPlayAudio && questions[currentIndex]) {
      playQuestionAudio(questions[currentIndex]);
    }
  }, [currentIndex, mode]);

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
      const assessment = await assessmentsApi.startAssessment({
        skill_id: selectedSkillId,
        difficulty_level: difficulty,
      });
      setActiveAssessment(assessment);

      const qList = await assessmentsApi.getQuestions(assessment.id);
      setQuestions(qList || []);
      setCurrentIndex(0);
      setAnswers({});
      setSecondsLeft((assessment.total_questions || 5) * 180);
      violationsRef.current = 0;
      setTabViolations(0);
      setShowViolationModal(false);
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
    stopAudio();
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
    <AppShell>
      {/* Toast Alert for Copy/Paste Warning */}
      {showCopyWarning && (
        <div
          style={{
            position: "fixed",
            top: "var(--space-6)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            backgroundColor: "var(--color-danger)",
            color: "var(--accent-contrast)",
            padding: "var(--space-3) var(--space-5)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
            fontSize: "var(--font-size-sm)",
            fontWeight: "var(--font-weight-medium)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
          role="alert"
        >
          <IconShield size={16} />
          <span>Anti-Cheating Notice: Copying and pasting is disabled during assessments.</span>
        </div>
      )}

      {/* Proctoring Violation Modal */}
      <Modal
        isOpen={showViolationModal}
        onClose={() => {
          if (tabViolations < 3) setShowViolationModal(false);
        }}
        title="Proctoring Focus Alert"
        showClose={tabViolations < 3}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "50%",
              backgroundColor: tabViolations >= 3 ? "var(--color-danger-bg)" : "var(--color-warning-bg)",
              color: tabViolations >= 3 ? "var(--color-danger)" : "var(--color-warning)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto var(--space-4)",
            }}
          >
            <IconAlertCircle size={24} />
          </div>

          <h3 style={{ fontSize: "var(--font-size-lg)", marginBottom: "var(--space-2)" }}>
            {tabViolations >= 3 ? "Assessment Terminated" : "Window Focus Violation"}
          </h3>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
            {violationMessage}
          </p>

          {tabViolations < 3 ? (
            <Button
              variant="primary"
              size="md"
              style={{ width: "100%" }}
              onClick={() => setShowViolationModal(false)}
            >
              I Understand &bull; Return to Test
            </Button>
          ) : (
            <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-faint)" }}>
              Submitting test results for evaluation...
            </p>
          )}
        </div>
      </Modal>

      {/* General Error Banner */}
      {error && (
        <Alert variant="danger" title="Assessment Notice" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-6)" }}>
          {error}
        </Alert>
      )}

      {/* MODE 1: Catalog / Ready */}
      {(mode === "catalog" || mode === "ready") && (
        <div>
          {/* Header */}
          <div style={{ marginBottom: "var(--space-8)" }}>
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
              <IconAward size={13} /> Verifiable Technical Standards
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
              Skill Assessments & Verification
            </h1>
            <p style={{ fontSize: "var(--font-size-base)", color: "var(--text-muted)", maxWidth: "680px" }}>
              Take proctored technical evaluations to earn verified credentials. Verified candidates
              rank higher in employer candidate pipelines.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 340px",
              gap: "var(--space-6)",
              alignItems: "start",
            }}
          >
            {/* Domain / Skill Selection Grid */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Technical Domains</CardTitle>
                  <CardDescription>Select a skill category to evaluate.</CardDescription>
                </div>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                {loadingSkills ? (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "var(--space-3)" }}>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Skeleton key={i} height="64px" radius="var(--radius-md)" />
                    ))}
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                      gap: "var(--space-3)",
                    }}
                  >
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
                            padding: "var(--space-4)",
                            borderRadius: "var(--radius-md)",
                            border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                            backgroundColor: isSelected ? "var(--accent-subtle)" : "var(--surface)",
                            cursor: "pointer",
                            transition: "all var(--duration-micro) var(--ease-enter)",
                          }}
                        >
                          <strong
                            style={{
                              display: "block",
                              fontSize: "var(--font-size-sm)",
                              color: isSelected ? "var(--accent)" : "var(--text)",
                              marginBottom: "2px",
                            }}
                          >
                            {s.name}
                          </strong>
                          <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                            {s.category || "General Engineering"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Test Configuration Panel */}
            <Card>
              <CardHeader>
                <CardTitle>Test Configuration</CardTitle>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                {selectedSkillId ? (
                  <div>
                    <div style={{ marginBottom: "var(--space-4)" }}>
                      <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", display: "block" }}>
                        Selected Skill
                      </span>
                      <strong style={{ fontSize: "var(--font-size-base)", color: "var(--text)" }}>
                        {skills.find((s) => s.id === selectedSkillId)?.name || "Technical Skill"}
                      </strong>
                    </div>

                    <div style={{ marginBottom: "var(--space-5)" }}>
                      <label className="tb-label" htmlFor="difficulty" style={{ marginBottom: "var(--space-1)" }}>
                        Difficulty Level
                      </label>
                      <select
                        id="difficulty"
                        className="tb-select"
                        value={difficulty}
                        onChange={(e) => setDifficulty(e.target.value)}
                      >
                        <option value="beginner">Beginner (Core Syntax & Concepts)</option>
                        <option value="intermediate">Intermediate (Real-world Scenarios)</option>
                        <option value="advanced">Advanced (Architecture & Optimization)</option>
                      </select>
                    </div>

                    <div
                      style={{
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        backgroundColor: "var(--surface-raised)",
                        border: "1px solid var(--border-subtle)",
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-muted)",
                        marginBottom: "var(--space-6)",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconClock size={14} color="var(--accent)" />
                        <span>5 questions &bull; ~15 minutes duration</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconShield size={14} color="var(--accent)" />
                        <span>AI-proctored &bull; Copy/paste prevention</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <IconAward size={14} color="var(--color-success)" />
                        <span>Passing standard: 60%+ score for verified badge</span>
                      </div>
                    </div>

                    <Button
                      variant="primary"
                      size="lg"
                      style={{ width: "100%" }}
                      onClick={handleStartTest}
                      loading={startingTest}
                      icon={<IconArrowRight size={16} />}
                    >
                      {startingTest ? "Generating with Gemini..." : "Start Assessment"}
                    </Button>
                  </div>
                ) : (
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: 0 }}>
                    Select a skill from the list on the left to configure difficulty and begin.
                  </p>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      )}

      {/* MODE 2: Active Test Session */}
      {mode === "test" && currentQ && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          {/* Proctoring Status Header */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "var(--space-4)",
              flexWrap: "wrap",
              gap: "var(--space-3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
              <strong style={{ fontSize: "var(--font-size-base)", color: "var(--text)" }}>
                {activeAssessment?.skill_name} ({difficulty})
              </strong>
              <Badge variant={tabViolations > 0 ? "danger" : "success"} dot>
                Proctored: Switches {tabViolations}/3
              </Badge>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)" }}>
              <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                Question {currentIndex + 1} of {questions.length}
              </span>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 10px",
                  borderRadius: "var(--radius-md)",
                  backgroundColor: secondsLeft < 120 ? "var(--color-danger-bg)" : "var(--surface-sunken)",
                  color: secondsLeft < 120 ? "var(--color-danger)" : "var(--text)",
                  fontFamily: "var(--font-mono)",
                  fontWeight: "var(--font-weight-semibold)",
                  fontSize: "var(--font-size-sm)",
                  border: `1px solid ${secondsLeft < 120 ? "var(--color-danger-border)" : "var(--border-subtle)"}`,
                }}
              >
                <IconClock size={15} />
                <span className="tabular-nums">{formatTimer(secondsLeft)}</span>
              </div>
            </div>
          </div>

          {/* Progress Indicator */}
          <div
            style={{
              height: "4px",
              backgroundColor: "var(--surface-sunken)",
              borderRadius: "var(--radius-pill)",
              overflow: "hidden",
              marginBottom: "var(--space-6)",
            }}
          >
            <div
              style={{
                width: `${progressPercent}%`,
                height: "100%",
                backgroundColor: "var(--accent)",
                transition: "width var(--duration-standard) var(--ease-enter)",
              }}
            />
          </div>

          {/* Question Card */}
          <Card style={{ marginBottom: "var(--space-6)" }}>
            <CardBody style={{ padding: "var(--space-8)" }}>
              {/* Question Meta & Audio Read Aloud */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "var(--space-4)",
                  flexWrap: "wrap",
                  gap: "var(--space-3)",
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      textTransform: "uppercase",
                      letterSpacing: "var(--tracking-wide)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text-muted)",
                    }}
                  >
                    Question {currentIndex + 1} ({currentQ.marks || 1} mark{currentQ.marks > 1 ? "s" : ""})
                  </span>
                  <span
                    style={{
                      marginLeft: "var(--space-3)",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--text-faint)",
                      textTransform: "capitalize",
                    }}
                  >
                    {currentQ.question_type.replace("_", " ")}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                  <Button
                    variant={audioPlaying ? "primary" : "secondary"}
                    size="sm"
                    icon={<IconVolume2 size={14} />}
                    onClick={() => playQuestionAudio(currentQ)}
                    loading={audioLoading}
                  >
                    {audioLoading ? "Loading Audio..." : audioPlaying ? "Stop Voice" : "Listen (TTS)"}
                  </Button>

                  <label
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                      fontSize: "var(--font-size-xs)",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoPlayAudio}
                      onChange={(e) => setAutoPlayAudio(e.target.checked)}
                    />
                    Auto-read
                  </label>
                </div>
              </div>

              {/* Uncopyable Question Text */}
              <h2
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: "var(--font-weight-semibold)",
                  lineHeight: "var(--line-height-snug)",
                  color: "var(--text)",
                  marginBottom: "var(--space-6)",
                  userSelect: "none",
                  WebkitUserSelect: "none",
                }}
              >
                {currentQ.question_text}
              </h2>

              {/* Options for MCQ */}
              {currentQ.question_type === "multiple_choice" && currentQ.options && (
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                  {currentQ.options.map((opt, i) => {
                    const isChecked = answers[currentQ.id] === opt;
                    return (
                      <label
                        key={i}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          padding: "var(--space-4)",
                          borderRadius: "var(--radius-md)",
                          border: `1px solid ${isChecked ? "var(--accent)" : "var(--border)"}`,
                          backgroundColor: isChecked ? "var(--accent-subtle)" : "var(--surface)",
                          cursor: "pointer",
                          fontSize: "var(--font-size-sm)",
                          userSelect: "none",
                          WebkitUserSelect: "none",
                          transition: "all var(--duration-micro) var(--ease-enter)",
                        }}
                      >
                        <input
                          type="radio"
                          name={`q_${currentQ.id}`}
                          value={opt}
                          checked={isChecked}
                          onChange={() => handleSelectAnswer(currentQ.id, opt)}
                        />
                        <span style={{ color: "var(--text)" }}>{opt}</span>
                      </label>
                    );
                  })}
                </div>
              )}

              {/* Practical Code/Open-Ended Answer Input */}
              {currentQ.question_type !== "multiple_choice" && (
                <div>
                  <textarea
                    rows={6}
                    placeholder="Type your explanation or code solution here... (Note: pasting external content is locked during assessments)"
                    value={answers[currentQ.id] || ""}
                    onChange={(e) => handleSelectAnswer(currentQ.id, e.target.value)}
                    onCopy={triggerCopyWarning}
                    onCut={triggerCopyWarning}
                    onPaste={triggerCopyWarning}
                    onContextMenu={triggerCopyWarning}
                    className="tb-textarea"
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--font-size-sm)",
                    }}
                  />
                </div>
              )}
            </CardBody>
          </Card>

          {/* Navigation Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Button
              variant="secondary"
              size="md"
              icon={<IconArrowLeft size={15} />}
              onClick={() => setCurrentIndex((idx) => Math.max(0, idx - 1))}
              disabled={currentIndex === 0}
            >
              Previous
            </Button>

            <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
              Answered {answeredCount} of {questions.length} questions
            </span>

            {currentIndex < questions.length - 1 ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => setCurrentIndex((idx) => Math.min(questions.length - 1, idx + 1))}
              >
                <span>Next Question</span>
                <IconArrowRight size={15} />
              </Button>
            ) : (
              <Button
                variant="primary"
                size="md"
                loading={submittingTest}
                onClick={handleSubmitTest}
              >
                {submittingTest ? "Evaluating Answers..." : "Submit Assessment"}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: Scorecard & Explanations */}
      {mode === "results" && result && (
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
          <Card style={{ marginBottom: "var(--space-6)", textAlign: "center" }}>
            <CardBody style={{ padding: "var(--space-10)" }}>
              <div
                style={{
                  width: "64px",
                  height: "64px",
                  borderRadius: "50%",
                  backgroundColor: result.passed ? "var(--color-success-bg)" : "var(--color-danger-bg)",
                  color: result.passed ? "var(--color-success)" : "var(--color-danger)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto var(--space-4)",
                }}
              >
                {result.passed ? <IconCheckCircle size={32} /> : <IconAlertCircle size={32} />}
              </div>

              <h1
                style={{
                  fontSize: "var(--font-size-2xl)",
                  fontWeight: "var(--font-weight-semibold)",
                  color: "var(--text)",
                  marginBottom: "var(--space-2)",
                }}
              >
                {result.passed ? "Assessment Passed!" : "Assessment Complete"}
              </h1>
              <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
                {result.skill_name} Technical Evaluation &bull; Level: {result.difficulty_level}
              </p>

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "var(--space-4)",
                  marginBottom: "var(--space-8)",
                }}
              >
                <div
                  style={{
                    backgroundColor: "var(--surface-raised)",
                    padding: "var(--space-4) var(--space-6)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                    Verified Score
                  </span>
                  <span
                    className="tabular-nums"
                    style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--accent)" }}
                  >
                    {result.percentage != null ? `${Math.round(result.percentage)}%` : `${result.score}/${result.total_marks}`}
                  </span>
                </div>

                <div
                  style={{
                    backgroundColor: "var(--surface-raised)",
                    padding: "var(--space-4) var(--space-6)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                    Credential Status
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-2xl)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: result.passed ? "var(--color-success)" : "var(--color-warning)",
                      textTransform: "capitalize",
                    }}
                  >
                    {result.verification_level || (result.passed ? "Verified" : "Unverified")}
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
                <Link to="/dashboard">
                  <Button variant="primary" size="md">
                    Return to Dashboard
                  </Button>
                </Link>
                <Link to="/leaderboard">
                  <Button variant="secondary" size="md">
                    View Leaderboard
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => {
                    setMode("catalog");
                    setResult(null);
                  }}
                >
                  Test Another Skill
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* Breakdown by question */}
          {result.questions && result.questions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Evaluation Breakdown & Feedback</CardTitle>
              </CardHeader>
              <CardBody style={{ padding: "var(--space-6)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                  {result.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      style={{
                        padding: "var(--space-4)",
                        borderRadius: "var(--radius-md)",
                        border: `1px solid ${q.is_correct ? "var(--color-success-border)" : "var(--color-danger-border)"}`,
                        backgroundColor: q.is_correct ? "var(--color-success-bg)" : "var(--color-danger-bg)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
                        <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                          Question {idx + 1}: {q.question_text}
                        </strong>
                        <Badge variant={q.is_correct ? "success" : "danger"}>
                          {q.is_correct ? `+${q.awarded_marks || 1} mark` : "0 marks"}
                        </Badge>
                      </div>

                      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", margin: "4px 0" }}>
                        <strong>Your answer:</strong> {q.candidate_answer || "None provided"}
                      </p>
                      <p style={{ fontSize: "var(--font-size-xs)", color: "var(--color-success)", margin: "4px 0" }}>
                        <strong>Correct answer:</strong> {q.correct_answer}
                      </p>
                      {q.explanation && (
                        <p
                          style={{
                            fontSize: "var(--font-size-xs)",
                            color: "var(--text-muted)",
                            backgroundColor: "var(--surface)",
                            padding: "var(--space-3)",
                            borderRadius: "var(--radius-sm)",
                            marginTop: "var(--space-2)",
                          }}
                        >
                          <strong>Explanation:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}

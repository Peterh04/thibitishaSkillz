import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import { useAuth } from "../context/AuthContext";
import voiceInterviewsApi from "../api/voiceInterviews";
import Card, { CardBody, CardHeader, CardTitle, CardDescription, CardFooter } from "../components/ui/Card";
import Button from "../components/ui/Button";
import Textarea from "../components/ui/Textarea";
import Badge from "../components/ui/Badge";
import Alert from "../components/ui/Alert";
import Skeleton from "../components/ui/Skeleton";
import {
  IconMic,
  IconMicOff,
  IconVolume2,
  IconClock,
  IconCheckCircle,
  IconArrowRight,
  IconSparkles,
  IconBriefcase,
} from "../components/ui/Icons";

const formatTime = (s) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
};

function createSilentWavBlob(durationSeconds = 1) {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, numSamples * 2, true);

  return new Blob([view], { type: "audio/wav" });
}

export default function InterviewPage() {
  const { interviewId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, isJobSeeker } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [interview, setInterview] = useState(null);
  const [currentTurn, setCurrentTurn] = useState(null);

  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);

  useEffect(() => {
    async function initInterview() {
      if (!isAuthenticated || !isJobSeeker) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        let activeId = interviewId ? parseInt(interviewId, 10) : null;

        if (!activeId) {
          const mine = await voiceInterviewsApi.getMyInterviews();
          const inProgress = mine.find((i) => i.status === "in_progress" || i.status === "pending");
          if (inProgress) {
            activeId = inProgress.id;
          } else if (mine.length > 0) {
            activeId = mine[0].id;
          } else {
            const created = await voiceInterviewsApi.startInterview({ language: "en" });
            activeId = created.id;
          }
        }

        const data = await voiceInterviewsApi.getInterview(activeId);
        setInterview(data);

        if (data.status !== "completed") {
          try {
            const turn = await voiceInterviewsApi.getCurrentTurn(activeId);
            setCurrentTurn(turn);
            setSecondsLeft(120);
          } catch {
            setCurrentTurn(null);
          }
        }
      } catch (err) {
        setError(err.message || "Failed to initialize interview.");
      } finally {
        setLoading(false);
      }
    }

    initInterview();
  }, [interviewId, isAuthenticated, isJobSeeker]);

  useEffect(() => {
    if (!currentTurn || interview?.status === "completed") return;

    const timer = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(timer);
          handleSubmitAnswer();
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentTurn, interview]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.stop();
      }
    };
  }, []);

  const handleHearQuestion = () => {
    if (!currentTurn || !interview) return;

    const audioUrl = voiceInterviewsApi.getQuestionAudioUrl(interview.id, currentTurn.turn_index);
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentTurn.question_text);
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    });
  };

  const startRecording = async () => {
    setError("");
    setLiveTranscript("");
    setRecordedBlob(null);

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      try {
        const rec = new SR();
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (e) => {
          const text = Array.from(e.results)
            .map((r) => r[0].transcript)
            .join(" ");
          setLiveTranscript(text);
        };
        rec.start();
        speechRecognitionRef.current = rec;
      } catch (e) {
        console.warn("SpeechRecognition init error:", e);
      }
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || "audio/webm";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch (micErr) {
      setIsRecording(true);
      setError("Microphone permission denied or device not detected. You can type your response below.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleSubmitAnswer = async () => {
    if (submitting || !interview) return;
    setSubmitting(true);
    setError("");

    if (isRecording) {
      stopRecording();
    }

    try {
      const audioToSubmit = recordedBlob || createSilentWavBlob(2);
      const updated = await voiceInterviewsApi.submitTurnAnswer(interview.id, audioToSubmit);
      setInterview(updated);
      setLiveTranscript("");
      setRecordedBlob(null);

      if (updated.status === "completed") {
        setCurrentTurn(null);
      } else {
        const nextTurn = await voiceInterviewsApi.getCurrentTurn(updated.id);
        setCurrentTurn(nextTurn);
        setSecondsLeft(120);
      }
    } catch (err) {
      setError(err.message || "Failed to submit interview answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const turnIndex = currentTurn ? currentTurn.turn_index : 1;
  const totalTurns = interview?.total_questions || 3;
  const progressPercent = ((turnIndex - 1) / totalTurns) * 100;

  return (
    <AppShell>
      <div style={{ maxWidth: "780px", margin: "0 auto" }}>
        {loading ? (
          <Card>
            <CardBody style={{ padding: "var(--space-10)", textAlign: "center" }}>
              <Skeleton height="32px" width="50%" style={{ margin: "0 auto var(--space-4)" }} />
              <Skeleton height="16px" width="70%" style={{ margin: "0 auto var(--space-6)" }} />
              <Skeleton height="120px" width="100%" />
            </CardBody>
          </Card>
        ) : (
          <>
            {/* Header & Progress when interview is active */}
            {interview?.status !== "completed" && currentTurn && (
              <div style={{ marginBottom: "var(--space-6)" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "var(--space-3)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <Badge variant="accent">
                      Question {turnIndex} of {totalTurns}
                    </Badge>
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)" }}>
                      AI Conversational Evaluation
                    </span>
                  </div>

                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "3px 10px",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: secondsLeft <= 20 ? "var(--color-danger-bg)" : "var(--surface-sunken)",
                      color: secondsLeft <= 20 ? "var(--color-danger)" : "var(--text)",
                      fontFamily: "var(--font-mono)",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-semibold)",
                      border: `1px solid ${secondsLeft <= 20 ? "var(--color-danger-border)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <IconClock size={15} />
                    <span className="tabular-nums">{formatTime(secondsLeft)}</span>
                  </div>
                </div>

                <div
                  style={{
                    height: "4px",
                    backgroundColor: "var(--surface-sunken)",
                    borderRadius: "var(--radius-pill)",
                    overflow: "hidden",
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
              </div>
            )}

            {error && (
              <Alert variant="danger" onDismiss={() => setError("")} style={{ marginBottom: "var(--space-5)" }}>
                {error}
              </Alert>
            )}

            {/* ACTIVE TURN CARD */}
            {interview?.status !== "completed" && currentTurn ? (
              <Card>
                <CardHeader>
                  <div>
                    <CardTitle>Spoken Technical Question</CardTitle>
                    <CardDescription>
                      Listen to the interviewer and respond with your technical approach and tradeoffs.
                    </CardDescription>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<IconVolume2 size={14} />}
                    onClick={handleHearQuestion}
                  >
                    Listen (TTS)
                  </Button>
                </CardHeader>

                <CardBody style={{ padding: "var(--space-8)" }}>
                  <h2
                    style={{
                      fontSize: "var(--font-size-xl)",
                      fontWeight: "var(--font-weight-semibold)",
                      lineHeight: "var(--line-height-snug)",
                      color: "var(--text)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    {currentTurn.question_text}
                  </h2>

                  {currentTurn.question_text_sw && (
                    <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", fontStyle: "italic", marginBottom: "var(--space-6)" }}>
                      Swahili translation: {currentTurn.question_text_sw}
                    </p>
                  )}

                  <div style={{ marginTop: "var(--space-6)" }}>
                    <label className="tb-label" htmlFor="response" style={{ marginBottom: "var(--space-2)" }}>
                      Your Spoken / Transcribed Response
                    </label>
                    <Textarea
                      id="response"
                      placeholder={
                        isRecording
                          ? "Listening to your voice through the microphone..."
                          : "Click the microphone button to speak your answer, or type directly here..."
                      }
                      value={liveTranscript}
                      onChange={(e) => setLiveTranscript(e.target.value)}
                      rows={5}
                    />
                  </div>
                </CardBody>

                <CardFooter style={{ justifyContent: "space-between" }}>
                  <Button
                    variant={isRecording ? "danger" : "secondary"}
                    size="md"
                    icon={isRecording ? <IconMicOff size={16} /> : <IconMic size={16} />}
                    onClick={isRecording ? stopRecording : startRecording}
                  >
                    {isRecording ? "Stop Recording" : "Record Voice Answer"}
                  </Button>

                  <Button
                    variant="primary"
                    size="md"
                    loading={submitting}
                    onClick={handleSubmitAnswer}
                    icon={<IconArrowRight size={15} />}
                  >
                    {submitting ? "Analyzing Audio with Gemini..." : "Submit Answer"}
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              /* COMPLETED REPORT */
              <Card style={{ textAlign: "center" }}>
                <CardBody style={{ padding: "var(--space-10)" }}>
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      borderRadius: "50%",
                      backgroundColor: "var(--color-success-bg)",
                      color: "var(--color-success)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto var(--space-4)",
                    }}
                  >
                    <IconCheckCircle size={32} />
                  </div>

                  <h1
                    style={{
                      fontSize: "var(--font-size-2xl)",
                      fontWeight: "var(--font-weight-semibold)",
                      color: "var(--text)",
                      marginBottom: "var(--space-2)",
                    }}
                  >
                    Voice Interview Complete
                  </h1>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", marginBottom: "var(--space-6)" }}>
                    Your conversational answers have been evaluated for technical depth and clarity.
                  </p>

                  <div
                    style={{
                      display: "inline-block",
                      backgroundColor: "var(--surface-raised)",
                      padding: "var(--space-4) var(--space-8)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                      marginBottom: "var(--space-6)",
                    }}
                  >
                    <span style={{ fontSize: "var(--font-size-xs)", color: "var(--text-muted)", textTransform: "uppercase", display: "block" }}>
                      Overall Interview Score
                    </span>
                    <span
                      className="tabular-nums"
                      style={{ fontSize: "var(--font-size-3xl)", fontWeight: "var(--font-weight-semibold)", color: "var(--accent)" }}
                    >
                      {interview?.percentage != null ? `${Math.round(interview.percentage)}%` : `${interview?.score || 0} pts`}
                    </span>
                  </div>

                  {interview?.summary && (
                    <div
                      style={{
                        backgroundColor: "var(--surface-raised)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-5)",
                        textAlign: "left",
                        marginBottom: "var(--space-6)",
                      }}
                    >
                      <h4 style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
                        AI Evaluator Feedback:
                      </h4>
                      <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text)", margin: 0, lineHeight: "var(--line-height-relaxed)" }}>
                        {interview.summary}
                      </p>
                    </div>
                  )}

                  {/* Question Turns Breakdown */}
                  {interview?.turns && interview.turns.length > 0 && (
                    <div style={{ textAlign: "left", marginBottom: "var(--space-6)" }}>
                      <h4 style={{ fontSize: "var(--font-size-sm)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-3)" }}>
                        Spoken Responses Breakdown
                      </h4>
                      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
                        {interview.turns.map((t) => (
                          <div
                            key={t.id}
                            style={{
                              backgroundColor: "var(--surface)",
                              border: "1px solid var(--border-subtle)",
                              borderRadius: "var(--radius-md)",
                              padding: "var(--space-4)",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "var(--space-1)" }}>
                              <strong style={{ fontSize: "var(--font-size-sm)", color: "var(--text)" }}>
                                Question {t.turn_index}
                              </strong>
                              <Badge variant="accent">
                                {t.awarded_marks || 0} / {t.max_marks || 3} marks
                              </Badge>
                            </div>
                            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-muted)", margin: "4px 0" }}>
                              {t.question_text}
                            </p>
                            {t.transcript && (
                              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--text)", fontStyle: "italic", margin: "4px 0" }}>
                                &ldquo;{t.transcript}&rdquo;
                              </p>
                            )}
                            {t.feedback && (
                              <p style={{ fontSize: "var(--font-size-xs)", color: "var(--accent)", margin: "4px 0 0" }}>
                                <strong>Feedback:</strong> {t.feedback}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-3)" }}>
                    <Link to="/dashboard">
                      <Button variant="primary" size="md">
                        Back to Dashboard
                      </Button>
                    </Link>
                    <Link to="/jobs">
                      <Button variant="secondary" size="md">
                        Browse Open Jobs
                      </Button>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}

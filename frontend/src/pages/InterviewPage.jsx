import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import voiceInterviewsApi from "../api/voiceInterviews";
import "../styles/interview.css";

const formatTime = (s) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
};

// Generates a simple silent/mock WAV blob if the browser environment lacks a physical mic
function createSilentWavBlob(durationSeconds = 1) {
  const sampleRate = 16000;
  const numSamples = sampleRate * durationSeconds;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + numSamples * 2, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  // format chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // 1 channel
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true); // 16 bits
  // data chunk
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

  // Voice recording & transcription state
  const [isRecording, setIsRecording] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(120);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const speechRecognitionRef = useRef(null);
  const audioPlayerRef = useRef(null);

  // Initialize or load interview
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
          // Check if candidate already has an in-progress interview
          const mine = await voiceInterviewsApi.getMyInterviews();
          const inProgress = mine.find((i) => i.status === "in_progress" || i.status === "pending");
          if (inProgress) {
            activeId = inProgress.id;
          } else if (mine.length > 0) {
            activeId = mine[0].id;
          } else {
            // Start a new voice interview session
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

  // Turn timer
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

  // Clean up media streams and recognition on unmount
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

    // First try MsingiAI audio stream if available
    const audioUrl = voiceInterviewsApi.getQuestionAudioUrl(interview.id, currentTurn.turn_index);
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {
      // Fallback to browser SpeechSynthesis
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

    // 1. Setup Web Speech API for live transcription preview
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

    // 2. Setup MediaRecorder for actual audio stream
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
      console.warn("Microphone access not available:", micErr.message);
      // Fallback: indicate manual simulation mode
      setIsRecording(true);
      setError("Microphone not detected or permission denied. Type your answer below and click Submit.");
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
      // Use recorded audio blob if available, or create a mock WAV
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

  if (loading) {
    return (
      <div className="ph-iv">
        <Navbar />
        <main className="ph-iv__main" style={{ textAlign: "center", padding: "60px 0" }}>
          <p>Connecting to AI voice interviewer...</p>
        </main>
      </div>
    );
  }

  const turnIndex = currentTurn ? currentTurn.turn_index : 1;
  const totalTurns = interview?.total_questions || 3;
  const progressPercent = ((turnIndex - 1) / totalTurns) * 100;

  return (
    <div className="ph-iv">
      <Navbar />

      <main className="ph-iv__main">
        {/* Top Status */}
        {interview?.status !== "completed" && currentTurn && (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <div style={{ fontSize: "14px", fontWeight: "600", color: "#1a5fa6" }}>
                AI Voice Interview · Question {turnIndex} of {totalTurns}
              </div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "700",
                  padding: "4px 10px",
                  borderRadius: "6px",
                  background: secondsLeft <= 20 ? "#fee4e2" : "#f0f4f8",
                  color: secondsLeft <= 20 ? "#b42318" : "#1a5fa6",
                }}
              >
                ⏱ {formatTime(secondsLeft)}
              </div>
            </div>

            <div
              className="ph-iv__progress"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={totalTurns}
              aria-valuenow={turnIndex - 1}
            >
              <div
                className="ph-iv__progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </>
        )}

        {/* Error message */}
        {error && (
          <div style={{ padding: "12px 16px", background: "#fef3f2", border: "1px solid #fee4e2", borderRadius: "8px", color: "#b42318", marginBottom: "20px", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* ACTIVE QUESTION TURN */}
        {interview?.status !== "completed" && currentTurn ? (
          <div>
            <section className="ph-iv__card">
              <p className="ph-iv__card-label">Spoken Technical Question</p>
              <h1 className="ph-iv__question" style={{ fontSize: "22px", lineHeight: "1.4" }}>
                {currentTurn.question_text}
              </h1>

              {currentTurn.question_text_sw && (
                <p style={{ fontSize: "14px", color: "#666", fontStyle: "italic", margin: "8px 0 16px" }}>
                  Swahili: {currentTurn.question_text_sw}
                </p>
              )}

              <button className="ph-iv__hear" type="button" onClick={handleHearQuestion}>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.5 8.5a5 5 0 0 1 0 7" />
                </svg>
                Listen (TTS)
              </button>
            </section>

            <label className="ph-iv__label" htmlFor="answer" style={{ marginTop: "24px" }}>
              Your Spoken Response
            </label>
            <textarea
              className="ph-iv__textarea"
              id="answer"
              placeholder={isRecording ? "Listening to your voice..." : "Click the microphone button to speak or type your answer"}
              value={liveTranscript}
              onChange={(e) => setLiveTranscript(e.target.value)}
            />

            <div className="ph-iv__actions">
              <button
                className={"ph-iv__mic" + (isRecording ? " ph-iv__mic--on" : "")}
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                aria-label={isRecording ? "Stop recording" : "Start speaking"}
                title={isRecording ? "Stop recording" : "Record voice answer"}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="9" y="2" width="6" height="12" rx="3" />
                  <path d="M5 11a7 7 0 0 0 14 0" />
                  <line x1="12" y1="18" x2="12" y2="22" />
                </svg>
              </button>

              <button
                className="ph-iv__submit"
                type="button"
                onClick={handleSubmitAnswer}
                disabled={submitting}
              >
                {submitting ? "Analyzing Audio with Gemini..." : "Submit Answer"}
              </button>
            </div>

            <p className="ph-iv__note">
              Answers are transcribed via MsingiAI and evaluated for technical depth and clarity by Gemini AI.
            </p>
          </div>
        ) : (
          /* INTERVIEW COMPLETED REPORT */
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "#e3f1d9",
                color: "#2c5a14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                margin: "0 auto 16px",
                fontWeight: "bold",
              }}
            >
              ✓
            </div>

            <h1 style={{ fontSize: "28px", margin: "0 0 8px", fontWeight: "700" }}>
              Voice Interview Complete
            </h1>
            <p style={{ color: "#666", fontSize: "15px", margin: "0 0 24px" }}>
              Your technical discussion has been transcribed and verified.
            </p>

            {/* Scorecard */}
            <div style={{ display: "flex", justifyContent: "center", gap: "24px", marginBottom: "32px" }}>
              <div style={{ background: "#fff", border: "1px solid #e8e8e6", padding: "16px 28px", borderRadius: "8px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#666", textTransform: "uppercase" }}>Overall Score</p>
                <p style={{ margin: 0, fontSize: "28px", fontWeight: "700", color: "#1a5fa6" }}>
                  {interview?.percentage != null ? `${Math.round(interview.percentage)}%` : `${interview?.score || 0} pts`}
                </p>
              </div>
            </div>

            {interview?.summary && (
              <div style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: "8px", padding: "20px", textAlign: "left", maxWidth: "600px", margin: "0 auto 32px" }}>
                <h3 style={{ margin: "0 0 8px", fontSize: "15px", color: "#1a1a1a" }}>AI Evaluator Feedback:</h3>
                <p style={{ margin: 0, fontSize: "14px", color: "#444", lineHeight: "1.6" }}>
                  {interview.summary}
                </p>
              </div>
            )}

            {/* Turn History */}
            {interview?.turns && interview.turns.length > 0 && (
              <div style={{ textAlign: "left", maxWidth: "600px", margin: "0 auto 32px" }}>
                <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>Question Breakdown</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {interview.turns.map((t) => (
                    <div key={t.id} style={{ background: "#fff", border: "1px solid #e8e8e6", borderRadius: "8px", padding: "14px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                        <span style={{ fontWeight: "600", fontSize: "13px" }}>Question {t.turn_index}</span>
                        <span style={{ fontSize: "12px", color: "#2c5a14", fontWeight: "600" }}>
                          {t.awarded_marks || 0} / {t.max_marks || 3} marks
                        </span>
                      </div>
                      <p style={{ margin: "0 0 6px", fontSize: "13px", color: "#333" }}>{t.question_text}</p>
                      {t.transcript && (
                        <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#555", fontStyle: "italic" }}>
                          <strong>Transcript:</strong> "{t.transcript}"
                        </p>
                      )}
                      {t.feedback && (
                        <p style={{ margin: 0, fontSize: "12px", color: "#1a5fa6" }}>
                          <strong>Feedback:</strong> {t.feedback}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
                Back to Dashboard
              </Link>
              <Link
                to="/"
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
                Browse More Jobs
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

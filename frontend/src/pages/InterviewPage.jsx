import { useEffect, useRef, useState } from "react";
import "../styles/interview.css";

// Replace with data from your API
const QUESTION =
  "Your CV mentions a loss-ratio model in Python. Why did you choose that approach, and what breaks if the data is skewed?";

const formatTime = (s) => {
  const m = String(Math.floor(s / 60)).padStart(2, "0");
  const r = String(s % 60).padStart(2, "0");
  return `${m}:${r}`;
};

export default function InterviewPage({
  question = QUESTION,
  current = 3,
  total = 8,
  secondsPerQuestion = 120,
}) {
  const [answer, setAnswer] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(secondsPerQuestion);
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const recognition = useRef(null);

  // Countdown (resets when the question changes)
  useEffect(() => {
    setSecondsLeft(secondsPerQuestion);
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [current, secondsPerQuestion]);

  // Auto-submit when time runs out
  useEffect(() => {
    if (secondsLeft === 0) submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  // Stop mic on unmount
  useEffect(() => () => recognition.current?.stop(), []);

  const hearAgain = () => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(question));
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognition.current?.stop();
      return;
    }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const text = Array.from(e.results)
        .slice(e.resultIndex)
        .map((r) => r[0].transcript)
        .join(" ");
      setAnswer((a) => (a ? a + " " : "") + text.trim());
    };
    rec.onend = () => setListening(false);
    rec.start();
    recognition.current = rec;
    setListening(true);
  };

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    recognition.current?.stop();
    try {
      // TODO: await fetch("/api/interview/answer", { method: "POST", body: JSON.stringify({ answer }) });
      console.log({ question: current, answer });
    } finally {
      setSubmitting(false);
    }
  };

  const progress = ((current - 1) / total) * 100;

  return (
    <div className="ph-iv">
      <header className="ph-iv__bar">
        <div className="ph-iv__logo">
          <span className="ph-iv__logo-mark" />
          ProofHire
        </div>
        <div className="ph-iv__status">
          <span>
            Question {current} of {total}
          </span>
          <span
            className={
              "ph-iv__timer" + (secondsLeft <= 15 ? " ph-iv__timer--low" : "")
            }
            role="timer"
          >
            {formatTime(secondsLeft)}
          </span>
        </div>
      </header>

      <main className="ph-iv__main">
        <div
          className="ph-iv__progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={current - 1}
        >
          <div
            className="ph-iv__progress-fill"
            style={{ width: `${progress}%` }}
          />
        </div>

        <section className="ph-iv__card">
          <p className="ph-iv__card-label">Your question</p>
          <h1 className="ph-iv__question">{question}</h1>
          <button className="ph-iv__hear" type="button" onClick={hearAgain}>
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
            Hear again
          </button>
        </section>

        <label className="ph-iv__label" htmlFor="answer">
          Your answer
        </label>
        <textarea
          className="ph-iv__textarea"
          id="answer"
          placeholder="Speak or type your answer"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div className="ph-iv__actions">
          <button
            className={"ph-iv__mic" + (listening ? " ph-iv__mic--on" : "")}
            type="button"
            onClick={toggleMic}
            aria-label={listening ? "Stop recording" : "Start recording"}
            aria-pressed={listening}
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
            onClick={submit}
            disabled={submitting}
          >
            Submit answer
          </button>
        </div>

        <p className="ph-iv__note">
          Answers are timed and your link works once.
        </p>
      </main>
    </div>
  );
}

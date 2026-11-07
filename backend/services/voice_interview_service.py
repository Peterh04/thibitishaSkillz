"""Orchestrate post-CV spoken interviews (Gemini questions + Msingi audio)."""

from __future__ import annotations

import json
import logging
import uuid
from pathlib import Path

from sqlalchemy.orm import Session, joinedload

from backend.config import settings
from backend.models import (
    AnalysisStatus,
    CV,
    Skill,
    User,
    VoiceInterview,
    VoiceInterviewStatus,
    VoiceInterviewTurn,
)
from backend.services.gemini_service import (
    GeminiError,
    evaluate_voice_answer,
    generate_voice_interview_questions,
)
from backend.services.msingi_service import MsingiError, create_speech, transcribe_audio
from backend.utils import utcnow

logger = logging.getLogger("thibitisha.voice_interview")

MARKS_PER_TURN = 3
ALLOWED_ANSWER_EXTENSIONS = {".wav", ".webm", ".ogg", ".mp3", ".m4a"}


def ensure_voice_dir() -> Path:
    path = settings.voice_upload_path
    path.mkdir(parents=True, exist_ok=True)
    return path


def _latest_usable_cv(db: Session, candidate_id: int, cv_id: int | None) -> CV:
    query = db.query(CV).filter(CV.candidate_id == candidate_id)
    if cv_id is not None:
        cv = query.filter(CV.id == cv_id).first()
    else:
        cv = (
            query.filter(CV.is_current.is_(True))
            .order_by(CV.uploaded_at.desc())
            .first()
        )
    if cv is None:
        raise ValueError("Upload a CV before starting a voice interview.")
    if cv.analysis_status == AnalysisStatus.failed:
        raise ValueError("Your latest CV analysis failed. Upload a clearer CV first.")
    if not (cv.extracted_text or "").strip() and not cv.analysis_result:
        raise ValueError("Wait for CV analysis to finish, then start the voice interview.")
    return cv


def _cv_excerpt(cv: CV) -> str:
    parts: list[str] = []
    if cv.extracted_text:
        parts.append(cv.extracted_text)
    if isinstance(cv.analysis_result, dict):
        parts.append(json.dumps(cv.analysis_result, ensure_ascii=False))
    return "\n\n".join(parts)


def start_interview(
    db: Session,
    *,
    candidate: User,
    skill_id: int | None = None,
    cv_id: int | None = None,
) -> VoiceInterview:
    if not settings.gemini_configured:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY in backend/.env.")

    existing = (
        db.query(VoiceInterview)
        .filter(
            VoiceInterview.candidate_id == candidate.id,
            VoiceInterview.status.in_(
                [VoiceInterviewStatus.pending, VoiceInterviewStatus.in_progress]
            ),
        )
        .first()
    )
    if existing is not None:
        raise ValueError("You already have an active voice interview. Finish or cancel it first.")

    cv = _latest_usable_cv(db, candidate.id, cv_id)
    skill = None
    skill_name = None
    if skill_id is not None:
        skill = db.query(Skill).filter(Skill.id == skill_id).first()
        if skill is None:
            raise ValueError("Skill not found.")
        skill_name = skill.name

    count = max(2, min(10, int(settings.VOICE_INTERVIEW_QUESTIONS or 5)))
    try:
        questions = generate_voice_interview_questions(
            candidate_name=candidate.full_name,
            skill_name=skill_name,
            cv_excerpt=_cv_excerpt(cv),
            count=count,
        )
    except GeminiError as exc:
        raise RuntimeError(str(exc)) from exc

    interview = VoiceInterview(
        candidate_id=candidate.id,
        skill_id=skill.id if skill else None,
        cv_id=cv.id,
        language="sw",
        status=VoiceInterviewStatus.in_progress,
        total_questions=len(questions),
        started_at=utcnow(),
    )
    db.add(interview)
    db.flush()

    for index, item in enumerate(questions):
        db.add(
            VoiceInterviewTurn(
                interview_id=interview.id,
                turn_index=index,
                question_text=item["question_sw"],
                question_text_en=item.get("question_en"),
                max_marks=MARKS_PER_TURN,
                # stash expected answer in feedback until answered (cleared on score)
                feedback=json.dumps(
                    {"expected_answer_sw": item.get("expected_answer_sw", "")},
                    ensure_ascii=False,
                ),
            )
        )
    db.commit()
    return (
        db.query(VoiceInterview)
        .options(joinedload(VoiceInterview.turns), joinedload(VoiceInterview.skill))
        .filter(VoiceInterview.id == interview.id)
        .one()
    )


def get_interview(db: Session, interview_id: int, candidate_id: int) -> VoiceInterview:
    interview = (
        db.query(VoiceInterview)
        .options(joinedload(VoiceInterview.turns), joinedload(VoiceInterview.skill))
        .filter(VoiceInterview.id == interview_id)
        .first()
    )
    if interview is None or interview.candidate_id != candidate_id:
        raise LookupError("Voice interview not found.")
    return interview


def current_turn(interview: VoiceInterview) -> VoiceInterviewTurn | None:
    ordered = sorted(interview.turns, key=lambda t: t.turn_index)
    for turn in ordered:
        if turn.answered_at is None:
            return turn
    return None


def _expected_from_feedback(turn: VoiceInterviewTurn) -> str:
    raw = turn.feedback or ""
    try:
        data = json.loads(raw)
        if isinstance(data, dict) and "expected_answer_sw" in data:
            return str(data["expected_answer_sw"])
    except Exception:
        pass
    return ""


def synthesize_question_audio(db: Session, interview: VoiceInterview, turn: VoiceInterviewTurn) -> Path:
    """Billable Msingi TTS — call only when the client requests question audio."""
    if not settings.msingi_configured:
        raise RuntimeError("MsingiAI is not configured. Set MSINGI_API_KEY in backend/.env.")
    if turn.question_audio_path:
        existing = Path(turn.question_audio_path)
        if existing.is_file():
            return existing

    try:
        audio = create_speech(turn.question_text)
    except MsingiError as exc:
        raise RuntimeError(str(exc)) from exc

    folder = ensure_voice_dir() / f"interview_{interview.id}"
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"q{turn.turn_index}_{uuid.uuid4().hex[:8]}.wav"
    path.write_bytes(audio)
    turn.question_audio_path = str(path)
    db.commit()
    return path


def submit_answer_audio(
    db: Session,
    interview: VoiceInterview,
    *,
    content: bytes,
    filename: str,
) -> VoiceInterview:
    if interview.status not in {VoiceInterviewStatus.pending, VoiceInterviewStatus.in_progress}:
        raise ValueError("This voice interview is already finished.")
    if not settings.msingi_configured:
        raise RuntimeError("MsingiAI is not configured. Set MSINGI_API_KEY in backend/.env.")
    if not settings.gemini_configured:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY in backend/.env.")

    turn = current_turn(interview)
    if turn is None:
        raise ValueError("All questions are already answered.")

    suffix = Path(filename or "answer.wav").suffix.lower() or ".wav"
    if suffix not in ALLOWED_ANSWER_EXTENSIONS:
        raise ValueError("Unsupported audio type. Use WAV, WebM, OGG, MP3, or M4A.")

    max_bytes = 8 * 1024 * 1024
    if len(content) > max_bytes:
        raise ValueError("Answer audio is too large (max 8 MB).")

    folder = ensure_voice_dir() / f"interview_{interview.id}"
    folder.mkdir(parents=True, exist_ok=True)
    answer_path = folder / f"a{turn.turn_index}_{uuid.uuid4().hex[:8]}{suffix}"
    answer_path.write_bytes(content)
    turn.answer_audio_path = str(answer_path)

    try:
        transcription = transcribe_audio(content, filename=answer_path.name)
    except MsingiError as exc:
        interview.status = VoiceInterviewStatus.failed
        db.commit()
        raise RuntimeError(str(exc)) from exc

    transcript = str(transcription.get("text") or "").strip()
    turn.transcript = transcript
    expected = _expected_from_feedback(turn)

    try:
        evaluation = evaluate_voice_answer(
            question_sw=turn.question_text,
            expected_answer_sw=expected,
            transcript=transcript or "(empty)",
            max_marks=turn.max_marks or MARKS_PER_TURN,
        )
    except GeminiError as exc:
        raise RuntimeError(str(exc)) from exc

    turn.awarded_marks = int(evaluation["awarded_marks"])
    turn.feedback = json.dumps(
        {
            "feedback_sw": evaluation.get("feedback_sw", ""),
            "feedback_en": evaluation.get("feedback_en", ""),
            "expected_answer_sw": expected,
        },
        ensure_ascii=False,
    )
    turn.answered_at = utcnow()
    interview.status = VoiceInterviewStatus.in_progress

    remaining = current_turn(interview)
    if remaining is None:
        _finalize(interview)

    db.commit()
    db.refresh(interview)
    return get_interview(db, interview.id, interview.candidate_id)


def _finalize(interview: VoiceInterview) -> None:
    turns = sorted(interview.turns, key=lambda t: t.turn_index)
    total = sum(t.max_marks or MARKS_PER_TURN for t in turns)
    awarded = sum(int(t.awarded_marks or 0) for t in turns)
    interview.score = float(awarded)
    interview.percentage = round((awarded / total) * 100, 2) if total else 0.0
    interview.status = VoiceInterviewStatus.completed
    interview.completed_at = utcnow()
    interview.summary = (
        f"Voice interview complete: {awarded}/{total} marks "
        f"({interview.percentage}%)."
    )


def cancel_interview(db: Session, interview: VoiceInterview) -> VoiceInterview:
    if interview.status == VoiceInterviewStatus.completed:
        raise ValueError("Completed interviews cannot be cancelled.")
    interview.status = VoiceInterviewStatus.failed
    interview.summary = "Cancelled by candidate."
    interview.completed_at = utcnow()
    db.commit()
    db.refresh(interview)
    return interview

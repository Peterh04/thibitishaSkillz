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
SUPPORTED_LANGUAGES = frozenset({"sw", "en"})


def normalize_interview_language(language: str | None) -> str:
    lang = (language or "sw").strip().lower()
    if lang in {"sw", "swahili", "kiswahili"}:
        return "sw"
    if lang in {"en", "eng", "english"}:
        return "en"
    raise ValueError("language must be 'sw' (Kiswahili) or 'en' (English).")


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

    has_text = bool((cv.extracted_text or "").strip())
    has_analysis = bool(cv.analysis_result and isinstance(cv.analysis_result, dict))

    if not has_text and not has_analysis:
        if cv.analysis_status == AnalysisStatus.failed:
            raise ValueError("Your latest CV analysis failed and no text could be extracted. Upload a clearer PDF or DOCX file first.")
        raise ValueError("Wait for CV text extraction to finish, then start the voice interview.")
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
    language: str | None = "sw",
) -> VoiceInterview:
    if not settings.gemini_configured:
        raise RuntimeError("Gemini is not configured. Set GEMINI_API_KEY in backend/.env.")

    lang = normalize_interview_language(language)

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
        return (
            db.query(VoiceInterview)
            .options(joinedload(VoiceInterview.turns), joinedload(VoiceInterview.skill))
            .filter(VoiceInterview.id == existing.id)
            .one()
        )

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
            language=lang,
        )
    except GeminiError as exc:
        raise RuntimeError(str(exc)) from exc

    interview = VoiceInterview(
        candidate_id=candidate.id,
        skill_id=skill.id if skill else None,
        cv_id=cv.id,
        language=lang,
        status=VoiceInterviewStatus.in_progress,
        total_questions=len(questions),
        started_at=utcnow(),
    )
    db.add(interview)
    db.flush()

    for index, item in enumerate(questions):
        spoken = item["question_en"] if lang == "en" else item["question_sw"]
        db.add(
            VoiceInterviewTurn(
                interview_id=interview.id,
                turn_index=index,
                question_text=spoken,
                question_text_en=item.get("question_en"),
                max_marks=MARKS_PER_TURN,
                # stash bilingual expected answers until scored
                feedback=json.dumps(
                    {
                        "question_sw": item.get("question_sw", ""),
                        "question_en": item.get("question_en", ""),
                        "expected_answer_sw": item.get("expected_answer_sw", ""),
                        "expected_answer_en": item.get("expected_answer_en", ""),
                    },
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


def _meta_from_feedback(turn: VoiceInterviewTurn) -> dict:
    raw = turn.feedback or ""
    try:
        data = json.loads(raw)
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}


def _expected_from_feedback(turn: VoiceInterviewTurn, language: str) -> str:
    data = _meta_from_feedback(turn)
    if language == "en":
        return str(data.get("expected_answer_en") or data.get("expected_answer_sw") or "")
    return str(data.get("expected_answer_sw") or data.get("expected_answer_en") or "")


def synthesize_question_audio(db: Session, interview: VoiceInterview, turn: VoiceInterviewTurn) -> Path:
    """Billable Msingi TTS — call only when the client requests question audio."""
    if not settings.msingi_configured:
        raise RuntimeError("MsingiAI is not configured. Set MSINGI_API_KEY in backend/.env.")
    if turn.question_audio_path:
        existing = Path(turn.question_audio_path)
        if existing.is_file():
            return existing

    lang = normalize_interview_language(interview.language)
    try:
        audio = create_speech(turn.question_text, language=lang)
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
    lang = normalize_interview_language(interview.language)
    meta = _meta_from_feedback(turn)
    expected = _expected_from_feedback(turn, lang)

    try:
        evaluation = evaluate_voice_answer(
            question_text=turn.question_text,
            expected_answer=expected,
            transcript=transcript or "(empty)",
            language=lang,
            max_marks=turn.max_marks or MARKS_PER_TURN,
        )
    except GeminiError as exc:
        raise RuntimeError(str(exc)) from exc

    turn.awarded_marks = int(evaluation["awarded_marks"])
    turn.feedback = json.dumps(
        {
            "feedback_sw": evaluation.get("feedback_sw", ""),
            "feedback_en": evaluation.get("feedback_en", ""),
            "question_sw": meta.get("question_sw", ""),
            "question_en": meta.get("question_en") or turn.question_text_en or "",
            "expected_answer_sw": meta.get("expected_answer_sw", ""),
            "expected_answer_en": meta.get("expected_answer_en", ""),
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

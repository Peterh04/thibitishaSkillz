"""Spoken interviewer after CV upload (Gemini + MsingiAI)."""

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from backend.config import settings
from backend.dependencies import get_db, require_roles
from backend.models import User, UserRole, VoiceInterviewStatus
from backend.schema import (
    MessageResponse,
    StartVoiceInterviewRequest,
    VoiceInterviewSummary,
    VoiceInterviewTurnPublic,
)
from backend.services import voice_interview_service as voice_svc

router = APIRouter(prefix="/api", tags=["Voice Interviews"])


def _feedback_for_client(raw: str | None, *, completed: bool) -> str | None:
    if not raw:
        return None
    try:
        import json

        data = json.loads(raw)
        if isinstance(data, dict):
            if "expected_answer_sw" in data and "feedback_sw" not in data and not completed:
                return None
            sw = data.get("feedback_sw") or ""
            en = data.get("feedback_en") or ""
            if sw and en:
                return f"{sw} / {en}"
            return sw or en or None
    except Exception:
        pass
    return raw if completed else None


def _turn_out(turn, *, completed: bool) -> VoiceInterviewTurnPublic:
    return VoiceInterviewTurnPublic(
        id=turn.id,
        turn_index=turn.turn_index,
        question_text=turn.question_text,
        question_text_en=turn.question_text_en,
        has_question_audio=bool(turn.question_audio_path),
        answered=turn.answered_at is not None,
        transcript=turn.transcript if turn.answered_at else None,
        awarded_marks=turn.awarded_marks if turn.answered_at else None,
        max_marks=turn.max_marks,
        feedback=_feedback_for_client(turn.feedback, completed=completed),
        answered_at=turn.answered_at,
    )


def _summary(interview) -> VoiceInterviewSummary:
    completed = interview.status == VoiceInterviewStatus.completed
    ordered = sorted(interview.turns, key=lambda t: t.turn_index)
    current = voice_svc.current_turn(interview)
    return VoiceInterviewSummary(
        id=interview.id,
        skill_id=interview.skill_id,
        skill_name=interview.skill.name if interview.skill else None,
        cv_id=interview.cv_id,
        language=interview.language,
        status=interview.status,
        total_questions=interview.total_questions,
        current_turn_index=current.turn_index if current else None,
        score=interview.score,
        percentage=interview.percentage,
        summary=interview.summary,
        started_at=interview.started_at,
        completed_at=interview.completed_at,
        turns=[_turn_out(t, completed=completed) for t in ordered],
    )


@router.post(
    "/voice-interviews/start",
    response_model=VoiceInterviewSummary,
    status_code=status.HTTP_201_CREATED,
)
def start_voice_interview(
    payload: StartVoiceInterviewRequest,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    try:
        interview = voice_svc.start_interview(
            db,
            candidate=current_user,
            skill_id=payload.skill_id,
            cv_id=payload.cv_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return _summary(interview)


@router.get("/voice-interviews/mine", response_model=list[VoiceInterviewSummary])
def list_my_voice_interviews(
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    from backend.models import VoiceInterview
    from sqlalchemy.orm import joinedload

    rows = (
        db.query(VoiceInterview)
        .options(joinedload(VoiceInterview.turns), joinedload(VoiceInterview.skill))
        .filter(VoiceInterview.candidate_id == current_user.id)
        .order_by(VoiceInterview.created_at.desc())
        .limit(20)
        .all()
    )
    return [_summary(row) for row in rows]


@router.get("/voice-interviews/{interview_id}", response_model=VoiceInterviewSummary)
def get_voice_interview(
    interview_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    try:
        interview = voice_svc.get_interview(db, interview_id, current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    return _summary(interview)


@router.get("/voice-interviews/{interview_id}/current-question", response_model=VoiceInterviewTurnPublic)
def get_current_question(
    interview_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    try:
        interview = voice_svc.get_interview(db, interview_id, current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    turn = voice_svc.current_turn(interview)
    if turn is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No unanswered question.")
    return _turn_out(turn, completed=False)


@router.get("/voice-interviews/{interview_id}/turns/{turn_index}/audio")
def get_question_audio(
    interview_id: int,
    turn_index: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    """Synthesize (or return cached) question WAV via MsingiAI — billable on first request."""
    if not settings.msingi_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MsingiAI is not configured.",
        )
    try:
        interview = voice_svc.get_interview(db, interview_id, current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    turn = next((t for t in interview.turns if t.turn_index == turn_index), None)
    if turn is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Turn not found.")
    try:
        path = voice_svc.synthesize_question_audio(db, interview, turn)
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return FileResponse(path, media_type="audio/wav", filename=Path(path).name)


@router.post("/voice-interviews/{interview_id}/answer", response_model=VoiceInterviewSummary)
async def submit_voice_answer(
    interview_id: int,
    audio: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    """Transcribe answer with MsingiAI and score with Gemini — billable STT."""
    try:
        interview = voice_svc.get_interview(db, interview_id, current_user.id)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc

    content = await audio.read()
    try:
        updated = voice_svc.submit_answer_audio(
            db,
            interview,
            content=content,
            filename=audio.filename or "answer.wav",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc
    return _summary(updated)


@router.post("/voice-interviews/{interview_id}/cancel", response_model=MessageResponse)
def cancel_voice_interview(
    interview_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    try:
        interview = voice_svc.get_interview(db, interview_id, current_user.id)
        voice_svc.cancel_interview(db, interview)
    except LookupError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return MessageResponse(message="Voice interview cancelled.")

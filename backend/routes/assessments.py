"""Skill assessments and verified results."""

from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from backend.config import settings
from backend.dependencies import get_db, get_optional_user, require_roles
from backend.models import (
    Assessment,
    AssessmentQuestion,
    AssessmentStatus,
    CandidateSkill,
    CandidateVerificationStatus,
    QuestionType,
    Skill,
    SkillVerification,
    User,
    UserRole,
    VerificationResultStatus,
)
from backend.routes.users import _verification_out, can_view_private_candidate
from backend.schema import (
    AssessmentResult,
    AssessmentSummary,
    MessageResponse,
    QuestionPublic,
    QuestionResult,
    StartAssessmentRequest,
    SubmitAssessmentRequest,
    VerificationOut,
)
from backend.services.assessment_service import marks_for, score_submission
from backend.services.gemini_service import GeminiError, generate_questions
from backend.utils import utcnow

router = APIRouter(prefix="/api", tags=["Assessments"])


def _summary(assessment: Assessment, verification: SkillVerification | None = None) -> AssessmentSummary:
    passed = None
    level = verification.verification_level if verification else None
    if assessment.status == AssessmentStatus.completed and assessment.percentage is not None:
        passed = assessment.percentage >= settings.PASS_PERCENTAGE
    return AssessmentSummary(
        id=assessment.id,
        skill_id=assessment.skill_id,
        skill_name=assessment.skill.name if assessment.skill else "",
        difficulty_level=assessment.difficulty_level,
        status=assessment.status,
        total_questions=assessment.total_questions,
        total_marks=assessment.total_marks,
        score=assessment.score,
        percentage=assessment.percentage,
        passed=passed,
        verification_level=level,
        started_at=assessment.started_at,
        completed_at=assessment.completed_at,
    )


def _own_assessment(db: Session, assessment_id: int, user: User) -> Assessment:
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.skill))
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if assessment is None or assessment.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    return assessment


@router.post("/assessments/start", response_model=AssessmentSummary, status_code=status.HTTP_201_CREATED)
def start_assessment(
    payload: StartAssessmentRequest,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    skill = db.query(Skill).filter(Skill.id == payload.skill_id).first()
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    link = (
        db.query(CandidateSkill)
        .filter(CandidateSkill.candidate_id == current_user.id, CandidateSkill.skill_id == skill.id)
        .first()
    )
    if link is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add this skill to your profile before starting an assessment",
        )
    existing = (
        db.query(Assessment)
        .filter(
            Assessment.candidate_id == current_user.id,
            Assessment.skill_id == skill.id,
            Assessment.status.in_([AssessmentStatus.pending, AssessmentStatus.in_progress]),
        )
        .first()
    )
    if existing:
        if payload.force_restart or (existing.total_questions or 0) == 0:
            db.delete(existing)
            db.commit()
        else:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You already have an open assessment for this skill (id {existing.id})",
            )

    start_of_day = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    started_today = (
        db.query(Assessment)
        .filter(Assessment.candidate_id == current_user.id, Assessment.started_at >= start_of_day)
        .count()
    )
    if started_today >= settings.MAX_ASSESSMENTS_PER_DAY:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"You can start up to {settings.MAX_ASSESSMENTS_PER_DAY} assessments per day",
        )

    assessment = Assessment(
        candidate_id=current_user.id,
        skill_id=skill.id,
        difficulty_level=payload.difficulty_level,
        status=AssessmentStatus.pending,
        started_at=utcnow(),
        total_questions=0,
        total_marks=0,
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    try:
        generated = generate_questions(
            skill.name,
            skill.description or "",
            payload.difficulty_level.value,
            settings.QUESTIONS_PER_ASSESSMENT,
        )
    except GeminiError as exc:
        db.delete(assessment)
        db.commit()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))

    total_marks = 0
    for item in generated:
        question_type = QuestionType(item["question_type"])
        marks = marks_for(item["question_type"])
        total_marks += marks
        db.add(
            AssessmentQuestion(
                assessment_id=assessment.id,
                question_text=item["question_text"],
                question_type=question_type,
                options=item["options"],
                correct_answer=item["correct_answer"],
                marks=marks,
                difficulty=payload.difficulty_level,
                explanation=item["explanation"],
            )
        )
    assessment.total_questions = len(generated)
    assessment.total_marks = total_marks
    assessment.status = AssessmentStatus.in_progress
    link.verification_status = CandidateVerificationStatus.in_progress
    db.commit()
    db.refresh(assessment)
    assessment.skill = skill
    return _summary(assessment)


@router.get("/assessments/my-assessments", response_model=list[AssessmentSummary])
def my_assessments(
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(Assessment)
        .options(joinedload(Assessment.skill))
        .filter(Assessment.candidate_id == current_user.id)
        .order_by(Assessment.started_at.desc())
        .all()
    )
    verifications = {
        row.assessment_id: row
        for row in db.query(SkillVerification).filter(SkillVerification.candidate_id == current_user.id).all()
    }
    return [_summary(row, verifications.get(row.id)) for row in rows]


@router.get("/assessments/{assessment_id}", response_model=AssessmentSummary)
def get_assessment(
    assessment_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    assessment = _own_assessment(db, assessment_id, current_user)
    verification = (
        db.query(SkillVerification).filter(SkillVerification.assessment_id == assessment.id).first()
    )
    return _summary(assessment, verification)


@router.get("/assessments/{assessment_id}/questions", response_model=list[QuestionPublic])
def get_questions(
    assessment_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    assessment = _own_assessment(db, assessment_id, current_user)
    if assessment.status == AssessmentStatus.pending:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Questions are not ready yet")
    questions = (
        db.query(AssessmentQuestion)
        .filter(AssessmentQuestion.assessment_id == assessment.id)
        .order_by(AssessmentQuestion.id.asc())
        .all()
    )
    return [
        QuestionPublic(
            id=question.id,
            question_text=question.question_text,
            question_type=question.question_type,
            options=question.options,
            marks=question.marks,
            difficulty=question.difficulty,
        )
        for question in questions
    ]


@router.get("/assessments/{assessment_id}/questions/{question_id}/audio")
def get_question_audio(
    assessment_id: int,
    question_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    """Synthesize (or return cached) question audio WAV via MsingiAI TTS.
    Serves spoken questions for anti-copying proctoring and accessibility.
    """
    assessment = _own_assessment(db, assessment_id, current_user)
    question = (
        db.query(AssessmentQuestion)
        .filter(AssessmentQuestion.id == question_id, AssessmentQuestion.assessment_id == assessment.id)
        .first()
    )
    if question is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Question not found")

    cache_dir = settings.voice_upload_path / f"assessment_{assessment.id}"
    cache_dir.mkdir(parents=True, exist_ok=True)
    audio_path = cache_dir / f"q_{question.id}.wav"

    if audio_path.is_file():
        return FileResponse(audio_path, media_type="audio/wav", filename=f"question_{question.id}.wav")

    if not settings.msingi_configured:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="MsingiAI is not configured. Set MSINGI_API_KEY in backend/.env.",
        )

    try:
        from backend.services.msingi_service import MsingiError, create_speech

        audio_bytes = create_speech(question.question_text)
        audio_path.write_bytes(audio_bytes)
    except MsingiError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    return FileResponse(audio_path, media_type="audio/wav", filename=f"question_{question.id}.wav")


@router.post("/assessments/{assessment_id}/submit", response_model=AssessmentResult)
def submit_assessment(
    assessment_id: int,
    payload: SubmitAssessmentRequest,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    assessment = _own_assessment(db, assessment_id, current_user)
    if assessment.status != AssessmentStatus.in_progress:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This assessment is not open for submission")
    questions = (
        db.query(AssessmentQuestion)
        .filter(AssessmentQuestion.assessment_id == assessment.id)
        .all()
    )
    expected_ids = {question.id for question in questions}
    provided = {answer.question_id: answer.candidate_answer for answer in payload.answers}
    if set(provided) != expected_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit one answer for every question, and only for questions in this assessment",
        )
    try:
        score_submission(db, assessment, provided)
    except GeminiError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    try:
        from backend.config import settings as app_settings
        from backend.services.notification_service import notify_assessment_completed

        db.refresh(assessment)
        percentage = float(assessment.percentage or 0)
        notify_assessment_completed(
            db,
            current_user,
            skill_name=assessment.skill.name if assessment.skill else "skill",
            percentage=percentage,
            passed=percentage >= app_settings.PASS_PERCENTAGE,
            assessment_id=assessment.id,
        )
    except Exception:
        import logging

        logging.getLogger("thibitisha.notifications").exception("Assessment SMS notify failed")
    return _result(db, assessment)


@router.get("/assessments/{assessment_id}/results", response_model=AssessmentResult)
def assessment_results(
    assessment_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker, UserRole.admin)),
    db: Session = Depends(get_db),
):
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.skill))
        .filter(Assessment.id == assessment_id)
        .first()
    )
    if assessment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if current_user.role != UserRole.admin and assessment.candidate_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment not found")
    if assessment.status != AssessmentStatus.completed:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Results are available after you submit the assessment")
    return _result(db, assessment)


def _result(db: Session, assessment: Assessment) -> AssessmentResult:
    assessment = (
        db.query(Assessment)
        .options(joinedload(Assessment.skill), joinedload(Assessment.answers))
        .filter(Assessment.id == assessment.id)
        .first()
    )
    questions = (
        db.query(AssessmentQuestion)
        .filter(AssessmentQuestion.assessment_id == assessment.id)
        .order_by(AssessmentQuestion.id.asc())
        .all()
    )
    answers = {answer.question_id: answer for answer in assessment.answers}
    verification = db.query(SkillVerification).filter(SkillVerification.assessment_id == assessment.id).first()
    summary = _summary(assessment, verification)
    return AssessmentResult(
        **summary.model_dump(),
        questions=[
            QuestionResult(
                id=question.id,
                question_text=question.question_text,
                question_type=question.question_type,
                options=question.options,
                marks=question.marks,
                difficulty=question.difficulty,
                correct_answer=question.correct_answer,
                explanation=question.explanation,
                candidate_answer=answers[question.id].candidate_answer if question.id in answers else None,
                awarded_marks=answers[question.id].awarded_marks if question.id in answers else None,
                is_correct=answers[question.id].is_correct if question.id in answers else None,
                feedback=answers[question.id].feedback if question.id in answers else None,
            )
            for question in questions
        ],
    )


@router.get("/verifications/my-skills", response_model=list[VerificationOut], tags=["Verifications"])
def my_verifications(
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(SkillVerification)
        .options(joinedload(SkillVerification.skill))
        .filter(SkillVerification.candidate_id == current_user.id)
        .order_by(SkillVerification.verified_at.desc())
        .all()
    )
    return [_verification_out(row) for row in rows]


@router.get("/verifications/candidate/{candidate_id}", response_model=list[VerificationOut], tags=["Verifications"])
def candidate_verifications(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_user),
):
    candidate = db.query(User).options(joinedload(User.candidate_profile)).filter(User.id == candidate_id).first()
    if candidate is None or candidate.role != UserRole.job_seeker:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile is not available")
    is_public = bool(candidate.candidate_profile and candidate.candidate_profile.is_public)
    is_owner = current_user is not None and current_user.id == candidate.id
    is_admin = current_user is not None and current_user.role == UserRole.admin
    allowed = is_owner or is_admin or is_public or can_view_private_candidate(db, current_user, candidate.id)
    if not allowed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile is not available")
    rows = (
        db.query(SkillVerification)
        .options(joinedload(SkillVerification.skill))
        .filter(
            SkillVerification.candidate_id == candidate.id,
            SkillVerification.is_current.is_(True),
            SkillVerification.verification_status == VerificationResultStatus.verified,
        )
        .order_by(SkillVerification.score.desc())
        .all()
    )
    return [_verification_out(row) for row in rows]


@router.get("/verifications/{skill_id}", response_model=VerificationOut, tags=["Verifications"])
def my_skill_verification(
    skill_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    row = (
        db.query(SkillVerification)
        .options(joinedload(SkillVerification.skill))
        .filter(
            SkillVerification.candidate_id == current_user.id,
            SkillVerification.skill_id == skill_id,
            SkillVerification.is_current.is_(True),
        )
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You do not have a current verification for this skill")
    return _verification_out(row)

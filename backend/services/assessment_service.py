"""Assessment scoring, verification, and leaderboard ranks.

Objective questions are marked here. Written answers are marked one by one
by Gemini. The final percentage is always the sum of awarded marks.
"""

from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import (
    Assessment,
    AssessmentAnswer,
    AssessmentQuestion,
    AssessmentStatus,
    CandidateProfile,
    CandidateRanking,
    CandidateSkill,
    CandidateVerificationStatus,
    QuestionType,
    SkillLevel,
    SkillVerification,
    VerificationResultStatus,
)
from backend.services.gemini_service import evaluate_answers
from backend.utils import utcnow

LEVEL_WEIGHT = {
    SkillLevel.beginner: 1,
    SkillLevel.intermediate: 2,
    SkillLevel.advanced: 3,
}
RANKING_PERIOD = "all_time"
MARKS_BY_TYPE = {
    QuestionType.multiple_choice: 1,
    QuestionType.text: 2,
    QuestionType.practical: 3,
}


def marks_for(question_type: str) -> int:
    try:
        return MARKS_BY_TYPE[QuestionType(question_type)]
    except ValueError:
        return 1


def mark_multiple_choice(question: AssessmentQuestion, answer: str) -> tuple[int, bool, str]:
    given = (answer or "").strip()
    correct = (question.correct_answer or "").strip()
    options = question.options or []
    if given.lower() == correct.lower():
        return question.marks, True, "Correct."

    if len(given) == 1 and given.isalpha():
        index = ord(given.lower()) - ord("a")
        if 0 <= index < len(options) and options[index].strip().lower() == correct.lower():
            return question.marks, True, "Correct."

    return 0, False, f"Incorrect. The correct answer is: {correct}"


def verification_level(percentage: float, difficulty: SkillLevel) -> SkillLevel | None:
    """Pass mark comes from the score. The level cannot exceed the test difficulty."""
    if percentage < settings.PASS_PERCENTAGE:
        return None
    if percentage >= 85:
        score_level = SkillLevel.advanced
    elif percentage >= 65:
        score_level = SkillLevel.intermediate
    else:
        score_level = SkillLevel.beginner
    if LEVEL_WEIGHT[score_level] > LEVEL_WEIGHT[difficulty]:
        return difficulty
    return score_level


def recompute_skill_ranking(db: Session, skill_id: int) -> None:
    """Rank public candidates from verified scores only."""
    verifications = (
        db.query(SkillVerification)
        .join(CandidateProfile, CandidateProfile.user_id == SkillVerification.candidate_id)
        .filter(
            SkillVerification.skill_id == skill_id,
            SkillVerification.is_current.is_(True),
            SkillVerification.verification_status == VerificationResultStatus.verified,
            CandidateProfile.is_public.is_(True),
        )
        .all()
    )
    verifications.sort(
        key=lambda row: (
            -row.score,
            -LEVEL_WEIGHT.get(row.verification_level, 0),
            row.verified_at or utcnow(),
        )
    )
    db.query(CandidateRanking).filter(
        CandidateRanking.skill_id == skill_id,
        CandidateRanking.ranking_period == RANKING_PERIOD,
    ).delete(synchronize_session=False)
    for position, row in enumerate(verifications, start=1):
        db.add(
            CandidateRanking(
                candidate_id=row.candidate_id,
                skill_id=skill_id,
                score=row.score,
                rank=position,
                ranking_period=RANKING_PERIOD,
                updated_at=utcnow(),
            )
        )


def recompute_candidate_rankings(db: Session, candidate_id: int) -> None:
    skill_ids = [
        row[0]
        for row in db.query(SkillVerification.skill_id)
        .filter(SkillVerification.candidate_id == candidate_id)
        .distinct()
        .all()
    ]
    for skill_id in skill_ids:
        recompute_skill_ranking(db, skill_id)


def _sync_candidate_skill(db: Session, candidate_id: int, skill_id: int) -> None:
    link = (
        db.query(CandidateSkill)
        .filter(CandidateSkill.candidate_id == candidate_id, CandidateSkill.skill_id == skill_id)
        .first()
    )
    if link is None:
        return
    current = (
        db.query(SkillVerification)
        .filter(
            SkillVerification.candidate_id == candidate_id,
            SkillVerification.skill_id == skill_id,
            SkillVerification.is_current.is_(True),
        )
        .first()
    )
    open_assessment = (
        db.query(Assessment)
        .filter(
            Assessment.candidate_id == candidate_id,
            Assessment.skill_id == skill_id,
            Assessment.status.in_([AssessmentStatus.pending, AssessmentStatus.in_progress]),
        )
        .first()
    )
    if open_assessment:
        link.verification_status = CandidateVerificationStatus.in_progress
    elif current:
        link.verification_status = CandidateVerificationStatus.verified
    else:
        link.verification_status = CandidateVerificationStatus.unverified


def record_result(db: Session, assessment: Assessment, percentage: float) -> SkillVerification:
    level = verification_level(percentage, assessment.difficulty_level)
    passed = level is not None
    if passed:
        db.query(SkillVerification).filter(
            SkillVerification.candidate_id == assessment.candidate_id,
            SkillVerification.skill_id == assessment.skill_id,
            SkillVerification.is_current.is_(True),
        ).update({SkillVerification.is_current: False}, synchronize_session=False)

    verification = SkillVerification(
        candidate_id=assessment.candidate_id,
        skill_id=assessment.skill_id,
        assessment_id=assessment.id,
        score=round(percentage, 2),
        verification_level=level,
        verification_status=VerificationResultStatus.verified if passed else VerificationResultStatus.failed,
        is_current=passed,
        verified_at=utcnow(),
    )
    db.add(verification)
    db.flush()
    _sync_candidate_skill(db, assessment.candidate_id, assessment.skill_id)
    recompute_skill_ranking(db, assessment.skill_id)
    return verification


def score_submission(db: Session, assessment: Assessment, answers_by_question: dict[int, str]) -> Assessment:
    """Mark every question, store answers, and save the verification result."""
    questions = (
        db.query(AssessmentQuestion)
        .filter(AssessmentQuestion.assessment_id == assessment.id)
        .order_by(AssessmentQuestion.id.asc())
        .all()
    )
    written = []
    prepared = []
    for question in questions:
        answer = answers_by_question[question.id].strip()
        if question.question_type == QuestionType.multiple_choice:
            awarded, correct, feedback = mark_multiple_choice(question, answer)
            prepared.append((question, answer, awarded, correct, feedback))
        else:
            written.append(
                {
                    "question_id": question.id,
                    "question_text": question.question_text,
                    "expected_answer": question.correct_answer,
                    "max_marks": question.marks,
                    "candidate_answer": answer,
                }
            )
            prepared.append((question, answer, None, None, None))

    evaluations = evaluate_answers(written)
    total_awarded = 0
    now = utcnow()
    for question, answer, awarded, correct, feedback in prepared:
        if awarded is None:
            result = evaluations[question.id]
            awarded = result["awarded_marks"]
            correct = awarded == question.marks
            feedback = result["feedback"]
        total_awarded += awarded
        db.add(
            AssessmentAnswer(
                assessment_id=assessment.id,
                question_id=question.id,
                candidate_answer=answer,
                awarded_marks=awarded,
                is_correct=correct,
                feedback=feedback,
                submitted_at=now,
            )
        )

    percentage = 0.0
    if assessment.total_marks:
        percentage = round((total_awarded / assessment.total_marks) * 100, 2)
    assessment.score = total_awarded
    assessment.percentage = percentage
    assessment.status = AssessmentStatus.completed
    assessment.completed_at = now
    record_result(db, assessment, percentage)
    db.commit()
    db.refresh(assessment)
    return assessment

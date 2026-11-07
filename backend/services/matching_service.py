"""Match verified candidate skills against a job's required skills."""

from sqlalchemy.orm import Session, joinedload

from backend.models import (
    CandidateProfile,
    Job,
    JobSkill,
    SkillVerification,
    User,
    VerificationResultStatus,
)


def _breakdown(job_skills: list[JobSkill], scores: dict[int, float]) -> tuple[list[dict], float, bool]:
    if not job_skills:
        return [], 0.0, False
    total_weight = sum(item.importance_weight for item in job_skills) or 1
    earned = 0.0
    rows = []
    meets_all = True
    for item in job_skills:
        verified_score = scores.get(item.skill_id)
        met = verified_score is not None and verified_score >= item.minimum_score
        if met:
            earned += item.importance_weight * (verified_score / 100)
        else:
            meets_all = False
        rows.append(
            {
                "skill_id": item.skill_id,
                "skill_name": item.skill.name if item.skill else "",
                "minimum_score": item.minimum_score,
                "importance_weight": item.importance_weight,
                "verified_score": verified_score,
                "met_requirement": met,
            }
        )
    match_score = round((earned / total_weight) * 100, 2)
    return rows, match_score, meets_all


def match_candidate_to_job(db: Session, job: Job, candidate_id: int) -> dict:
    job_skills = (
        db.query(JobSkill)
        .options(joinedload(JobSkill.skill))
        .filter(JobSkill.job_id == job.id)
        .all()
    )
    verifications = (
        db.query(SkillVerification)
        .filter(
            SkillVerification.candidate_id == candidate_id,
            SkillVerification.is_current.is_(True),
            SkillVerification.verification_status == VerificationResultStatus.verified,
        )
        .all()
    )
    if not job_skills:
        return {"match_score": None, "meets_all_requirements": False, "skills": []}
    scores = {row.skill_id: row.score for row in verifications}
    skills, match_score, meets_all = _breakdown(job_skills, scores)
    return {
        "match_score": match_score,
        "meets_all_requirements": meets_all and bool(job_skills),
        "skills": skills,
    }


def rank_public_candidates(db: Session, job: Job) -> list[dict]:
    """Rank public candidates by verified-skill match. Unverified skills count as missing."""
    job_skills = (
        db.query(JobSkill)
        .options(joinedload(JobSkill.skill))
        .filter(JobSkill.job_id == job.id)
        .all()
    )
    if not job_skills:
        return []

    required_ids = [item.skill_id for item in job_skills]
    verifications = (
        db.query(SkillVerification)
        .join(CandidateProfile, CandidateProfile.user_id == SkillVerification.candidate_id)
        .filter(
            SkillVerification.skill_id.in_(required_ids),
            SkillVerification.is_current.is_(True),
            SkillVerification.verification_status == VerificationResultStatus.verified,
            CandidateProfile.is_public.is_(True),
        )
        .all()
    )
    by_candidate: dict[int, dict[int, float]] = {}
    for row in verifications:
        by_candidate.setdefault(row.candidate_id, {})[row.skill_id] = row.score

    if not by_candidate:
        return []

    users = db.query(User).filter(User.id.in_(by_candidate.keys()), User.is_active.is_(True)).all()
    ranked = []
    for user in users:
        skills, match_score, meets_all = _breakdown(job_skills, by_candidate.get(user.id, {}))
        ranked.append(
            {
                "candidate_id": user.id,
                "full_name": user.full_name,
                "location": user.location,
                "match_score": match_score,
                "meets_all_requirements": meets_all,
                "skills": skills,
            }
        )
    ranked.sort(key=lambda row: (-row["match_score"], row["full_name"].lower()))
    return ranked

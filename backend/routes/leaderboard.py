"""Public leaderboard built from verified scores."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.dependencies import get_db
from backend.models import CandidateProfile, CandidateRanking, Skill, SkillVerification, User
from backend.schema import LeaderboardEntry, LeaderboardResponse
from backend.services.assessment_service import RANKING_PERIOD

router = APIRouter(prefix="/api/leaderboard", tags=["Leaderboard"])


def _query(db: Session, skill_id: int | None = None, category: str | None = None):
    query = (
        db.query(CandidateRanking, User, Skill, SkillVerification)
        .join(User, User.id == CandidateRanking.candidate_id)
        .join(Skill, Skill.id == CandidateRanking.skill_id)
        .join(
            CandidateProfile,
            CandidateProfile.user_id == CandidateRanking.candidate_id,
        )
        .join(
            SkillVerification,
            (SkillVerification.candidate_id == CandidateRanking.candidate_id)
            & (SkillVerification.skill_id == CandidateRanking.skill_id)
            & (SkillVerification.is_current.is_(True)),
        )
        .filter(
            CandidateRanking.ranking_period == RANKING_PERIOD,
            CandidateProfile.is_public.is_(True),
            User.is_active.is_(True),
        )
    )
    if skill_id is not None:
        query = query.filter(CandidateRanking.skill_id == skill_id)
    if category:
        query = query.filter(Skill.category == category.strip())
    return query.order_by(Skill.name.asc(), CandidateRanking.rank.asc())


def _entry(ranking: CandidateRanking, user: User, skill: Skill, verification: SkillVerification) -> LeaderboardEntry:
    return LeaderboardEntry(
        rank=ranking.rank,
        candidate_id=user.id,
        full_name=user.full_name,
        location=user.location,
        skill_id=skill.id,
        skill_name=skill.name,
        category=skill.category,
        score=ranking.score,
        verification_level=verification.verification_level,
        ranking_period=ranking.ranking_period,
    )


def _ensure_skill(db: Session, skill_id: int) -> Skill:
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill


@router.get("", response_model=LeaderboardResponse)
def leaderboard(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    skill_id: int | None = None,
    category: str | None = None,
    db: Session = Depends(get_db),
):
    if skill_id is not None:
        _ensure_skill(db, skill_id)
    query = _query(db, skill_id, category)
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return LeaderboardResponse(
        items=[_entry(*row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{skill_id}/top", response_model=LeaderboardResponse)
def leaderboard_top(
    skill_id: int,
    limit: int = Query(default=10, ge=1, le=50),
    db: Session = Depends(get_db),
):
    _ensure_skill(db, skill_id)
    query = _query(db, skill_id)
    rows = query.limit(limit).all()
    return LeaderboardResponse(
        items=[_entry(*row) for row in rows],
        total=query.count(),
        page=1,
        page_size=limit,
    )


@router.get("/{skill_id}", response_model=LeaderboardResponse)
def leaderboard_for_skill(
    skill_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    _ensure_skill(db, skill_id)
    query = _query(db, skill_id)
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return LeaderboardResponse(
        items=[_entry(*row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )

"""Skill catalog and a candidate's own skills."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from backend.dependencies import get_db, require_roles
from backend.models import (
    Assessment,
    CandidateSkill,
    CandidateVerificationStatus,
    JobSkill,
    Skill,
    SkillSource,
    SkillVerification,
    User,
    UserRole,
    VerificationResultStatus,
)
from backend.schema import CandidateSkillCreate, CandidateSkillOut, MessageResponse, SkillCreate, SkillOut, SkillUpdate
from backend.seed import get_or_create_skill
from backend.services.assessment_service import recompute_skill_ranking
from backend.utils import skill_name_key, utcnow

router = APIRouter(prefix="/api/skills", tags=["Skills"])


def _candidate_skill_out(link: CandidateSkill) -> CandidateSkillOut:
    return CandidateSkillOut(
        id=link.id,
        skill_id=link.skill_id,
        name=link.skill.name,
        category=link.skill.category,
        description=link.skill.description,
        source=link.source,
        claimed_level=link.claimed_level,
        verification_status=link.verification_status,
        created_at=link.created_at,
    )


def _restore_verification(db: Session, link: CandidateSkill) -> None:
    current = (
        db.query(SkillVerification)
        .filter(
            SkillVerification.candidate_id == link.candidate_id,
            SkillVerification.skill_id == link.skill_id,
            SkillVerification.verification_status == VerificationResultStatus.verified,
        )
        .order_by(SkillVerification.verified_at.desc())
        .first()
    )
    if current is None:
        link.verification_status = CandidateVerificationStatus.unverified
        return
    db.query(SkillVerification).filter(
        SkillVerification.candidate_id == link.candidate_id,
        SkillVerification.skill_id == link.skill_id,
        SkillVerification.is_current.is_(True),
    ).update({SkillVerification.is_current: False}, synchronize_session=False)
    current.is_current = True
    link.verification_status = CandidateVerificationStatus.verified


@router.get("", response_model=list[SkillOut])
def list_skills(db: Session = Depends(get_db)):
    return db.query(Skill).order_by(Skill.category.asc(), Skill.name.asc()).all()


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)):
    rows = db.query(Skill.category).distinct().order_by(Skill.category.asc()).all()
    return [row[0] for row in rows]


@router.get("/my-skills", response_model=list[CandidateSkillOut])
def my_skills(
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    links = (
        db.query(CandidateSkill)
        .options(joinedload(CandidateSkill.skill))
        .filter(CandidateSkill.candidate_id == current_user.id)
        .order_by(CandidateSkill.created_at.desc())
        .all()
    )
    return [_candidate_skill_out(link) for link in links]


@router.post("/my-skills", response_model=CandidateSkillOut, status_code=status.HTTP_201_CREATED)
def add_my_skill(
    payload: CandidateSkillCreate,
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
    if link:
        if payload.claimed_level is not None:
            link.claimed_level = payload.claimed_level
        db.commit()
        db.refresh(link)
        return _candidate_skill_out(link)

    link = CandidateSkill(
        candidate_id=current_user.id,
        skill_id=skill.id,
        source=SkillSource.manually_added,
        claimed_level=payload.claimed_level,
        verification_status=CandidateVerificationStatus.unverified,
    )
    db.add(link)
    db.flush()
    _restore_verification(db, link)
    if link.verification_status == CandidateVerificationStatus.verified:
        recompute_skill_ranking(db, skill.id)
    db.commit()
    db.refresh(link)
    return _candidate_skill_out(link)


@router.delete("/my-skills/{skill_id}", response_model=MessageResponse)
def remove_my_skill(
    skill_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    link = (
        db.query(CandidateSkill)
        .filter(CandidateSkill.candidate_id == current_user.id, CandidateSkill.skill_id == skill_id)
        .first()
    )
    if link is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="That skill is not on your profile")
    db.query(SkillVerification).filter(
        SkillVerification.candidate_id == current_user.id,
        SkillVerification.skill_id == skill_id,
        SkillVerification.is_current.is_(True),
    ).update({SkillVerification.is_current: False}, synchronize_session=False)
    db.delete(link)
    recompute_skill_ranking(db, skill_id)
    db.commit()
    return MessageResponse(message="Skill removed from your profile")


@router.get("/{skill_id}", response_model=SkillOut)
def get_skill(skill_id: int, db: Session = Depends(get_db)):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    return skill


@router.post("", response_model=SkillOut, status_code=status.HTTP_201_CREATED)
def create_skill(
    payload: SkillCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    existing = db.query(Skill).filter(Skill.name_key == skill_name_key(payload.name)).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This skill already exists")
    skill = get_or_create_skill(db, payload.name, payload.category, payload.description)
    skill.created_at = utcnow()
    db.commit()
    db.refresh(skill)
    return skill


@router.put("/{skill_id}", response_model=SkillOut)
def update_skill(
    skill_id: int,
    payload: SkillUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    data = payload.model_dump(exclude_unset=True)
    if "name" in data and data["name"]:
        key = skill_name_key(data["name"])
        taken = db.query(Skill).filter(Skill.name_key == key, Skill.id != skill.id).first()
        if taken:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This skill already exists")
        skill.name = data["name"]
        skill.name_key = key
    if "description" in data:
        skill.description = data["description"]
    if "category" in data and data["category"]:
        skill.category = data["category"]
    db.commit()
    db.refresh(skill)
    return skill


@router.delete("/{skill_id}", response_model=MessageResponse)
def delete_skill(
    skill_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    skill = db.query(Skill).filter(Skill.id == skill_id).first()
    if skill is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Skill not found")
    in_use = (
        db.query(CandidateSkill).filter(CandidateSkill.skill_id == skill_id).first()
        or db.query(JobSkill).filter(JobSkill.skill_id == skill_id).first()
        or db.query(Assessment).filter(Assessment.skill_id == skill_id).first()
    )
    if in_use:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This skill is in use and cannot be deleted")
    db.delete(skill)
    db.commit()
    return MessageResponse(message="Skill deleted")

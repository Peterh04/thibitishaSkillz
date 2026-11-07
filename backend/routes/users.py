"""User accounts, public profiles, and admin user management."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from backend.dependencies import get_current_user, get_db, get_optional_user, require_roles
from backend.models import (
    CandidateProfile,
    EmployerProfile,
    Job,
    JobApplication,
    SkillVerification,
    User,
    UserRole,
    VerificationResultStatus,
)
from backend.routes.auth import me_response
from backend.schema import (
    AdminSummary,
    AdminUserUpdate,
    CandidateProfileOut,
    CandidateProfileUpdate,
    EmployerProfileOut,
    MeResponse,
    MessageResponse,
    Page,
    ProfileResponse,
    PublicUserOut,
    UserOut,
    UserUpdateRequest,
    VerificationOut,
)
from backend.services.assessment_service import recompute_candidate_rankings
from backend.utils import utcnow

router = APIRouter(prefix="/api", tags=["Users"])


def _verification_out(row: SkillVerification) -> VerificationOut:
    return VerificationOut(
        id=row.id,
        candidate_id=row.candidate_id,
        skill_id=row.skill_id,
        skill_name=row.skill.name if row.skill else "",
        category=row.skill.category if row.skill else "",
        assessment_id=row.assessment_id,
        score=row.score,
        verification_level=row.verification_level,
        verification_status=row.verification_status,
        is_current=row.is_current,
        verified_at=row.verified_at,
    )


def _load_user(db: Session, user_id: int) -> User | None:
    return (
        db.query(User)
        .options(joinedload(User.candidate_profile), joinedload(User.employer_profile))
        .filter(User.id == user_id)
        .first()
    )


def can_view_private_candidate(db: Session, viewer: User | None, candidate_id: int) -> bool:
    if viewer is None:
        return False
    if viewer.id == candidate_id or viewer.role == UserRole.admin:
        return True
    if viewer.role != UserRole.employer:
        return False
    application = (
        db.query(JobApplication)
        .join(Job, Job.id == JobApplication.job_id)
        .filter(JobApplication.candidate_id == candidate_id, Job.employer_id == viewer.id)
        .first()
    )
    return application is not None


@router.get("/users/me", response_model=MeResponse, tags=["Users"])
def get_my_account(current_user: User = Depends(get_current_user)):
    return me_response(current_user)


@router.put("/users/me", response_model=MeResponse)
def update_my_account(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(current_user, field, value)
    current_user.updated_at = utcnow()
    db.commit()
    db.refresh(current_user)
    return me_response(current_user)


@router.put("/candidates/profile", response_model=CandidateProfileOut, tags=["Candidates"])
def update_candidate_profile(
    payload: CandidateProfileUpdate,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    profile = current_user.candidate_profile
    if profile is None:
        profile = CandidateProfile(user_id=current_user.id, is_public=False)
        db.add(profile)
        db.flush()
    was_public = profile.is_public
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)
    profile.updated_at = utcnow()
    current_user.updated_at = utcnow()
    db.flush()
    if profile.is_public != was_public:
        recompute_candidate_rankings(db, current_user.id)
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/users/{user_id}/profile", response_model=ProfileResponse)
def get_profile(
    user_id: int,
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
    user = _load_user(db, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile is not available")

    is_self = viewer is not None and viewer.id == user.id
    is_admin = viewer is not None and viewer.role == UserRole.admin

    if user.role == UserRole.job_seeker:
        is_public = bool(user.candidate_profile and user.candidate_profile.is_public)
        allowed = is_self or is_admin or is_public or can_view_private_candidate(db, viewer, user.id)
        if not allowed:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile is not available")
        verifications = (
            db.query(SkillVerification)
            .options(joinedload(SkillVerification.skill))
            .filter(
                SkillVerification.candidate_id == user.id,
                SkillVerification.is_current.is_(True),
                SkillVerification.verification_status == VerificationResultStatus.verified,
            )
            .all()
        )
        contact = UserOut.model_validate(user) if is_self or is_admin or can_view_private_candidate(db, viewer, user.id) else None
        if is_public and not (is_self or is_admin or can_view_private_candidate(db, viewer, user.id)):
            contact = None
        return ProfileResponse(
            user=PublicUserOut.model_validate(user),
            candidate_profile=user.candidate_profile,
            verified_skills=[_verification_out(row) for row in verifications],
            contact=contact,
        )

    if user.role == UserRole.employer:
        return ProfileResponse(
            user=PublicUserOut.model_validate(user),
            employer_profile=user.employer_profile,
            contact=UserOut.model_validate(user) if is_self or is_admin else None,
        )

    if not (is_self or is_admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Profile is not available")
    return ProfileResponse(user=PublicUserOut.model_validate(user), contact=UserOut.model_validate(user))


@router.get("/admin/users", response_model=dict, tags=["Admin"])
def list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: UserRole | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles(UserRole.admin)),
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((User.full_name.ilike(like)) | (User.email.ilike(like)))
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return {
        "items": [UserOut.model_validate(user) for user in users],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.patch("/admin/users/{user_id}", response_model=UserOut, tags=["Admin"])
def update_user_status(
    user_id: int,
    payload: AdminUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.id == current_user.id and payload.is_active is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot deactivate your own account")
    if payload.is_active is not None:
        user.is_active = payload.is_active
    if payload.role is not None and payload.role != user.role:
        if user.id == current_user.id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot change your own role")
        user.role = payload.role
        if payload.role == UserRole.job_seeker and user.candidate_profile is None:
            db.add(CandidateProfile(user_id=user.id, is_public=False))
        if payload.role == UserRole.employer and user.employer_profile is None:
            db.add(EmployerProfile(user_id=user.id))
    user.updated_at = utcnow()
    db.commit()
    db.refresh(user)
    return user


@router.get("/admin/summary", response_model=AdminSummary, tags=["Admin"])
def admin_summary(db: Session = Depends(get_db), _: User = Depends(require_roles(UserRole.admin))):
    from backend.models import Assessment, Job as JobModel, Skill

    return AdminSummary(
        users=db.query(User).count(),
        job_seekers=db.query(User).filter(User.role == UserRole.job_seeker).count(),
        employers=db.query(User).filter(User.role == UserRole.employer).count(),
        skills=db.query(Skill).count(),
        jobs=db.query(JobModel).count(),
        applications=db.query(JobApplication).count(),
        assessments=db.query(Assessment).count(),
        verified_skills=db.query(SkillVerification)
        .filter(
            SkillVerification.is_current.is_(True),
            SkillVerification.verification_status == VerificationResultStatus.verified,
        )
        .count(),
    )

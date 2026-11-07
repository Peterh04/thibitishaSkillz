"""Employer profile and employer-managed jobs."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, selectinload

from backend.dependencies import get_db, require_roles
from backend.models import EmployerProfile, Job, JobSkill, JobStatus, User, UserRole
from backend.routes.jobs import job_to_out
from backend.schema import (
    EmployerProfileOut,
    EmployerProfileUpdate,
    JobListResponse,
)
from backend.utils import utcnow

router = APIRouter(prefix="/api/employers", tags=["Employers"])


@router.get("/profile", response_model=EmployerProfileOut)
def get_employer_profile(
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    profile = current_user.employer_profile
    if profile is None:
        profile = EmployerProfile(user_id=current_user.id)
        db.add(profile)
        db.commit()
        db.refresh(profile)
    return profile


@router.put("/profile", response_model=EmployerProfileOut)
def update_employer_profile(
    payload: EmployerProfileUpdate,
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    profile = current_user.employer_profile
    if profile is None:
        profile = EmployerProfile(user_id=current_user.id)
        db.add(profile)
        db.flush()

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(profile, field, value)

    profile.updated_at = utcnow()
    current_user.updated_at = utcnow()
    db.commit()
    db.refresh(profile)
    return profile


@router.get("/my-jobs", response_model=JobListResponse)
def list_my_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status_filter: JobStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
):
    query = (
        db.query(Job)
        .options(
            selectinload(Job.skills).selectinload(JobSkill.skill),
            selectinload(Job.employer).selectinload(User.employer_profile),
        )
        .filter(Job.employer_id == current_user.id)
    )
    if status_filter:
        query = query.filter(Job.status == status_filter)

    total = query.count()
    jobs = (
        query.order_by(Job.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return JobListResponse(
        items=[job_to_out(job) for job in jobs],
        total=total,
        page=page,
        page_size=page_size,
    )


"""Job posts, required skills, and candidate matching."""

from datetime import timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload, selectinload

from backend.dependencies import get_db, get_optional_user, require_roles
from backend.models import (
    EmployerProfile,
    EmploymentType,
    Job,
    JobSkill,
    JobStatus,
    Skill,
    User,
    UserRole,
)
from backend.schema import (
    JobCreate,
    JobListResponse,
    JobOut,
    JobSkillOut,
    JobSkillsRequest,
    JobUpdate,
    MatchListResponse,
    MessageResponse,
)
from backend.services.matching_service import rank_public_candidates
from backend.utils import utcnow

router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


def _naive(value):
    if value is None:
        return None
    if value.tzinfo is not None:
        return value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


def _skill_out(link: JobSkill) -> JobSkillOut:
    return JobSkillOut(
        id=link.id,
        skill_id=link.skill_id,
        skill_name=link.skill.name if link.skill else "",
        category=link.skill.category if link.skill else "",
        minimum_score=link.minimum_score,
        importance_weight=link.importance_weight,
    )


def job_to_out(job: Job) -> JobOut:
    company = None
    if job.employer and job.employer.employer_profile:
        company = job.employer.employer_profile.company_name
    return JobOut(
        id=job.id,
        employer_id=job.employer_id,
        company_name=company,
        title=job.title,
        description=job.description,
        responsibilities=job.responsibilities,
        qualifications=job.qualifications,
        location=job.location,
        employment_type=job.employment_type,
        experience_level=job.experience_level,
        status=job.status,
        application_deadline=_naive(job.application_deadline),
        created_at=job.created_at,
        updated_at=job.updated_at,
        skills=[_skill_out(link) for link in job.skills],
    )


def _load_job(db: Session, job_id: int) -> Job | None:
    return (
        db.query(Job)
        .options(
            joinedload(Job.skills).joinedload(JobSkill.skill),
            joinedload(Job.employer).joinedload(User.employer_profile),
        )
        .filter(Job.id == job_id)
        .first()
    )


def _managed_job(db: Session, job_id: int, user: User) -> Job:
    job = _load_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if user.role != UserRole.admin and job.employer_id != user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only manage your own jobs")
    return job


def _visible_job(db: Session, job_id: int, viewer: User | None) -> Job:
    job = _load_job(db, job_id)
    if job is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    if job.status == JobStatus.published:
        return job
    if viewer and (viewer.role == UserRole.admin or viewer.id == job.employer_id):
        return job
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")


def _require_publishable(db: Session, job: Job) -> None:
    missing = []
    if not job.location:
        missing.append("location")
    if not job.employment_type:
        missing.append("employment type")
    if not job.skills:
        missing.append("at least one required skill")
    profile = db.query(EmployerProfile).filter(EmployerProfile.user_id == job.employer_id).first()
    if profile is None or not profile.company_name:
        missing.append("a company name on the employer profile")
    deadline = _naive(job.application_deadline)
    if deadline and deadline < utcnow():
        missing.append("an application deadline in the future")
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Before publishing, add " + ", ".join(missing),
        )


def _replace_skills(db: Session, job: Job, payload: JobSkillsRequest) -> None:
    skill_ids = [item.skill_id for item in payload.skills]
    if len(skill_ids) != len(set(skill_ids)):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each skill can only be added once")
    found = db.query(Skill).filter(Skill.id.in_(skill_ids)).all()
    if len(found) != len(skill_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more skills do not exist")
    db.query(JobSkill).filter(JobSkill.job_id == job.id).delete(synchronize_session=False)
    for item in payload.skills:
        db.add(
            JobSkill(
                job_id=job.id,
                skill_id=item.skill_id,
                minimum_score=item.minimum_score,
                importance_weight=item.importance_weight,
            )
        )
    job.updated_at = utcnow()


@router.post("", response_model=JobOut, status_code=status.HTTP_201_CREATED)
def create_job(
    payload: JobCreate,
    current_user: User = Depends(require_roles(UserRole.employer)),
    db: Session = Depends(get_db),
):
    job = Job(
        employer_id=current_user.id,
        title=payload.title,
        description=payload.description,
        responsibilities=payload.responsibilities,
        qualifications=payload.qualifications,
        location=payload.location,
        employment_type=payload.employment_type,
        experience_level=payload.experience_level,
        status=JobStatus.draft,
        application_deadline=_naive(payload.application_deadline),
    )
    db.add(job)
    db.flush()
    if payload.skills:
        _replace_skills(db, job, JobSkillsRequest(skills=payload.skills))
        db.flush()
    if payload.status == JobStatus.published:
        _require_publishable(db, job)
        job.status = JobStatus.published
    elif payload.status == JobStatus.closed:
        job.status = JobStatus.closed
    db.commit()
    return job_to_out(_load_job(db, job.id))


@router.get("", response_model=JobListResponse)
def list_jobs(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    q: str | None = None,
    location: str | None = None,
    employment_type: EmploymentType | None = None,
    skill_id: int | None = None,
    status_filter: JobStatus | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db),
    viewer: User | None = Depends(get_optional_user),
):
    query = db.query(Job).options(
        selectinload(Job.skills).selectinload(JobSkill.skill),
        selectinload(Job.employer).selectinload(User.employer_profile),
    )
    if viewer and viewer.role == UserRole.admin and status_filter:
        query = query.filter(Job.status == status_filter)
    else:
        query = query.filter(Job.status == JobStatus.published)
    if q:
        like = f"%{q.strip()}%"
        query = query.filter((Job.title.ilike(like)) | (Job.description.ilike(like)))
    if location:
        query = query.filter(Job.location.ilike(f"%{location.strip()}%"))
    if employment_type:
        query = query.filter(Job.employment_type == employment_type)
    if skill_id:
        query = query.join(JobSkill).filter(JobSkill.skill_id == skill_id)
    total = query.count()
    jobs = query.order_by(Job.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return JobListResponse(
        items=[job_to_out(job) for job in jobs],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: int, db: Session = Depends(get_db), viewer: User | None = Depends(get_optional_user)):
    return job_to_out(_visible_job(db, job_id, viewer))


@router.put("/{job_id}", response_model=JobOut)
def update_job(
    job_id: int,
    payload: JobUpdate,
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    data = payload.model_dump(exclude_unset=True)
    new_status = data.pop("status", None)
    if "application_deadline" in data:
        data["application_deadline"] = _naive(data["application_deadline"])
    for field, value in data.items():
        setattr(job, field, value)
    became_published = False
    if new_status == JobStatus.published:
        _require_publishable(db, job)
        became_published = job.status != JobStatus.published
        job.status = JobStatus.published
    elif new_status is not None:
        job.status = new_status
    job.updated_at = utcnow()
    db.commit()
    if became_published:
        try:
            from backend.services.notification_service import notify_job_published

            notify_job_published(db, current_user, job)
        except Exception:
            import logging

            logging.getLogger("thibitisha.notifications").exception("Job publish SMS notify failed")
    return job_to_out(_load_job(db, job.id))


@router.delete("/{job_id}", response_model=MessageResponse)
def delete_job(
    job_id: int,
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    if job.applications:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This job has applications. Close it instead of deleting it",
        )
    db.delete(job)
    db.commit()
    return MessageResponse(message="Job deleted")


@router.post("/{job_id}/skills", response_model=list[JobSkillOut])
def add_job_skills(
    job_id: int,
    payload: JobSkillsRequest,
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    existing_ids = {link.skill_id for link in job.skills}
    incoming = [item for item in payload.skills if item.skill_id not in existing_ids]
    if len({item.skill_id for item in payload.skills}) != len(payload.skills):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Each skill can only be added once")
    found = db.query(Skill).filter(Skill.id.in_([item.skill_id for item in incoming])).all()
    if len(found) != len(incoming):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more skills do not exist")
    for item in incoming:
        db.add(
            JobSkill(
                job_id=job.id,
                skill_id=item.skill_id,
                minimum_score=item.minimum_score,
                importance_weight=item.importance_weight,
            )
        )
    job.updated_at = utcnow()
    db.commit()
    return [_skill_out(link) for link in _load_job(db, job.id).skills]


@router.get("/{job_id}/skills", response_model=list[JobSkillOut])
def list_job_skills(job_id: int, db: Session = Depends(get_db), viewer: User | None = Depends(get_optional_user)):
    job = _visible_job(db, job_id, viewer)
    return [_skill_out(link) for link in job.skills]


@router.put("/{job_id}/skills", response_model=list[JobSkillOut])
def replace_job_skills(
    job_id: int,
    payload: JobSkillsRequest,
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    _replace_skills(db, job, payload)
    db.commit()
    return [_skill_out(link) for link in _load_job(db, job.id).skills]


def _match_page(job: Job, ranked: list[dict], page: int, page_size: int, qualified_only: bool) -> MatchListResponse:
    if qualified_only:
        ranked = [row for row in ranked if row["meets_all_requirements"]]
    total = len(ranked)
    start = (page - 1) * page_size
    message = None
    if not job.skills:
        message = "Add required skills before matching candidates."
    return MatchListResponse(
        job_id=job.id,
        items=ranked[start : start + page_size],
        total=total,
        page=page,
        page_size=page_size,
        message=message,
    )


@router.get("/{job_id}/candidates", response_model=MatchListResponse)
def qualified_candidates(
    job_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    return _match_page(job, rank_public_candidates(db, job), page, page_size, qualified_only=True)


@router.get("/{job_id}/matches", response_model=MatchListResponse)
def job_matches(
    job_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    return _match_page(job, rank_public_candidates(db, job), page, page_size, qualified_only=False)

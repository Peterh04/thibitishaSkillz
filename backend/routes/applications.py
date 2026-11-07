"""Job applications."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload

from backend.dependencies import get_db, require_roles
from backend.models import ApplicationStatus, Job, JobApplication, JobStatus, User, UserRole
from backend.routes.jobs import _managed_job, _naive
from backend.schema import (
    ApplicationDetail,
    ApplicationListResponse,
    ApplicationOut,
    ApplicationStatusUpdate,
    ApplyRequest,
)
from backend.services.matching_service import match_candidate_to_job
from backend.utils import utcnow

router = APIRouter(prefix="/api", tags=["Applications"])


def _application_out(application: JobApplication) -> ApplicationOut:
    return ApplicationOut(
        id=application.id,
        job_id=application.job_id,
        job_title=application.job.title if application.job else "",
        candidate_id=application.candidate_id,
        candidate_name=application.candidate.full_name if application.candidate else "",
        application_status=application.application_status,
        match_score=application.match_score,
        cover_letter=application.cover_letter,
        applied_at=application.applied_at,
        updated_at=application.updated_at,
    )


def _load_application(db: Session, application_id: int) -> JobApplication | None:
    return (
        db.query(JobApplication)
        .options(
            joinedload(JobApplication.job).joinedload(Job.skills),
            joinedload(JobApplication.candidate),
        )
        .filter(JobApplication.id == application_id)
        .first()
    )


def _can_manage(user: User, application: JobApplication) -> bool:
    if user.role == UserRole.admin:
        return True
    if user.role == UserRole.employer and application.job and application.job.employer_id == user.id:
        return True
    return False


@router.post("/jobs/{job_id}/apply", response_model=ApplicationDetail, status_code=status.HTTP_201_CREATED)
def apply_to_job(
    job_id: int,
    payload: ApplyRequest,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    job = db.query(Job).filter(Job.id == job_id).first()
    if job is None or job.status != JobStatus.published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This job is not open for applications")
    deadline = _naive(job.application_deadline)
    if deadline and deadline < utcnow():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The application deadline has passed")
    existing = (
        db.query(JobApplication)
        .filter(JobApplication.job_id == job.id, JobApplication.candidate_id == current_user.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied for this job")

    match = match_candidate_to_job(db, job, current_user.id)
    application = JobApplication(
        job_id=job.id,
        candidate_id=current_user.id,
        application_status=ApplicationStatus.pending,
        match_score=match["match_score"],
        cover_letter=payload.cover_letter,
    )
    db.add(application)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="You have already applied for this job")
    return _detail(db, _load_application(db, application.id), include_email=False)


@router.get("/applications/my-applications", response_model=ApplicationListResponse)
def my_applications(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    query = (
        db.query(JobApplication)
        .options(joinedload(JobApplication.job), joinedload(JobApplication.candidate))
        .filter(JobApplication.candidate_id == current_user.id)
        .order_by(JobApplication.applied_at.desc())
    )
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApplicationListResponse(
        items=[_application_out(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/jobs/{job_id}/applications", response_model=ApplicationListResponse)
def job_applications(
    job_id: int,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    job = _managed_job(db, job_id, current_user)
    query = (
        db.query(JobApplication)
        .options(joinedload(JobApplication.job), joinedload(JobApplication.candidate))
        .filter(JobApplication.job_id == job.id)
        .order_by(JobApplication.match_score.desc(), JobApplication.applied_at.asc())
    )
    total = query.count()
    rows = query.offset((page - 1) * page_size).limit(page_size).all()
    return ApplicationListResponse(
        items=[_application_out(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/applications/{application_id}", response_model=ApplicationDetail)
def get_application(
    application_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker, UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    application = _load_application(db, application_id)
    if application is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    is_candidate = application.candidate_id == current_user.id
    if not is_candidate and not _can_manage(current_user, application):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    return _detail(db, application, include_email=_can_manage(current_user, application))


@router.put("/applications/{application_id}/status", response_model=ApplicationDetail)
def update_application_status(
    application_id: int,
    payload: ApplicationStatusUpdate,
    current_user: User = Depends(require_roles(UserRole.employer, UserRole.admin)),
    db: Session = Depends(get_db),
):
    application = _load_application(db, application_id)
    if application is None or not _can_manage(current_user, application):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")
    application.application_status = payload.application_status
    application.updated_at = utcnow()
    db.commit()
    db.refresh(application)
    application = _load_application(db, application.id)
    return _detail(db, application, include_email=True)


def _detail(db: Session, application: JobApplication, include_email: bool) -> ApplicationDetail:
    match_skills = []
    if application.job:
        match_skills = match_candidate_to_job(db, application.job, application.candidate_id)["skills"]
    return ApplicationDetail(
        **_application_out(application).model_dump(),
        skills=match_skills,
        candidate_location=application.candidate.location if application.candidate else None,
        candidate_email=application.candidate.email if include_email and application.candidate else None,
    )

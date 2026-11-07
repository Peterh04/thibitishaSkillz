"""CV upload, history, and analysis."""

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from backend.config import settings
from backend.dependencies import get_db, require_roles
from backend.models import AnalysisStatus, CV, User, UserRole
from backend.schema import CVAnalysisOut, CVOut, MessageResponse
from backend.services.cv_service import apply_analysis, delete_cv_file, extract_cv_text, save_cv_file
from backend.services.gemini_service import GeminiError
from backend.utils import utcnow

router = APIRouter(prefix="/api/cv", tags=["CV"])


def _cv_out(cv: CV) -> CVOut:
    return CVOut(
        id=cv.id,
        candidate_id=cv.candidate_id,
        file_name=cv.file_name,
        file_type=cv.file_type,
        analysis_status=cv.analysis_status.value if hasattr(cv.analysis_status, "value") else cv.analysis_status,
        is_current=cv.is_current,
        uploaded_at=cv.uploaded_at,
        analysis_error=cv.analysis_error,
    )


def _own_cv(db: Session, cv_id: int, user: User) -> CV:
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if cv is None or (cv.candidate_id != user.id and user.role != UserRole.admin):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    if user.role == UserRole.admin and cv.candidate_id != user.id:
        return cv
    if cv.candidate_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    return cv


def _analysis_out(cv: CV) -> CVAnalysisOut:
    result = cv.analysis_result or {}
    return CVAnalysisOut(
        cv_id=cv.id,
        analysis_status=cv.analysis_status.value if hasattr(cv.analysis_status, "value") else cv.analysis_status,
        education=result.get("education"),
        experience_summary=result.get("experience_summary"),
        career_interests=result.get("career_interests"),
        certifications=result.get("certifications") or [],
        projects=result.get("projects") or [],
        skills=result.get("skills") or [],
        analysis_error=cv.analysis_error,
    )


@router.post("/upload", response_model=CVOut, status_code=status.HTTP_201_CREATED)
async def upload_cv(
    file: UploadFile = File(...),
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The uploaded file is empty")
    if len(content) > settings.max_cv_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"CV files must be {settings.MAX_CV_SIZE_MB} MB or smaller",
        )
    try:
        text, file_type = extract_cv_text(content, file.filename)
        file_name, file_path = save_cv_file(current_user.id, content, file.filename, file_type)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    db.query(CV).filter(CV.candidate_id == current_user.id, CV.is_current.is_(True)).update(
        {CV.is_current: False}, synchronize_session=False
    )
    cv = CV(
        candidate_id=current_user.id,
        file_name=file_name,
        file_path=file_path,
        file_type=file_type,
        extracted_text=text,
        analysis_status=AnalysisStatus.pending,
        is_current=True,
        uploaded_at=utcnow(),
    )
    db.add(cv)
    current_user.updated_at = utcnow()
    db.commit()
    db.refresh(cv)
    return _cv_out(cv)


@router.get("/my-cv", response_model=CVOut)
def my_current_cv(
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    cv = (
        db.query(CV)
        .filter(CV.candidate_id == current_user.id, CV.is_current.is_(True))
        .order_by(CV.uploaded_at.desc())
        .first()
    )
    if cv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="You have not uploaded a CV yet")
    return _cv_out(cv)


@router.get("/my-cv/history", response_model=list[CVOut])
def my_cv_history(
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(CV)
        .filter(CV.candidate_id == current_user.id)
        .order_by(CV.uploaded_at.desc())
        .all()
    )
    return [_cv_out(row) for row in rows]


@router.delete("/{cv_id}", response_model=MessageResponse)
def delete_cv(
    cv_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker, UserRole.admin)),
    db: Session = Depends(get_db),
):
    cv = db.query(CV).filter(CV.id == cv_id).first()
    if cv is None or (current_user.role != UserRole.admin and cv.candidate_id != current_user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CV not found")
    was_current = cv.is_current
    candidate_id = cv.candidate_id
    delete_cv_file(cv.file_path)
    db.delete(cv)
    db.flush()
    if was_current:
        previous = (
            db.query(CV)
            .filter(CV.candidate_id == candidate_id)
            .order_by(CV.uploaded_at.desc())
            .first()
        )
        if previous:
            previous.is_current = True
    db.commit()
    return MessageResponse(message="CV deleted")


@router.post("/{cv_id}/analyze", response_model=CVAnalysisOut)
def analyze_cv(
    cv_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker)),
    db: Session = Depends(get_db),
):
    cv = _own_cv(db, cv_id, current_user)
    try:
        result = apply_analysis(db, cv, current_user)
    except GeminiError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    try:
        from backend.services.notification_service import notify_cv_analyzed

        skills = result.get("skills") if isinstance(result, dict) else None
        skill_count = len(skills) if isinstance(skills, list) else 0
        notify_cv_analyzed(db, current_user, skill_count=skill_count)
    except Exception:
        import logging

        logging.getLogger("thibitisha.notifications").exception("CV analyze SMS notify failed")
    db.refresh(cv)
    return _analysis_out(cv)


@router.get("/{cv_id}/analysis", response_model=CVAnalysisOut)
def get_analysis(
    cv_id: int,
    current_user: User = Depends(require_roles(UserRole.job_seeker, UserRole.admin)),
    db: Session = Depends(get_db),
):
    cv = _own_cv(db, cv_id, current_user)
    return _analysis_out(cv)

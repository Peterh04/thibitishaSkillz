"""CV file handling and Gemini analysis."""

import re
from io import BytesIO
from pathlib import Path
from uuid import uuid4

from pypdf import PdfReader
from sqlalchemy.orm import Session

from backend.config import settings
from backend.models import (
    AnalysisStatus,
    CandidateProfile,
    CandidateSkill,
    CandidateVerificationStatus,
    CV,
    Skill,
    SkillSource,
    User,
)
from backend.seed import get_or_create_skill
from backend.services.gemini_service import GeminiError, analyze_cv_text
from backend.utils import clean_text, skill_name_key, skill_supported_by_text, utcnow

SAFE_NAME = re.compile(r"[^A-Za-z0-9._ -]")


def display_file_name(original_name: str | None) -> str:
    base = Path(original_name or "cv.pdf").name
    cleaned = SAFE_NAME.sub("", base).strip() or "cv.pdf"
    if not cleaned.lower().endswith(".pdf"):
        cleaned = f"{cleaned}.pdf"
    return cleaned[:120]


def extract_pdf_text(content: bytes) -> str:
    if not content.startswith(b"%PDF"):
        raise ValueError("Only PDF files are supported.")
    try:
        reader = PdfReader(BytesIO(content))
        pages = [(page.extract_text() or "") for page in reader.pages]
    except Exception as exc:
        raise ValueError("The PDF could not be read. Please upload a text-based PDF.") from exc
    text = clean_text("\n".join(pages), limit=200000)
    if not text:
        raise ValueError("This PDF has no readable text. Scanned image CVs are not supported yet.")
    return text


def save_cv_file(candidate_id: int, content: bytes, original_name: str | None) -> tuple[str, str]:
    settings.upload_path.mkdir(parents=True, exist_ok=True)
    stored_name = f"{candidate_id}_{uuid4().hex}.pdf"
    path = settings.upload_path / stored_name
    path.write_bytes(content)
    return display_file_name(original_name), str(path)


def delete_cv_file(file_path: str) -> None:
    path = Path(file_path)
    if path.is_file():
        path.unlink()


def _string_list(values) -> list[str]:
    if not isinstance(values, list):
        return []
    cleaned = []
    for value in values:
        text = clean_text(str(value), limit=300)
        if text:
            cleaned.append(text)
    return cleaned[:20]


def apply_analysis(db: Session, cv: CV, candidate: User) -> dict:
    """Run Gemini on a stored CV and save supported skills and profile facts."""
    if not cv.extracted_text:
        raise ValueError("This CV has no extracted text to analyse.")

    cv.analysis_status = AnalysisStatus.processing
    cv.analysis_error = None
    db.commit()

    try:
        raw = analyze_cv_text(cv.extracted_text)
    except GeminiError as exc:
        cv.analysis_status = AnalysisStatus.failed
        cv.analysis_error = str(exc)
        cv_refreshed_at = utcnow()
        candidate.updated_at = cv_refreshed_at
        db.commit()
        raise

    saved_skills = []
    for item in raw.get("skills", []):
        name = clean_text(str(item.get("name", "")), limit=80)
        if not name or len(name.split()) > 4:
            continue
        if not skill_supported_by_text(name, cv.extracted_text):
            continue
        requires_confirmation = bool(item.get("requires_confirmation"))
        category = clean_text(str(item.get("category") or "General"), limit=80) or "General"
        record = {
            "name": name,
            "category": category,
            "requires_confirmation": requires_confirmation,
            "saved": False,
            "skill_id": None,
        }
        if requires_confirmation:
            skill = db.query(Skill).filter(Skill.name_key == skill_name_key(name)).first()
            if skill:
                record["skill_id"] = skill.id
                record["name"] = skill.name
            saved_skills.append(record)
            continue

        skill = get_or_create_skill(db, name, category)
        record["skill_id"] = skill.id
        record["name"] = skill.name
        link = (
            db.query(CandidateSkill)
            .filter(CandidateSkill.candidate_id == candidate.id, CandidateSkill.skill_id == skill.id)
            .first()
        )
        if link is None:
            db.add(
                CandidateSkill(
                    candidate_id=candidate.id,
                    skill_id=skill.id,
                    source=SkillSource.cv,
                    verification_status=CandidateVerificationStatus.unverified,
                )
            )
            record["saved"] = True
        else:
            record["saved"] = True
        saved_skills.append(record)

    education = clean_text(str(raw.get("education") or ""), limit=4000)
    experience = clean_text(str(raw.get("experience_summary") or ""), limit=4000)
    interests = clean_text(str(raw.get("career_interests") or ""), limit=2000)
    analysis = {
        "education": education,
        "experience_summary": experience,
        "career_interests": interests,
        "certifications": _string_list(raw.get("certifications")),
        "projects": _string_list(raw.get("projects")),
        "skills": saved_skills,
    }
    cv.analysis_result = analysis
    cv.analysis_status = AnalysisStatus.completed
    cv.analysis_error = None

    profile = candidate.candidate_profile
    if profile is None:
        profile = CandidateProfile(user_id=candidate.id)
        db.add(profile)
    if education:
        profile.education = education
    if experience:
        profile.experience_summary = experience
    if interests and not profile.career_interests:
        profile.career_interests = interests
    profile.updated_at = utcnow()
    candidate.updated_at = utcnow()
    db.commit()
    db.refresh(cv)
    return analysis

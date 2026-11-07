"""Tests for CV upload, retrieval, deletion, and Gemini analysis."""

from io import BytesIO
from unittest.mock import patch

import pytest
from fastapi import status


@pytest.fixture
def fake_pdf_bytes():
    return b"%PDF-1.4 Fake PDF Header with text stream %EOF"


@pytest.fixture
def fake_docx_bytes():
    """Real .docx bytes generated with python-docx."""
    from docx import Document

    document = Document()
    document.add_paragraph("Experienced Python and React developer")
    document.add_paragraph("Skills: FastAPI, SQL")
    buffer = BytesIO()
    document.save(buffer)
    return buffer.getvalue()


def test_cv_upload_unsupported_type_fails(client, job_seeker_headers):
    files = {"file": ("resume.txt", b"Plain text file content", "text/plain")}
    response = client.post("/api/cv/upload", headers=job_seeker_headers, files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    detail = response.json()["detail"].lower()
    assert "pdf" in detail and "docx" in detail


def test_cv_upload_legacy_doc_rejected(client, job_seeker_headers):
    ole_header = b"\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1" + b"\x00" * 64
    files = {"file": ("resume.doc", ole_header, "application/msword")}
    response = client.post("/api/cv/upload", headers=job_seeker_headers, files=files)
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "docx" in response.json()["detail"].lower()


def test_cv_upload_and_retrieve_pdf(client, job_seeker_headers, fake_pdf_bytes):
    with patch(
        "backend.routes.cv.extract_cv_text",
        return_value=("Experienced Python and React developer", "pdf"),
    ):
        with patch(
            "backend.routes.cv.save_cv_file",
            return_value=("resume.pdf", "uploads/cvs/test.pdf"),
        ):
            files = {"file": ("resume.pdf", fake_pdf_bytes, "application/pdf")}
            response = client.post("/api/cv/upload", headers=job_seeker_headers, files=files)

    assert response.status_code == status.HTTP_201_CREATED
    cv_data = response.json()
    cv_id = cv_data["id"]
    assert cv_data["file_name"] == "resume.pdf"
    assert cv_data["file_type"] == "pdf"
    assert cv_data["is_current"] is True

    get_res = client.get("/api/cv/my-cv", headers=job_seeker_headers)
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["id"] == cv_id

    hist_res = client.get("/api/cv/my-cv/history", headers=job_seeker_headers)
    assert hist_res.status_code == status.HTTP_200_OK
    assert len(hist_res.json()) >= 1


def test_cv_upload_docx(client, job_seeker_headers, fake_docx_bytes):
    with patch(
        "backend.routes.cv.extract_cv_text",
        return_value=("Experienced Python and React developer", "docx"),
    ):
        with patch(
            "backend.routes.cv.save_cv_file",
            return_value=("resume.docx", "uploads/cvs/test.docx"),
        ):
            files = {
                "file": (
                    "resume.docx",
                    fake_docx_bytes,
                    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                )
            }
            response = client.post("/api/cv/upload", headers=job_seeker_headers, files=files)

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["file_type"] == "docx"
    assert data["file_name"].endswith(".docx")


def test_extract_docx_text_reads_paragraphs(fake_docx_bytes):
    from backend.services.cv_service import extract_cv_text

    text, file_type = extract_cv_text(fake_docx_bytes, "resume.docx")
    assert file_type == "docx"
    assert "Python" in text


def test_cv_analyze_with_gemini(client, job_seeker_headers, fake_pdf_bytes, db_session, job_seeker_user):
    from backend.models import CV, AnalysisStatus
    from backend.utils import utcnow

    cv = CV(
        candidate_id=job_seeker_user.id,
        file_name="resume.pdf",
        file_path="uploads/cvs/test_cv.pdf",
        file_type="pdf",
        extracted_text="Alice Developer\nExperienced in Python, SQL, and FastAPI.\nEducation: University of Nairobi BSc CS.",
        analysis_status=AnalysisStatus.pending,
        is_current=True,
        uploaded_at=utcnow(),
    )
    db_session.add(cv)
    db_session.commit()
    db_session.refresh(cv)

    mock_gemini_analysis = {
        "skills": [
            {"name": "Python", "category": "Programming", "requires_confirmation": False},
            {"name": "SQL", "category": "Data", "requires_confirmation": False},
            {"name": "FastAPI", "category": "Programming", "requires_confirmation": True},
        ],
        "education": "University of Nairobi BSc CS",
        "experience_summary": "3 years in Python backend development",
        "career_interests": "Software Engineering",
        "certifications": ["AWS Certified Developer"],
        "projects": ["Thibitisha Skills Backend"],
    }

    with patch("backend.services.cv_service.analyze_cv_text", return_value=mock_gemini_analysis):
        response = client.post(f"/api/cv/{cv.id}/analyze", headers=job_seeker_headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["cv_id"] == cv.id
    assert data["analysis_status"] == "completed"
    assert len(data["skills"]) >= 2
    assert data["education"] == "University of Nairobi BSc CS"

    get_res = client.get(f"/api/cv/{cv.id}/analysis", headers=job_seeker_headers)
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["analysis_status"] == "completed"


def test_cv_delete(client, job_seeker_headers, fake_pdf_bytes, db_session, job_seeker_user):
    from backend.models import CV, AnalysisStatus
    from backend.utils import utcnow

    cv = CV(
        candidate_id=job_seeker_user.id,
        file_name="old_resume.pdf",
        file_path="uploads/cvs/old_cv.pdf",
        file_type="pdf",
        extracted_text="Old resume text",
        analysis_status=AnalysisStatus.pending,
        is_current=True,
        uploaded_at=utcnow(),
    )
    db_session.add(cv)
    db_session.commit()
    db_session.refresh(cv)

    with patch("backend.routes.cv.delete_cv_file"):
        del_res = client.delete(f"/api/cv/{cv.id}", headers=job_seeker_headers)

    assert del_res.status_code == status.HTTP_200_OK
    assert "deleted" in del_res.json()["message"].lower()

"""End-to-End integration test simulating the entire frontend-to-backend user journey."""

from unittest.mock import patch
import io
import pytest
from fastapi.testclient import TestClient

from backend.models import Skill, UserRole


def test_full_e2e_candidate_and_recruiter_journey(client: TestClient, db_session):
    # ---------------------------------------------------------
    # STEP 1: CANDIDATE SIGN UP & LOGIN
    # ---------------------------------------------------------
    cand_reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Amina Wanjiru",
            "email": "amina.wanjiru@example.com",
            "password": "StrongPassword123!",
            "role": "job_seeker",
            "phone_number": "+254712345678",
            "location": "Nairobi, Kenya",
        },
    )
    assert cand_reg.status_code == 201, cand_reg.text
    cand_token = cand_reg.json()["access_token"]
    cand_headers = {"Authorization": f"Bearer {cand_token}"}

    # Verify session /me endpoint
    me_res = client.get("/api/auth/me", headers=cand_headers)
    assert me_res.status_code == 200
    assert me_res.json()["user"]["role"] == "job_seeker"
    cand_id = me_res.json()["user"]["id"]

    # ---------------------------------------------------------
    # STEP 2: CANDIDATE UPLOADS CV & TRIGGERS GEMINI ANALYSIS
    # ---------------------------------------------------------
    mock_cv_text = "Experienced Python developer with SQL and FastAPI backend skills."
    cv_file = io.BytesIO(b"%PDF-1.4 Mock CV contents for testing")

    with patch(
        "backend.routes.cv.extract_cv_text",
        return_value=(mock_cv_text, "pdf"),
    ), patch(
        "backend.routes.cv.save_cv_file",
        return_value=("amina_cv.pdf", "uploads/cvs/test_amina_cv.pdf"),
    ):
        upload_res = client.post(
            "/api/cv/upload",
            headers=cand_headers,
            files={"file": ("amina_cv.pdf", cv_file, "application/pdf")},
        )
        assert upload_res.status_code == 201, upload_res.text
        cv_id = upload_res.json()["id"]

        # Mock Gemini AI response for CV analysis
        mock_analysis_result = {
            "education": "BSc Computer Science, University of Nairobi",
            "experience_summary": "3 years of backend engineering in Python and databases",
            "career_interests": "Cloud computing, API development",
            "certifications": ["AWS Certified Cloud Practitioner"],
            "projects": ["Thibitisha Skills backend architecture"],
            "skills": ["Python", "SQL"],
        }
        with patch("backend.services.cv_service.analyze_cv_text", return_value=mock_analysis_result):
            analyze_res = client.post(f"/api/cv/{cv_id}/analyze", headers=cand_headers)
            assert analyze_res.status_code == 200
            assert any(s["name"] == "Python" for s in analyze_res.json()["skills"])

    # ---------------------------------------------------------
    # STEP 3: CANDIDATE ADDS SKILL & TAKES ASSESSMENT
    # ---------------------------------------------------------
    python_skill = db_session.query(Skill).filter(Skill.name == "Python").first()
    assert python_skill is not None, "Seeded skills missing Python"

    # Add skill to candidate profile
    add_skill_res = client.post(
        "/api/skills/my-skills",
        headers=cand_headers,
        json={"skill_id": python_skill.id},
    )
    assert add_skill_res.status_code == 201

    mock_questions = [
        {
            "question_text": "What does type([]) return in Python 3?",
            "question_type": "multiple_choice",
            "options": ["<class 'list'>", "<class 'tuple'>", "<class 'dict'>", "<class 'set'>"],
            "correct_answer": "<class 'list'>",
            "explanation": "[] denotes an empty list literal in Python.",
        },
        {
            "question_text": "Which keyword is used to define a generator function in Python?",
            "question_type": "multiple_choice",
            "options": ["return", "yield", "gen", "produce"],
            "correct_answer": "yield",
            "explanation": "The yield keyword turns a regular function into a generator.",
        },
    ]

    # Start assessment for Python with mocked question generator
    with patch("backend.routes.assessments.generate_questions", return_value=mock_questions):
        start_test_res = client.post(
            "/api/assessments/start",
            headers=cand_headers,
            json={"skill_id": python_skill.id, "difficulty_level": "intermediate"},
        )
    assert start_test_res.status_code == 201
    assessment_id = start_test_res.json()["id"]

    # Get questions
    questions_res = client.get(f"/api/assessments/{assessment_id}/questions", headers=cand_headers)
    assert questions_res.status_code == 200
    questions = questions_res.json()
    assert len(questions) == 2

    # Submit answers (all correct options to pass)
    answers_payload = [
        {"question_id": questions[0]["id"], "candidate_answer": "<class 'list'>"},
        {"question_id": questions[1]["id"], "candidate_answer": "yield"},
    ]

    submit_test_res = client.post(
        f"/api/assessments/{assessment_id}/submit",
        headers=cand_headers,
        json={"answers": answers_payload},
    )
    assert submit_test_res.status_code == 200
    test_result = submit_test_res.json()
    assert test_result["id"] == assessment_id
    assert test_result["passed"] is True

    # ---------------------------------------------------------
    # STEP 4: RECRUITER REGISTRATION & COMPANY PROFILE
    # ---------------------------------------------------------
    rec_reg = client.post(
        "/api/auth/register",
        json={
            "full_name": "Peter Kamau",
            "email": "peter.recruiter@acme.com",
            "password": "RecruiterPass123!",
            "role": "employer",
            "phone_number": "+254700112233",
            "location": "Nairobi, Kenya",
        },
    )
    assert rec_reg.status_code == 201, rec_reg.text
    rec_token = rec_reg.json()["access_token"]
    rec_headers = {"Authorization": f"Bearer {rec_token}"}

    # Recruiter updates profile with company details
    prof_update = client.put(
        "/api/employers/profile",
        headers=rec_headers,
        json={
            "company_name": "Acme Insurance",
            "industry": "Fintech & Insurance",
            "company_location": "Nairobi, Kenya",
        },
    )
    assert prof_update.status_code == 200
    assert prof_update.json()["company_name"] == "Acme Insurance"

    # ---------------------------------------------------------
    # STEP 5: RECRUITER POSTS A JOB WITH REQUIRED SKILLS
    # ---------------------------------------------------------
    job_create = client.post(
        "/api/jobs",
        headers=rec_headers,
        json={
            "title": "Junior Python & Data Engineer",
            "description": "Develop and maintain automated data pipelines and backend services.",
            "location": "Nairobi, Kenya",
            "employment_type": "full_time",
            "experience_level": "mid",
            "status": "draft",
        },
    )
    assert job_create.status_code == 201, job_create.text
    job_id = job_create.json()["id"]

    # Attach required skills
    add_job_skills = client.post(
        f"/api/jobs/{job_id}/skills",
        headers=rec_headers,
        json={
            "skills": [
                {
                    "skill_id": python_skill.id,
                    "minimum_score": 50,
                    "importance_weight": 2,
                }
            ]
        },
    )
    assert add_job_skills.status_code == 200

    # Publish the job
    publish_res = client.put(
        f"/api/jobs/{job_id}",
        headers=rec_headers,
        json={"status": "published"},
    )
    assert publish_res.status_code == 200
    assert publish_res.json()["status"] == "published"

    # ---------------------------------------------------------
    # STEP 6: CANDIDATE BROWSES JOBS AND APPLIES
    # ---------------------------------------------------------
    jobs_browse = client.get("/api/jobs?status=published")
    assert jobs_browse.status_code == 200
    assert any(j["id"] == job_id for j in jobs_browse.json()["items"])

    # Candidate submits application
    apply_res = client.post(
        f"/api/jobs/{job_id}/apply",
        headers=cand_headers,
        json={"cover_letter": "I have verified Python skills and build robust APIs."},
    )
    assert apply_res.status_code == 201, apply_res.text
    app_id = apply_res.json()["id"]
    assert apply_res.json()["match_score"] is not None

    # ---------------------------------------------------------
    # STEP 7: RECRUITER VIEWS APPLICANTS & SHORTLISTS CANDIDATE
    # ---------------------------------------------------------
    applicants_res = client.get(f"/api/jobs/{job_id}/applications", headers=rec_headers)
    assert applicants_res.status_code == 200
    items = applicants_res.json()["items"]
    assert len(items) == 1
    assert items[0]["candidate_id"] == cand_id

    # Recruiter updates status to shortlisted
    status_update = client.put(
        f"/api/applications/{app_id}/status",
        headers=rec_headers,
        json={"application_status": "shortlisted"},
    )
    assert status_update.status_code == 200
    assert status_update.json()["application_status"] == "shortlisted"

    # Make candidate profile public so they appear on leaderboard
    client.put("/api/candidates/profile", headers=cand_headers, json={"is_public": True})

    # ---------------------------------------------------------
    # STEP 8: LEADERBOARD VERIFICATION
    # ---------------------------------------------------------
    lb_res = client.get(f"/api/leaderboard/{python_skill.id}")
    assert lb_res.status_code == 200
    lb_items = lb_res.json()["items"]
    assert any(entry["candidate_id"] == cand_id for entry in lb_items)

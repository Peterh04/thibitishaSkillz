"""Tests for jobs, skills matching, and job applications."""

import pytest
from fastapi import status


def test_job_lifecycle_and_matching(client, employer_headers, job_seeker_headers, sample_skill, db_session, job_seeker_user):
    from backend.models import SkillVerification, VerificationResultStatus, SkillLevel
    from backend.utils import utcnow

    # 1. Employer creates a job in draft
    job_payload = {
        "title": "Senior Python Backend Engineer",
        "description": "Looking for an engineer with verified Python abilities to build scalable backend services.",
        "responsibilities": "Design APIs, implement database models, write unit tests.",
        "qualifications": "Strong Python knowledge, experience with FastAPI or Django.",
        "location": "Nairobi, Kenya",
        "employment_type": "full_time",
        "experience_level": "mid",
        "status": "draft",
    }
    create_job_res = client.post("/api/jobs", headers=employer_headers, json=job_payload)
    assert create_job_res.status_code == status.HTTP_201_CREATED
    job_data = create_job_res.json()
    job_id = job_data["id"]
    assert job_data["title"] == job_payload["title"]
    assert job_data["status"] == "draft"

    # 2. Employer adds required skills
    skill_payload = {
        "skills": [
            {
                "skill_id": sample_skill.id,
                "minimum_score": 60,
                "importance_weight": 2,
            }
        ]
    }
    add_skill_res = client.post(f"/api/jobs/{job_id}/skills", headers=employer_headers, json=skill_payload)
    assert add_skill_res.status_code == status.HTTP_200_OK
    assert len(add_skill_res.json()) == 1
    assert add_skill_res.json()[0]["skill_id"] == sample_skill.id

    # 3. Publish the job
    publish_res = client.put(f"/api/jobs/{job_id}", headers=employer_headers, json={"status": "published"})
    assert publish_res.status_code == status.HTTP_200_OK
    assert publish_res.json()["status"] == "published"

    # 4. Check candidate matching BEFORE verification (candidate has no verified score)
    matches_before = client.get(f"/api/jobs/{job_id}/matches", headers=employer_headers)
    assert matches_before.status_code == status.HTTP_200_OK
    # Alice has not verified Python yet, so she should not appear with verified score
    items_before = matches_before.json()["items"]
    alice_match = next((m for m in items_before if m["candidate_id"] == job_seeker_user.id), None)
    assert alice_match is None or alice_match["match_score"] == 0

    # 5. Candidate earns verified skill
    verif = SkillVerification(
        candidate_id=job_seeker_user.id,
        skill_id=sample_skill.id,
        assessment_id=999,
        score=85.0,
        verification_level=SkillLevel.intermediate,
        verification_status=VerificationResultStatus.verified,
        is_current=True,
        verified_at=utcnow(),
    )
    db_session.add(verif)
    db_session.commit()

    # 6. Check candidate matching AFTER verification (verified_score = 85 >= 60 min score)
    matches_after = client.get(f"/api/jobs/{job_id}/matches", headers=employer_headers)
    assert matches_after.status_code == status.HTTP_200_OK
    items_after = matches_after.json()["items"]
    assert len(items_after) >= 1
    alice_match_after = next(m for m in items_after if m["candidate_id"] == job_seeker_user.id)
    assert alice_match_after["match_score"] == 85.0
    assert alice_match_after["meets_all_requirements"] is True

    # 7. Candidate applies for the job
    apply_payload = {
        "cover_letter": "I have verified my Python skills on Thibitisha Skills and look forward to this role.",
    }
    apply_res = client.post(f"/api/jobs/{job_id}/apply", headers=job_seeker_headers, json=apply_payload)
    assert apply_res.status_code == status.HTTP_201_CREATED
    app_data = apply_res.json()
    app_id = app_data["id"]
    assert app_data["job_id"] == job_id
    assert app_data["match_score"] == 85.0

    # 8. Duplicate application should be rejected
    dup_apply_res = client.post(f"/api/jobs/{job_id}/apply", headers=job_seeker_headers, json=apply_payload)
    assert dup_apply_res.status_code == status.HTTP_409_CONFLICT

    # 9. Employer views job applications
    job_apps_res = client.get(f"/api/jobs/{job_id}/applications", headers=employer_headers)
    assert job_apps_res.status_code == status.HTTP_200_OK
    assert job_apps_res.json()["total"] >= 1

    # 10. Employer updates application status to shortlisted
    status_update_res = client.put(
        f"/api/applications/{app_id}/status",
        headers=employer_headers,
        json={"application_status": "shortlisted"},
    )
    assert status_update_res.status_code == status.HTTP_200_OK
    assert status_update_res.json()["application_status"] == "shortlisted"

    # 11. Candidate views their applications
    my_apps_res = client.get("/api/applications/my-applications", headers=job_seeker_headers)
    assert my_apps_res.status_code == status.HTTP_200_OK
    my_apps = my_apps_res.json()["items"]
    assert any(a["id"] == app_id and a["application_status"] == "shortlisted" for a in my_apps)

    # 12. Employer views my-jobs list
    my_jobs_res = client.get("/api/employers/my-jobs", headers=employer_headers)
    assert my_jobs_res.status_code == status.HTTP_200_OK
    assert any(j["id"] == job_id for j in my_jobs_res.json()["items"])


"""Tests for leaderboard rankings based on verified scores."""

import pytest
from fastapi import status


def test_leaderboard_verified_rankings(client, job_seeker_headers, sample_skill, db_session, job_seeker_user):
    from backend.models import SkillVerification, VerificationResultStatus, SkillLevel
    from backend.services.assessment_service import recompute_skill_ranking
    from backend.utils import utcnow

    # Add verified score for Alice
    verif = SkillVerification(
        candidate_id=job_seeker_user.id,
        skill_id=sample_skill.id,
        assessment_id=888,
        score=92.0,
        verification_level=SkillLevel.advanced,
        verification_status=VerificationResultStatus.verified,
        is_current=True,
        verified_at=utcnow(),
    )
    db_session.add(verif)
    db_session.flush()

    # Recompute ranking
    recompute_skill_ranking(db_session, sample_skill.id)
    db_session.commit()

    # Public leaderboard query
    lb_res = client.get(f"/api/leaderboard/{sample_skill.id}")
    assert lb_res.status_code == status.HTTP_200_OK
    data = lb_res.json()
    assert data["total"] >= 1
    top_entry = data["items"][0]
    assert top_entry["candidate_id"] == job_seeker_user.id
    assert top_entry["score"] == 92.0
    assert top_entry["rank"] == 1

    # Top endpoint query
    top_res = client.get(f"/api/leaderboard/{sample_skill.id}/top?limit=5")
    assert top_res.status_code == status.HTTP_200_OK
    assert len(top_res.json()["items"]) >= 1

    # If candidate turns off public profile visibility, they disappear from public leaderboard
    client.put("/api/candidates/profile", headers=job_seeker_headers, json={"is_public": False})

    lb_private_res = client.get(f"/api/leaderboard/{sample_skill.id}")
    assert lb_private_res.status_code == status.HTTP_200_OK
    assert not any(item["candidate_id"] == job_seeker_user.id for item in lb_private_res.json()["items"])


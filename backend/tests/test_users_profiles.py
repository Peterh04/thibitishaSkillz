"""Tests for user profiles, candidate profiles, employer profiles, privacy, and admin."""

import pytest
from fastapi import status
from backend.models import UserRole


def test_update_my_user_account(client, job_seeker_headers):
    payload = {
        "full_name": "Alice Updated",
        "bio": "Experienced backend engineer",
        "location": "Eldoret, Kenya",
    }
    response = client.put("/api/users/me", headers=job_seeker_headers, json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["user"]["full_name"] == "Alice Updated"
    assert data["user"]["bio"] == "Experienced backend engineer"
    assert data["user"]["location"] == "Eldoret, Kenya"


def test_update_candidate_profile(client, job_seeker_headers):
    payload = {
        "education": "MSc Computer Science, University of Nairobi",
        "experience_summary": "5 years building web applications and APIs",
        "career_interests": "Cloud architecture, distributed systems",
        "github_url": "https://github.com/alice",
        "linkedin_url": "https://linkedin.com/in/alice",
        "is_public": True,
    }
    response = client.put("/api/candidates/profile", headers=job_seeker_headers, json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["education"] == payload["education"]
    assert data["github_url"] == payload["github_url"]
    assert data["is_public"] is True


def test_update_employer_profile(client, employer_headers):
    payload = {
        "company_name": "Global Tech Ventures",
        "company_description": "Building next-gen fintech solutions",
        "company_website": "https://globaltech.co.ke",
        "company_location": "Nairobi Westlands",
        "industry": "FinTech",
    }
    response = client.put("/api/employers/profile", headers=employer_headers, json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["company_name"] == "Global Tech Ventures"
    assert data["industry"] == "FinTech"

    # Also test GET /api/employers/profile
    get_res = client.get("/api/employers/profile", headers=employer_headers)
    assert get_res.status_code == status.HTTP_200_OK
    assert get_res.json()["company_name"] == "Global Tech Ventures"


def test_candidate_profile_visibility(client, job_seeker_headers, job_seeker_user):
    # When is_public=True, public profile is viewable by anyone
    response = client.get(f"/api/users/{job_seeker_user.id}/profile")
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["user"]["full_name"] == job_seeker_user.full_name

    # Make it private
    client.put("/api/candidates/profile", headers=job_seeker_headers, json={"is_public": False})

    # Anonymous viewer cannot view private profile
    anon_response = client.get(f"/api/users/{job_seeker_user.id}/profile")
    assert anon_response.status_code == status.HTTP_404_NOT_FOUND

    # Owner can still view it
    owner_response = client.get(f"/api/users/{job_seeker_user.id}/profile", headers=job_seeker_headers)
    assert owner_response.status_code == status.HTTP_200_OK


def test_admin_list_and_manage_users(client, admin_headers, job_seeker_user):
    # List users
    response = client.get("/api/admin/users", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["total"] >= 1
    assert any(u["id"] == job_seeker_user.id for u in data["items"])

    # Deactivate candidate user
    patch_res = client.patch(
        f"/api/admin/users/{job_seeker_user.id}",
        headers=admin_headers,
        json={"is_active": False},
    )
    assert patch_res.status_code == status.HTTP_200_OK
    assert patch_res.json()["is_active"] is False

    # Reactivate
    patch_res2 = client.patch(
        f"/api/admin/users/{job_seeker_user.id}",
        headers=admin_headers,
        json={"is_active": True},
    )
    assert patch_res2.status_code == status.HTTP_200_OK
    assert patch_res2.json()["is_active"] is True


def test_admin_summary(client, admin_headers):
    response = client.get("/api/admin/summary", headers=admin_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "users" in data
    assert "job_seekers" in data
    assert "employers" in data
    assert "skills" in data


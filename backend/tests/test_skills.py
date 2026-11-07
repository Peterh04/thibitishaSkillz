"""Tests for skill catalog and candidate skills."""

import pytest
from fastapi import status


def test_list_skills(client, sample_skill):
    response = client.get("/api/skills")
    assert response.status_code == status.HTTP_200_OK
    skills = response.json()
    assert isinstance(skills, list)
    assert any(s["name"] == sample_skill.name for s in skills)


def test_get_skill_by_id(client, sample_skill):
    response = client.get(f"/api/skills/{sample_skill.id}")
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["name"] == sample_skill.name


def test_list_categories(client, sample_skill):
    response = client.get("/api/skills/categories")
    assert response.status_code == status.HTTP_200_OK
    categories = response.json()
    assert sample_skill.category in categories


def test_candidate_add_and_remove_skill(client, job_seeker_headers, sample_skill):
    # Candidate adds skill to their profile
    payload = {
        "skill_id": sample_skill.id,
        "claimed_level": "intermediate",
    }
    add_res = client.post("/api/skills/my-skills", headers=job_seeker_headers, json=payload)
    assert add_res.status_code == status.HTTP_201_CREATED
    data = add_res.json()
    assert data["skill_id"] == sample_skill.id
    assert data["source"] == "manually_added"
    assert data["verification_status"] == "unverified"

    # List candidate's skills
    list_res = client.get("/api/skills/my-skills", headers=job_seeker_headers)
    assert list_res.status_code == status.HTTP_200_OK
    items = list_res.json()
    assert any(item["skill_id"] == sample_skill.id for item in items)

    # Delete candidate skill
    del_res = client.delete(f"/api/skills/my-skills/{sample_skill.id}", headers=job_seeker_headers)
    assert del_res.status_code == status.HTTP_200_OK

    # Verify skill is removed
    list_res2 = client.get("/api/skills/my-skills", headers=job_seeker_headers)
    assert not any(item["skill_id"] == sample_skill.id for item in list_res2.json())


def test_admin_create_update_delete_skill(client, admin_headers):
    # Admin creates new skill
    payload = {
        "name": "Docker",
        "category": "DevOps",
        "description": "Containerization platform",
    }
    create_res = client.post("/api/skills", headers=admin_headers, json=payload)
    assert create_res.status_code == status.HTTP_201_CREATED
    new_skill = create_res.json()
    skill_id = new_skill["id"]
    assert new_skill["name"] == "Docker"

    # Admin updates skill
    update_res = client.put(
        f"/api/skills/{skill_id}",
        headers=admin_headers,
        json={"description": "Platform for developing, shipping, and running applications in containers"},
    )
    assert update_res.status_code == status.HTTP_200_OK
    assert "containers" in update_res.json()["description"]

    # Admin deletes skill
    del_res = client.delete(f"/api/skills/{skill_id}", headers=admin_headers)
    assert del_res.status_code == status.HTTP_200_OK

    # Verify not found
    get_res = client.get(f"/api/skills/{skill_id}")
    assert get_res.status_code == status.HTTP_404_NOT_FOUND


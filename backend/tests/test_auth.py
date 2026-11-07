"""Tests for authentication, registration, login, logout, and token handling."""

import pytest
from fastapi import status


def test_register_job_seeker(client):
    payload = {
        "full_name": "Jane Doe",
        "email": "jane@example.com",
        "password": "Password123!",
        "role": "job_seeker",
        "location": "Mombasa, Kenya",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["role"] == "job_seeker"
    assert data["user"]["full_name"] == "Jane Doe"


def test_register_employer(client):
    payload = {
        "full_name": "Acme HR",
        "email": "hr@acme.com",
        "password": "SecurePassword123!",
        "role": "employer",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert data["user"]["role"] == "employer"


def test_register_admin_disallowed(client):
    payload = {
        "full_name": "Hacker Admin",
        "email": "hacker@example.com",
        "password": "Password123!",
        "role": "admin",
    }
    response = client.post("/api/auth/register", json=payload)
    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_duplicate_email(client):
    payload = {
        "full_name": "Candidate One",
        "email": "duplicate@example.com",
        "password": "Password123!",
        "role": "job_seeker",
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == status.HTTP_201_CREATED

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == status.HTTP_409_CONFLICT


def test_login_success(client, job_seeker_user):
    payload = {
        "email": job_seeker_user.email,
        "password": "Password123!",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert "access_token" in data
    assert data["user"]["id"] == job_seeker_user.id


def test_login_wrong_password(client, job_seeker_user):
    payload = {
        "email": job_seeker_user.email,
        "password": "WrongPassword!",
    }
    response = client.post("/api/auth/login", json=payload)
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_account_me(client, job_seeker_headers, job_seeker_user):
    response = client.get("/api/auth/me", headers=job_seeker_headers)
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["user"]["email"] == job_seeker_user.email
    assert data["candidate_profile"] is not None


def test_change_password(client, job_seeker_headers, job_seeker_user):
    payload = {
        "current_password": "Password123!",
        "new_password": "NewStrongPassword123!",
    }
    response = client.post("/api/auth/change-password", headers=job_seeker_headers, json=payload)
    assert response.status_code == status.HTTP_200_OK

    # Verify old password no longer works
    fail_login = client.post(
        "/api/auth/login",
        json={"email": job_seeker_user.email, "password": "Password123!"},
    )
    assert fail_login.status_code == status.HTTP_401_UNAUTHORIZED

    # Verify new password works
    success_login = client.post(
        "/api/auth/login",
        json={"email": job_seeker_user.email, "password": "NewStrongPassword123!"},
    )
    assert success_login.status_code == status.HTTP_200_OK


def test_logout_revokes_token(client, job_seeker_headers):
    # Valid call with token
    res1 = client.get("/api/auth/me", headers=job_seeker_headers)
    assert res1.status_code == status.HTTP_200_OK

    # Logout
    res_logout = client.post("/api/auth/logout", headers=job_seeker_headers)
    assert res_logout.status_code == status.HTTP_200_OK

    # Now same token should be rejected as revoked
    res2 = client.get("/api/auth/me", headers=job_seeker_headers)
    assert res2.status_code == status.HTTP_401_UNAUTHORIZED
    assert "revoked" in res2.json()["detail"].lower()


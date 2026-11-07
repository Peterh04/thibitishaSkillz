"""Pytest configuration and fixtures for testing Thibitisha Skills backend."""

import os
import sys
from pathlib import Path
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Ensure project root is in sys.path
BASE_DIR = Path(__file__).resolve().parent.parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

# Use an isolated SQLite in-memory database for testing
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["JWT_SECRET_KEY"] = "test-secret-key-32-chars-long-minimum-length"
os.environ["GEMINI_API_KEY"] = "fake-test-key-for-unit-tests"

from backend.auth import create_access_token, hash_password
from backend.config import settings
from backend.database import Base
from backend.dependencies import get_db
from backend.fastapi import app
from backend.models import CandidateProfile, EmployerProfile, Skill, User, UserRole
from backend.seed import seed_skills
from backend.utils import skill_name_key

# Test engine using in-memory SQLite with StaticPool
test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


@pytest.fixture(scope="session", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    seed_skills(session)
    session.close()
    yield
    Base.metadata.drop_all(bind=test_engine)


@pytest.fixture
def db_session():
    """Provides a transactional database session rolled back after each test."""
    connection = test_engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)

    yield session

    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture
def client(db_session):
    """Test client with db dependency overridden to use test session."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def job_seeker_user(db_session) -> User:
    user = User(
        full_name="Alice Candidate",
        email="alice@example.com",
        password_hash=hash_password("Password123!"),
        role=UserRole.job_seeker,
        location="Nairobi, Kenya",
        bio="Passionate Python developer",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    profile = CandidateProfile(
        user_id=user.id,
        is_public=True,
        education="BSc Computer Science",
        experience_summary="3 years software development",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def job_seeker_token(job_seeker_user) -> str:
    token, _, _ = create_access_token(job_seeker_user.id, job_seeker_user.role.value)
    return token


@pytest.fixture
def job_seeker_headers(job_seeker_token) -> dict:
    return {"Authorization": f"Bearer {job_seeker_token}"}


@pytest.fixture
def employer_user(db_session) -> User:
    user = User(
        full_name="Bob Employer",
        email="bob@company.com",
        password_hash=hash_password("Password123!"),
        role=UserRole.employer,
        location="Nairobi, Kenya",
        is_active=True,
    )
    db_session.add(user)
    db_session.flush()
    profile = EmployerProfile(
        user_id=user.id,
        company_name="Acme Tech Solutions",
        company_description="Leading software consultancy",
        company_location="Nairobi",
        industry="Technology",
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def employer_token(employer_user) -> str:
    token, _, _ = create_access_token(employer_user.id, employer_user.role.value)
    return token


@pytest.fixture
def employer_headers(employer_token) -> dict:
    return {"Authorization": f"Bearer {employer_token}"}


@pytest.fixture
def admin_user(db_session) -> User:
    user = User(
        full_name="Admin Supervisor",
        email="admin@platform.com",
        password_hash=hash_password("AdminPass123!"),
        role=UserRole.admin,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def admin_token(admin_user) -> str:
    token, _, _ = create_access_token(admin_user.id, admin_user.role.value)
    return token


@pytest.fixture
def admin_headers(admin_token) -> dict:
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture
def sample_skill(db_session) -> Skill:
    skill = db_session.query(Skill).filter(Skill.name_key == skill_name_key("Python")).first()
    if not skill:
        skill = Skill(
            name="Python",
            name_key=skill_name_key("Python"),
            category="Programming",
            description="General purpose programming language",
        )
        db_session.add(skill)
        db_session.commit()
        db_session.refresh(skill)
    return skill


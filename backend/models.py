"""SQLAlchemy models for Thibitisha Skills."""

import enum

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import relationship

from backend.database import Base
from backend.utils import utcnow


class UserRole(str, enum.Enum):
    job_seeker = "job_seeker"
    employer = "employer"
    admin = "admin"


class AnalysisStatus(str, enum.Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class SkillSource(str, enum.Enum):
    cv = "cv"
    manually_added = "manually_added"


class SkillLevel(str, enum.Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"


class CandidateVerificationStatus(str, enum.Enum):
    unverified = "unverified"
    in_progress = "in_progress"
    verified = "verified"


class AssessmentStatus(str, enum.Enum):
    pending = "pending"
    in_progress = "in_progress"
    completed = "completed"


class QuestionType(str, enum.Enum):
    multiple_choice = "multiple_choice"
    text = "text"
    practical = "practical"


class VerificationResultStatus(str, enum.Enum):
    verified = "verified"
    failed = "failed"


class JobStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    closed = "closed"


class EmploymentType(str, enum.Enum):
    full_time = "full_time"
    part_time = "part_time"
    contract = "contract"
    internship = "internship"


class ExperienceLevel(str, enum.Enum):
    entry = "entry"
    mid = "mid"
    senior = "senior"


class ApplicationStatus(str, enum.Enum):
    pending = "pending"
    shortlisted = "shortlisted"
    rejected = "rejected"
    accepted = "accepted"


def _enum(enum_class):
    return Enum(enum_class, native_enum=False, length=32, values_callable=lambda items: [item.value for item in items])


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(150), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(_enum(UserRole), nullable=False, index=True)
    profile_picture = Column(String(500), nullable=True)
    phone_number = Column(String(30), nullable=True)
    location = Column(String(150), nullable=True)
    bio = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    candidate_profile = relationship(
        "CandidateProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    employer_profile = relationship(
        "EmployerProfile", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    cvs = relationship("CV", back_populates="candidate", cascade="all, delete-orphan")
    candidate_skills = relationship(
        "CandidateSkill", back_populates="candidate", cascade="all, delete-orphan"
    )
    assessments = relationship("Assessment", back_populates="candidate", cascade="all, delete-orphan")
    verifications = relationship(
        "SkillVerification", back_populates="candidate", cascade="all, delete-orphan"
    )
    applications = relationship(
        "JobApplication", back_populates="candidate", cascade="all, delete-orphan"
    )
    rankings = relationship(
        "CandidateRanking", back_populates="candidate", cascade="all, delete-orphan"
    )
    jobs = relationship("Job", back_populates="employer", cascade="all, delete-orphan")


class CandidateProfile(Base):
    __tablename__ = "candidate_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    education = Column(Text, nullable=True)
    experience_summary = Column(Text, nullable=True)
    career_interests = Column(Text, nullable=True)
    portfolio_url = Column(String(500), nullable=True)
    linkedin_url = Column(String(500), nullable=True)
    github_url = Column(String(500), nullable=True)
    is_public = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="candidate_profile")


class EmployerProfile(Base):
    __tablename__ = "employer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    company_name = Column(String(200), nullable=True)
    company_description = Column(Text, nullable=True)
    company_website = Column(String(500), nullable=True)
    company_location = Column(String(150), nullable=True)
    industry = Column(String(120), nullable=True)
    company_logo = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    user = relationship("User", back_populates="employer_profile")


class CV(Base):
    __tablename__ = "cvs"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    file_name = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_type = Column(String(50), nullable=False, default="pdf")
    extracted_text = Column(Text, nullable=True)
    analysis_result = Column(JSON, nullable=True)
    analysis_error = Column(Text, nullable=True)
    analysis_status = Column(_enum(AnalysisStatus), default=AnalysisStatus.pending, nullable=False)
    is_current = Column(Boolean, default=True, nullable=False, index=True)
    uploaded_at = Column(DateTime, default=utcnow, nullable=False)

    candidate = relationship("User", back_populates="cvs")


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), nullable=False)
    name_key = Column(String(80), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    category = Column(String(80), nullable=False, default="General", index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

    candidate_links = relationship("CandidateSkill", back_populates="skill")
    job_links = relationship("JobSkill", back_populates="skill")


class CandidateSkill(Base):
    __tablename__ = "candidate_skills"
    __table_args__ = (UniqueConstraint("candidate_id", "skill_id", name="uq_candidate_skill"),)

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(_enum(SkillSource), nullable=False)
    claimed_level = Column(_enum(SkillLevel), nullable=True)
    verification_status = Column(
        _enum(CandidateVerificationStatus),
        default=CandidateVerificationStatus.unverified,
        nullable=False,
    )
    created_at = Column(DateTime, default=utcnow, nullable=False)

    candidate = relationship("User", back_populates="candidate_skills")
    skill = relationship("Skill", back_populates="candidate_links")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True)
    total_questions = Column(Integer, default=0, nullable=False)
    total_marks = Column(Integer, default=0, nullable=False)
    score = Column(Integer, nullable=True)
    percentage = Column(Float, nullable=True)
    difficulty_level = Column(_enum(SkillLevel), nullable=False)
    status = Column(_enum(AssessmentStatus), default=AssessmentStatus.pending, nullable=False, index=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    candidate = relationship("User", back_populates="assessments")
    skill = relationship("Skill")
    questions = relationship(
        "AssessmentQuestion", back_populates="assessment", cascade="all, delete-orphan"
    )
    answers = relationship(
        "AssessmentAnswer", back_populates="assessment", cascade="all, delete-orphan"
    )
    verifications = relationship("SkillVerification", back_populates="assessment")


class AssessmentQuestion(Base):
    __tablename__ = "assessment_questions"

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_text = Column(Text, nullable=False)
    question_type = Column(_enum(QuestionType), nullable=False)
    options = Column(JSON, nullable=True)
    correct_answer = Column(Text, nullable=False)
    marks = Column(Integer, nullable=False)
    difficulty = Column(_enum(SkillLevel), nullable=False)
    explanation = Column(Text, nullable=True)

    assessment = relationship("Assessment", back_populates="questions")
    answers = relationship("AssessmentAnswer", back_populates="question")


class AssessmentAnswer(Base):
    __tablename__ = "assessment_answers"
    __table_args__ = (UniqueConstraint("assessment_id", "question_id", name="uq_assessment_answer"),)

    id = Column(Integer, primary_key=True, index=True)
    assessment_id = Column(
        Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_id = Column(
        Integer, ForeignKey("assessment_questions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    candidate_answer = Column(Text, nullable=False)
    awarded_marks = Column(Integer, nullable=False, default=0)
    is_correct = Column(Boolean, nullable=False, default=False)
    feedback = Column(Text, nullable=True)
    submitted_at = Column(DateTime, default=utcnow, nullable=False)

    assessment = relationship("Assessment", back_populates="answers")
    question = relationship("AssessmentQuestion", back_populates="answers")


class SkillVerification(Base):
    """History of assessment results. Only the latest passing row has is_current=True."""

    __tablename__ = "skill_verifications"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    assessment_id = Column(
        Integer, ForeignKey("assessments.id", ondelete="CASCADE"), nullable=False, unique=True
    )
    score = Column(Float, nullable=False)
    verification_level = Column(_enum(SkillLevel), nullable=True)
    verification_status = Column(_enum(VerificationResultStatus), nullable=False)
    is_current = Column(Boolean, default=False, nullable=False, index=True)
    verified_at = Column(DateTime, default=utcnow, nullable=False)

    candidate = relationship("User", back_populates="verifications")
    skill = relationship("Skill")
    assessment = relationship("Assessment", back_populates="verifications")


class Job(Base):
    __tablename__ = "jobs"

    id = Column(Integer, primary_key=True, index=True)
    employer_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    responsibilities = Column(Text, nullable=True)
    qualifications = Column(Text, nullable=True)
    location = Column(String(150), nullable=True)
    employment_type = Column(_enum(EmploymentType), nullable=True)
    experience_level = Column(_enum(ExperienceLevel), nullable=True)
    status = Column(_enum(JobStatus), default=JobStatus.draft, nullable=False, index=True)
    application_deadline = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    employer = relationship("User", back_populates="jobs")
    skills = relationship("JobSkill", back_populates="job", cascade="all, delete-orphan")
    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")


class JobSkill(Base):
    __tablename__ = "job_skills"
    __table_args__ = (UniqueConstraint("job_id", "skill_id", name="uq_job_skill"),)

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="RESTRICT"), nullable=False, index=True)
    minimum_score = Column(Integer, nullable=False, default=50)
    importance_weight = Column(Integer, nullable=False, default=1)

    job = relationship("Job", back_populates="skills")
    skill = relationship("Skill", back_populates="job_links")


class JobApplication(Base):
    __tablename__ = "job_applications"
    __table_args__ = (UniqueConstraint("job_id", "candidate_id", name="uq_job_application"),)

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    application_status = Column(
        _enum(ApplicationStatus), default=ApplicationStatus.pending, nullable=False, index=True
    )
    match_score = Column(Float, nullable=True)
    cover_letter = Column(Text, nullable=True)
    applied_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    job = relationship("Job", back_populates="applications")
    candidate = relationship("User", back_populates="applications")


class CandidateRanking(Base):
    __tablename__ = "candidate_rankings"
    __table_args__ = (
        UniqueConstraint(
            "candidate_id", "skill_id", "ranking_period", name="uq_candidate_ranking"
        ),
    )

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    skill_id = Column(Integer, ForeignKey("skills.id", ondelete="CASCADE"), nullable=False, index=True)
    score = Column(Float, nullable=False)
    rank = Column(Integer, nullable=False, index=True)
    ranking_period = Column(String(32), nullable=False, default="all_time", index=True)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)

    candidate = relationship("User", back_populates="rankings")
    skill = relationship("Skill")


class RevokedToken(Base):
    __tablename__ = "revoked_tokens"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String(64), unique=True, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False, index=True)
    created_at = Column(DateTime, default=utcnow, nullable=False)

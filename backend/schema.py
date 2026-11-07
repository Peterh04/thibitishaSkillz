"""Pydantic request and response schemas."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from backend.models import (
    ApplicationStatus,
    AssessmentStatus,
    CandidateVerificationStatus,
    EmploymentType,
    ExperienceLevel,
    JobStatus,
    QuestionType,
    SkillLevel,
    SkillSource,
    UserRole,
    VerificationResultStatus,
)


def _clean(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    stripped = value.strip()
    return stripped or None


def _optional_url(value: Optional[str]) -> Optional[str]:
    value = _clean(value)
    if value and not value.startswith(("http://", "https://")):
        raise ValueError("URL must start with http:// or https://")
    return value


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class RegisterRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=150)
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    role: UserRole
    phone_number: Optional[str] = Field(default=None, max_length=30)
    location: Optional[str] = Field(default=None, max_length=150)

    @field_validator("role")
    @classmethod
    def public_roles_only(cls, value: UserRole) -> UserRole:
        if value == UserRole.admin:
            raise ValueError("Admin accounts cannot be created through registration")
        return value

    @field_validator("full_name", "phone_number", "location")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=72)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=72)
    new_password: str = Field(min_length=8, max_length=72)


class UserOut(ORMModel):
    id: int
    full_name: str
    email: EmailStr
    role: UserRole
    profile_picture: Optional[str] = None
    phone_number: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class PublicUserOut(ORMModel):
    id: int
    full_name: str
    profile_picture: Optional[str] = None
    location: Optional[str] = None
    bio: Optional[str] = None


class CandidateProfileOut(ORMModel):
    id: int
    user_id: int
    education: Optional[str] = None
    experience_summary: Optional[str] = None
    career_interests: Optional[str] = None
    portfolio_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    is_public: bool
    created_at: datetime
    updated_at: datetime


class EmployerProfileOut(ORMModel):
    id: int
    user_id: int
    company_name: Optional[str] = None
    company_description: Optional[str] = None
    company_website: Optional[str] = None
    company_location: Optional[str] = None
    industry: Optional[str] = None
    company_logo: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class MeResponse(BaseModel):
    user: UserOut
    candidate_profile: Optional[CandidateProfileOut] = None
    employer_profile: Optional[EmployerProfileOut] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MessageResponse(BaseModel):
    message: str


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = Field(default=None, min_length=2, max_length=150)
    phone_number: Optional[str] = Field(default=None, max_length=30)
    location: Optional[str] = Field(default=None, max_length=150)
    bio: Optional[str] = Field(default=None, max_length=2000)
    profile_picture: Optional[str] = Field(default=None, max_length=500)

    @field_validator("full_name", "phone_number", "location", "bio")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)

    @field_validator("profile_picture")
    @classmethod
    def picture_url(cls, value: Optional[str]) -> Optional[str]:
        return _optional_url(value)


class CandidateProfileUpdate(BaseModel):
    education: Optional[str] = Field(default=None, max_length=4000)
    experience_summary: Optional[str] = Field(default=None, max_length=4000)
    career_interests: Optional[str] = Field(default=None, max_length=2000)
    portfolio_url: Optional[str] = Field(default=None, max_length=500)
    linkedin_url: Optional[str] = Field(default=None, max_length=500)
    github_url: Optional[str] = Field(default=None, max_length=500)
    is_public: Optional[bool] = None

    @field_validator("education", "experience_summary", "career_interests")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)

    @field_validator("portfolio_url", "linkedin_url", "github_url")
    @classmethod
    def profile_urls(cls, value: Optional[str]) -> Optional[str]:
        return _optional_url(value)


class EmployerProfileUpdate(BaseModel):
    company_name: Optional[str] = Field(default=None, max_length=200)
    company_description: Optional[str] = Field(default=None, max_length=4000)
    company_website: Optional[str] = Field(default=None, max_length=500)
    company_location: Optional[str] = Field(default=None, max_length=150)
    industry: Optional[str] = Field(default=None, max_length=120)
    company_logo: Optional[str] = Field(default=None, max_length=500)

    @field_validator("company_name", "company_description", "company_location", "industry")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)

    @field_validator("company_website", "company_logo")
    @classmethod
    def company_urls(cls, value: Optional[str]) -> Optional[str]:
        return _optional_url(value)


class AdminUserUpdate(BaseModel):
    is_active: Optional[bool] = None
    role: Optional[UserRole] = None


class ProfileResponse(BaseModel):
    user: PublicUserOut
    candidate_profile: Optional[CandidateProfileOut] = None
    employer_profile: Optional[EmployerProfileOut] = None
    verified_skills: list["VerificationOut"] = []
    contact: Optional[UserOut] = None


class AnalyzedSkill(BaseModel):
    name: str
    category: Optional[str] = None
    skill_id: Optional[int] = None
    requires_confirmation: bool = False
    saved: bool = False


class CVOut(BaseModel):
    id: int
    candidate_id: int
    file_name: str
    file_type: str
    analysis_status: str
    is_current: bool
    uploaded_at: datetime
    analysis_error: Optional[str] = None


class CVAnalysisOut(BaseModel):
    cv_id: int
    analysis_status: str
    education: Optional[str] = None
    experience_summary: Optional[str] = None
    career_interests: Optional[str] = None
    certifications: list[str] = []
    projects: list[str] = []
    skills: list[AnalyzedSkill] = []
    analysis_error: Optional[str] = None


class SkillOut(ORMModel):
    id: int
    name: str
    description: Optional[str] = None
    category: str
    created_at: datetime


class SkillCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=1000)
    category: str = Field(default="General", min_length=2, max_length=80)

    @field_validator("name", "description", "category")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)


class SkillUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=2, max_length=80)
    description: Optional[str] = Field(default=None, max_length=1000)
    category: Optional[str] = Field(default=None, min_length=2, max_length=80)


class CandidateSkillCreate(BaseModel):
    skill_id: int
    claimed_level: Optional[SkillLevel] = None


class CandidateSkillOut(BaseModel):
    id: int
    skill_id: int
    name: str
    category: str
    description: Optional[str] = None
    source: SkillSource
    claimed_level: Optional[SkillLevel] = None
    verification_status: CandidateVerificationStatus
    created_at: datetime


class StartAssessmentRequest(BaseModel):
    skill_id: int
    difficulty_level: SkillLevel


class QuestionPublic(BaseModel):
    id: int
    question_text: str
    question_type: QuestionType
    options: Optional[list[str]] = None
    marks: int
    difficulty: SkillLevel


class AnswerSubmit(BaseModel):
    question_id: int
    candidate_answer: str = Field(min_length=1, max_length=8000)


class SubmitAssessmentRequest(BaseModel):
    answers: list[AnswerSubmit] = Field(min_length=1)


class AssessmentSummary(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    difficulty_level: SkillLevel
    status: AssessmentStatus
    total_questions: int
    total_marks: int
    score: Optional[int] = None
    percentage: Optional[float] = None
    passed: Optional[bool] = None
    verification_level: Optional[SkillLevel] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class QuestionResult(QuestionPublic):
    correct_answer: str
    explanation: Optional[str] = None
    candidate_answer: Optional[str] = None
    awarded_marks: Optional[int] = None
    is_correct: Optional[bool] = None
    feedback: Optional[str] = None


class AssessmentResult(AssessmentSummary):
    questions: list[QuestionResult]


class VerificationOut(BaseModel):
    id: int
    candidate_id: int
    skill_id: int
    skill_name: str
    category: str
    assessment_id: int
    score: float
    verification_level: Optional[SkillLevel] = None
    verification_status: VerificationResultStatus
    is_current: bool
    verified_at: datetime


class LeaderboardEntry(BaseModel):
    rank: int
    candidate_id: int
    full_name: str
    location: Optional[str] = None
    skill_id: int
    skill_name: str
    category: str
    score: float
    verification_level: Optional[SkillLevel] = None
    ranking_period: str


class Page(BaseModel):
    total: int
    page: int
    page_size: int


class LeaderboardResponse(Page):
    items: list[LeaderboardEntry]


class JobSkillInput(BaseModel):
    skill_id: int
    minimum_score: int = Field(default=50, ge=0, le=100)
    importance_weight: int = Field(default=1, ge=1, le=10)


class JobSkillsRequest(BaseModel):
    skills: list[JobSkillInput] = Field(min_length=1)


class JobSkillOut(BaseModel):
    id: int
    skill_id: int
    skill_name: str
    category: str
    minimum_score: int
    importance_weight: int


class JobCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=8000)
    responsibilities: Optional[str] = Field(default=None, max_length=8000)
    qualifications: Optional[str] = Field(default=None, max_length=8000)
    location: Optional[str] = Field(default=None, max_length=150)
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[ExperienceLevel] = None
    status: JobStatus = JobStatus.draft
    application_deadline: Optional[datetime] = None

    @field_validator("title", "description", "responsibilities", "qualifications", "location")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)


class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=3, max_length=200)
    description: Optional[str] = Field(default=None, min_length=10, max_length=8000)
    responsibilities: Optional[str] = Field(default=None, max_length=8000)
    qualifications: Optional[str] = Field(default=None, max_length=8000)
    location: Optional[str] = Field(default=None, max_length=150)
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[ExperienceLevel] = None
    status: Optional[JobStatus] = None
    application_deadline: Optional[datetime] = None


class JobOut(BaseModel):
    id: int
    employer_id: int
    company_name: Optional[str] = None
    title: str
    description: str
    responsibilities: Optional[str] = None
    qualifications: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[EmploymentType] = None
    experience_level: Optional[ExperienceLevel] = None
    status: JobStatus
    application_deadline: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    skills: list[JobSkillOut] = []


class JobListResponse(Page):
    items: list[JobOut]


class ApplyRequest(BaseModel):
    cover_letter: Optional[str] = Field(default=None, max_length=5000)

    @field_validator("cover_letter")
    @classmethod
    def strip_text(cls, value: Optional[str]) -> Optional[str]:
        return _clean(value)


class SkillMatchOut(BaseModel):
    skill_id: int
    skill_name: str
    minimum_score: int
    importance_weight: int
    verified_score: Optional[float] = None
    met_requirement: bool


class CandidateMatchOut(BaseModel):
    candidate_id: int
    full_name: str
    location: Optional[str] = None
    match_score: float
    meets_all_requirements: bool
    skills: list[SkillMatchOut]


class MatchListResponse(Page):
    job_id: int
    items: list[CandidateMatchOut]
    message: Optional[str] = None


class ApplicationOut(BaseModel):
    id: int
    job_id: int
    job_title: str
    candidate_id: int
    candidate_name: str
    application_status: ApplicationStatus
    match_score: Optional[float] = None
    cover_letter: Optional[str] = None
    applied_at: datetime
    updated_at: datetime


class ApplicationDetail(ApplicationOut):
    skills: list[SkillMatchOut] = []
    candidate_location: Optional[str] = None
    candidate_email: Optional[str] = None


class ApplicationListResponse(Page):
    items: list[ApplicationOut]


class ApplicationStatusUpdate(BaseModel):
    application_status: ApplicationStatus


class AdminSummary(BaseModel):
    users: int
    job_seekers: int
    employers: int
    skills: int
    jobs: int
    applications: int
    assessments: int
    verified_skills: int


ProfileResponse.model_rebuild()

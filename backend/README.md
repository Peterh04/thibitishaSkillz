# Thibitisha Skills — Backend API

**Thibitisha Skills** is a skill verification and skills-first recruitment platform. The platform helps job seekers verify the skills they claim to possess through objective and AI-evaluated assessments, and helps employers discover, match, and recruit candidates based on verified competencies rather than relying solely on CV claims.

**Architecture & flows:** see [ARCHITECTURE.md](./ARCHITECTURE.md) for system layers, seeker/employer sequences, matching, and the data model (Mermaid diagrams).

---

## Technology Stack

- **Language:** Python 3.11+
- **Framework:** FastAPI
- **Database ORM:** SQLAlchemy 2.0
- **Database:** MySQL 8.0+ (SQLite supported for development / unit testing)
- **Data Validation & Settings:** Pydantic v2 & Pydantic-Settings
- **AI Integration:** Google Gemini API (`google-genai` SDK); MsingiAI speech (`api.msingiai.com`) for voice interviews
- **Authentication:** JWT (JSON Web Tokens) with `python-jose`
- **Password Hashing:** Passlib (`bcrypt`)
- **Database Migrations:** Alembic
- **Testing:** Pytest & HTTPX TestClient

---

## Project Structure

```text
backend/
├── fastapi.py                 # Main FastAPI application entry point
├── database.py                # Database engine, session maker, and Base
├── models.py                  # SQLAlchemy relational database models (15 models)
├── schema.py                  # Pydantic request and response schemas
├── auth.py                    # Password hashing and JWT generation/validation
├── dependencies.py            # FastAPI dependencies (database session, authentication, RBAC)
├── config.py                  # Pydantic BaseSettings environment configuration
├── seed.py                    # Initial skill catalog and optional admin account seeding
├── utils.py                   # Shared utilities (timestamps, text matching, normalization)
│
├── routes/
│   ├── auth.py                # Registration, login, logout, password change
│   ├── users.py               # User profiles, candidate public/private profile, admin user management
│   ├── employers.py           # Employer profile and employer-managed jobs
│   ├── cv.py                  # CV upload, extraction, Gemini analysis, and history
│   ├── skills.py              # Skill catalog and candidate-claimed skills
│   ├── assessments.py         # Assessments start, questions, submission marking, verified results
│   ├── voice_interviews.py    # Post-CV Kiswahili voice interviewer (Gemini + MsingiAI)
│   ├── leaderboard.py         # Verified skill leaderboard and rankings
│   ├── jobs.py                # Job listings, required skills, candidate matching algorithm
│   └── applications.py        # Job applications, match score, status updates
│
├── services/
│   ├── gemini_service.py      # Google Gemini API integration (CV analysis, question gen, answer eval)
│   ├── msingi_service.py      # MsingiAI TTS/STT client (server-side API key only)
│   ├── voice_interview_service.py  # Spoken interview orchestration
│   ├── sms_service.py         # ThriveVas SMS client (disabled until working API key)
│   ├── notification_service.py # Stage SMS to candidates / employers
│   ├── cv_service.py          # PDF/DOCX text extraction and CV analysis orchestration
│   ├── assessment_service.py  # Assessment scoring, verification levels, and leaderboard ranking
│   └── matching_service.py    # Weighted matching of verified candidate skills to job requirements
│
├── alembic/                   # Alembic database migrations
│   ├── versions/              # Migration scripts
│   ├── env.py                 # Alembic environment runner
│   └── script.py.mako         # Migration template
│
├── tests/                     # Automated test suite
│   ├── conftest.py            # Test database, client, fixtures, and mocks
│   ├── test_auth.py           # Authentication and authorization tests
│   ├── test_users_profiles.py # Profiles, privacy controls, and admin tests
│   ├── test_skills.py         # Skill catalog and candidate skill tests
│   ├── test_cv.py             # CV upload and Gemini analysis tests
│   ├── test_assessments.py    # Assessment generation, marking, and verification tests
│   ├── test_voice_interviews.py # Voice interview flow with mocked Gemini/Msingi
│   ├── test_jobs_matching_applications.py # Jobs, matching algorithm, applications tests
│   └── test_leaderboard.py    # Verified leaderboard rankings tests
│
├── uploads/
│   ├── cvs/                   # Uploaded candidate CV files
│   └── voice/                 # Cached question WAV + answer audio
│
├── alembic.ini                # Alembic migration configuration
├── requirements.txt           # Project dependencies
├── .env.example               # Environment variables example
└── README.md                  # This documentation file
```

---

## Installation & Setup

### 1. Prerequisites

- Python 3.11 or later
- MySQL Server 8.0+ (or use Docker)
- A Google Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 2. Create Virtual Environment

```bash
# In the project root
python -m venv .venv

# Activate the virtual environment
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
source .venv/bin/activate
```

### 3. Install Dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Configure Environment Variables

Create `.env` in the `backend/` directory or project root:

```bash
cp backend/.env.example backend/.env
```

Configure your `.env` settings:

Copy `backend/.env.example` → `backend/.env`, then set real values locally:

- `DATABASE_URL` — your MySQL SQLAlchemy URL
- `JWT_SECRET_KEY` — random string, 32+ chars (not a placeholder)
- `GEMINI_API_KEY` — from Google AI Studio
- Optional: `ADMIN_EMAIL` / `ADMIN_PASSWORD` for the seeded admin

Never commit `backend/.env`. See `.env.example` for the full key list.

---

## Database Migrations (Alembic)

### 1. Create the Database in MySQL

```sql
CREATE DATABASE IF NOT EXISTS thibitisha_skills CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Apply Migrations

Run Alembic from the project root:

```bash
alembic upgrade head
```

To rollback a migration:

```bash
alembic downgrade -1
```

---

## Running the Application

### Development Server

Run with Uvicorn:

```bash
python -m uvicorn backend.fastapi:app --reload --port 8000
```

Alternatively:

```bash
python backend/fastapi.py
```

The API will be available at `http://localhost:8000`.

---

## API Documentation

FastAPI automatically generates interactive Swagger and ReDoc documentation:

- **Swagger UI:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc:** [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check:** [http://localhost:8000/health](http://localhost:8000/health)

---

## Key Features & Business Rules

### 1. Role-Based Authorization
- **Job Seeker:** Can upload CVs, add claimed skills, take skill verification assessments, view their verified scores, toggle public/private profile, and apply for published jobs.
- **Employer:** Can manage employer profile, post jobs, configure required skills with minimum scores and weights, search/match verified candidates, and review/update applications.
- **Admin:** Manages user accounts, activates/deactivates accounts, manages the skill catalog, and views platform-wide metrics.

### 2. Gemini AI Integration
- **CV Analysis:** Extracts text from uploaded PDF or Word (`.docx`) CVs and uses Google Gemini to identify skills, education, experience, certifications, and projects. Legacy `.doc` is not supported (save as `.docx` or PDF). Extracted skills require candidate confirmation or verification before being verified.
- **Question Generation:** Dynamically generates assessment questions tailored to the skill, difficulty level (beginner, intermediate, advanced), and includes both multiple-choice and practical/text questions.
- **Answer Evaluation:** Multiple-choice questions are marked automatically by the backend. Text and practical questions are evaluated against model criteria using Gemini with strict score boundaries and constructive feedback.
- **Prompt Injection Defense:** All candidate inputs and CV texts are safely fenced as untrusted data with strict system instructions preventing role hijacking or instruction overriding.

### 3. Skills Verification & Leaderboard
- A candidate must pass an assessment (>= 50%) to achieve verified status.
- Verification levels awarded: Beginner, Intermediate, or Advanced (capped by test difficulty).
- Only verified scores from candidates with public profiles appear on the public leaderboard.

### 4. Job Matching Algorithm
- Evaluates candidate verified skills against job requirements.
- Missing or unverified skills receive zero points.
- Incorporates skill importance weights and minimum passing scores to compute an overall match percentage (0% to 100%).

---

## Running Automated Tests

The test suite runs against an isolated SQLite in-memory database and mocks external Gemini API calls.

```bash
pytest backend/tests -v
```


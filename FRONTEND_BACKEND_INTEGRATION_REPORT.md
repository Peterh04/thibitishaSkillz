# Thibitisha Skills — Frontend & Backend Integration Report

## 1. Executive Summary

The end-to-end integration between the **Thibitisha Skills** React/Vite frontend and FastAPI backend is **complete, verified, and running**.

All core candidate, employer, assessment, and AI voice interviewer workflows are fully wired to live backend API endpoints, backed by MySQL database persistence and Google Gemini AI services.

Both servers have been started and verified:
- **Backend API Server**: Running on `http://127.0.0.1:8000` (Swagger UI available at `/docs`).
- **Frontend Web Application**: Running on `http://127.0.0.1:5173/`.
- **Test Suite Status**: **41/41 automated tests passing** (including complete end-to-end candidate and recruiter user journey tests).

---

## 2. Integrated Architecture & Layer Structure

```text
┌────────────────────────────────────────────────────────┐
│               Frontend UI Pages & React                │
│  - JobsPage (Browse & Search)                          │
│  - ApplyPage (Upload & Apply)                          │
│  - CandidateDashboard (CV, Skills, Tests, Apps)        │
│  - AssessmentPage (Quiz Player, AI Scoring & Results)  │
│  - InterviewPage (AI Voice Questions, STT, Scoring)    │
│  - LeaderboardPage (Public Verified Rankings)          │
│  - RecruiterHome (Employer Overview & Metrics)         │
│  - RecruiterJobs (Manage Jobs & Toggle Status)         │
│  - NewJobPage (Post Job & Configure Weighted Skills)   │
│  - RecruiterDashboard (Ranked Shortlist & Scoring)     │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│         Authentication & Security Context              │
│  - AuthProvider (Session, JWT persistence)             │
│  - ProtectedRoute (Role guarding: candidate/employer)  │
│  - Navbar (Dynamic navigation & user badge)            │
└───────────────────────────┬────────────────────────────┘
                            │
┌───────────────────────────▼────────────────────────────┐
│             Centralized API Client Layer               │
│  - apiClient (Token injection, FormData, error format) │
│  - authApi, usersApi, employersApi, cvApi, skillsApi   │
│  - assessmentsApi, jobsApi, applicationsApi            │
│  - leaderboardApi, voiceInterviewsApi                  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP JSON / Multipart Form
┌───────────────────────────▼────────────────────────────┐
│             FastAPI Backend Routers (Port 8000)        │
│  - 59 fully functional endpoints across 10 modules     │
│  - SQLAlchemy ORM with MySQL remote database           │
│  - Google Gemini AI (CV extraction, Test Q&A, Voice)   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Implemented User Journeys & End-to-End Workflows

### Candidate Experience
1. **Registration & Sign In**: Candidates sign up with email, password, full name, phone number, and location (`/signup`). Authenticated sessions issue JWT access tokens stored in `localStorage` and injected via `Bearer` headers.
2. **CV Upload & Gemini AI Extraction**: Candidates upload PDF or DOCX resumes. Gemini automatically extracts candidate experience summaries, education, and technical skills (`/dashboard`).
3. **Skill Verification & AI Assessments**: Candidates select any technical domain (e.g. Python, SQL, Cybersecurity, Flutter), choose a difficulty level (Beginner, Intermediate, Advanced), and complete a 5-question test with timer proctoring (`/assessments/:skillId`).
4. **Instant Scorecards & Explanations**: Submissions are evaluated instantly. Candidates receive a score percentage, verification level (Level 1, 2, or 3), and question-by-question breakdown with explanations.
5. **Job Application & Skill Matching**: Candidates browse open positions, review required verified skills, and submit their application (`/apply/:jobId`). The system computes an algorithmic skill match score against the job's weighted skill criteria.
6. **AI Voice Interview**: Candidates launch interactive turn-by-turn voice interviews with speech-to-text answers evaluated by Gemini for communication clarity and technical accuracy (`/interview/:interviewId`).
7. **Public Leaderboard**: Candidates toggle public visibility to appear on the platform leaderboard ranked by objective verified scores (`/leaderboard`).

### Employer / Recruiter Experience
1. **Recruiter Onboarding**: Recruiters sign up and configure their company profile (company name, industry, location) (`/recruiter`).
2. **Posting Weighted Jobs**: Recruiters publish positions with title, description, employment type, location, and required technical skills with minimum passing scores and importance weights (`/recruiter/jobs/new`).
3. **Job Management**: Recruiters manage active postings, search, filter, and toggle status between Open (`published`) and Closed in real time (`/recruiter/jobs`).
4. **Algorithmic Candidate Ranking**: Recruiters view all applicants sorted from top to bottom by algorithmic match score (`/recruiter/jobs/:jobId/candidates`).
5. **Scorecard Inspection & Status Updates**: Recruiters click candidate rows to inspect cover notes and verified skills, and update application statuses (`pending`, `reviewing`, `shortlisted`, `accepted`, `rejected`).


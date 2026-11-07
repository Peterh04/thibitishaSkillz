# Thibitisha Skills Platform

Thibitisha Skills is a skill verification and skills-first recruitment platform that helps job seekers prove their abilities through assessments and connects employers with qualified talent based on verified competencies.

## Repository Layout

- `backend/`: FastAPI backend service, database models, Gemini AI services, REST APIs, and automated test suite.
- `backend/ARCHITECTURE.md`: Backend flow architecture (system layers, seeker/employer sequences, data model).
- `frontend/`: User interface (React/Vite).

## Backend Quickstart

For full backend documentation, configuration, and API reference, see [backend/README.md](backend/README.md).  
For flows and diagrams, see [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md).

```bash
# 1. Setup virtual environment
python -m venv .venv
.\.venv\Scripts\Activate.ps1  # Windows PowerShell

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Configure environment
cp backend/.env.example backend/.env

# 4. Run database migrations
alembic upgrade head

# 5. Start development server
python -m uvicorn backend.fastapi:app --reload
```

Interactive API documentation will be available at [http://localhost:8000/docs](http://localhost:8000/docs).

## Problem Statement

Employers often rely heavily on CVs, qualifications and interviews to evaluate applicants, yet these methods do not always establish whether candidates genuinely possess the competencies required for a role, particularly in an era where AI can generate polished CVs, applications and interview responses.


Additionally, employers face challenges in screening large volumes of applications, identifying suitable candidates, conducting consistent assessments and communicating recruitment outcomes efficiently.

## Proposed Solution

Our proposed solution is an AI-powered recruitment and competency verification platform that integrates job-board listings, CV analysis, personalised clarification questions and interactive AI conversations to assess candidates against specific job requirements. 

The platform evaluates candidates' responses against the skills and experience claimed in their CVs, identifies competency gaps and ranks applicants based on evidence of their suitability. 

It then generates a shortlist of the top 10 candidates and prospective top 10 candidates, while facilitating automated SMS and email notifications to shortlisted applicants for final interviews.

## MAIN AIM 

The ultimate goal is to help employers move beyond CV-based recruitment towards a more efficient, transparent and evidence-based hiring process that prioritises demonstrated competence over self-reported qualifications.

## Key problems being solved

1.	CV credibility: Difficulty establishing whether candidates genuinely possess the skills and experience stated in their CVs.
2.	Inefficient screening: Time-consuming manual review of large volumes of applications.
3.	AI dependency: Difficulty distinguishing genuine candidate understanding from AI-generated responses.
4.	Inconsistent assessments: Lack of standardised, role-specific evaluation of candidates.
5.	Poor candidate matching: Difficulty identifying applicants whose demonstrated competencies align with job requirements.
6.	Communication delays: Inefficient communication of interview invitations and recruitment updates.

## Proof of Demand and Practical Impact

The 2025 World Economic Forum Future of Jobs Report found:

- 63% of employers identified skills gaps as a major barrier to business transformation.
- 85% planned to prioritise workforce upskilling.
- 70% expected to hire people with new skills.
- Analytical thinking remained the most sought-after core skill.


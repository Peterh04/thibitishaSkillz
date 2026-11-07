# Thibitisha Skills — Backend flow architecture

This document describes how the FastAPI backend is structured and how the main product flows move through routes, services, MySQL, file storage, and Gemini.

**Entrypoint:** `uvicorn backend.fastapi:app --reload --host 0.0.0.0 --port 8000`

---

## 1. System layers

```mermaid
flowchart TB
  subgraph Clients
    FE[Vite / React frontend]
    DOCS[OpenAPI /docs]
  end

  subgraph API["backend/fastapi.py"]
    CORS[CORS allowlist]
    JWT[JWT Bearer + revoked_tokens]
    RBAC[require_roles / object checks]
  end

  subgraph Routes["routes/*"]
    RAuth[auth]
    RUsers[users / employers]
    RCV[cv]
    RSkills[skills]
    RAssess[assessments]
    RVoice[voice_interviews]
    RJobs[jobs / applications]
    RBoard[leaderboard]
  end

  subgraph Services["services/*"]
    SCV[cv_service]
    SAssess[assessment_service]
    SVoice[voice_interview_service]
    SMatch[matching_service]
    SGemini[gemini_service]
    SMsingi[msingi_service]
  end

  subgraph Persistence
    DB[(MySQL)]
    FILES[uploads/cvs + uploads/voice]
  end

  AI[Google Gemini API]
  MSINGI[MsingiAI api.msingiai.com]

  FE --> CORS
  DOCS --> CORS
  CORS --> JWT --> RBAC --> Routes
  RCV --> SCV
  RAssess --> SAssess
  RAssess --> SGemini
  RCV --> SGemini
  RVoice --> SVoice
  SVoice --> SGemini
  SVoice --> SMsingi
  RJobs --> SMatch
  SCV --> FILES
  SVoice --> FILES
  SCV --> DB
  SAssess --> DB
  SMatch --> DB
  SGemini --> AI
  SMsingi --> MSINGI
  Routes --> DB
```

### Layer responsibilities

| Layer | Location | Responsibility |
|-------|----------|----------------|
| Entrypoint | `fastapi.py` | App factory, CORS, lifespan (uploads, `create_all`, seed) |
| Config | `config.py` | Env-only secrets (`DATABASE_URL`, `JWT_SECRET_KEY`) |
| Auth | `auth.py`, `dependencies.py` | bcrypt, JWT, revocation, RBAC |
| Routes | `routes/` | HTTP + authz only |
| Services | `services/` | Domain logic, AI, scoring, matching |
| Models | `models.py` | SQLAlchemy schema |
| Schemas | `schema.py` | Pydantic request/response |
| Migrations | `alembic/` | Schema versioning |

---

## 2. Job seeker flow

```mermaid
sequenceDiagram
  actor S as Job seeker
  participant API as FastAPI
  participant CV as cv_service
  participant G as Gemini
  participant DB as MySQL
  participant AS as assessment_service

  S->>API: POST /api/auth/register (job_seeker)
  API->>DB: User + CandidateProfile
  API-->>S: JWT

  S->>API: POST /api/cv/upload (PDF/DOCX)
  API->>CV: extract_cv_text + save file
  CV->>DB: cvs row (pending analysis)
  API-->>S: CVOut

  S->>API: POST /api/cv/{id}/analyze
  API->>G: analyze_cv_text
  G-->>API: skills / education JSON
  API->>DB: CandidateSkill (unverified) + profile fields

  S->>API: POST /api/voice-interviews/start
  API->>G: generate_voice_interview_questions (Kiswahili)
  API->>DB: VoiceInterview + turns (in_progress)

  S->>API: GET .../turns/{i}/audio
  Note over API: Msingi TTS (billable) → WAV cached under uploads/voice

  S->>API: POST .../answer (audio)
  Note over API: Msingi STT (billable) → Gemini marks transcript

  S->>API: POST /api/assessments/start
  API->>G: generate_questions
  API->>DB: Assessment + AssessmentQuestion (in_progress)

  S->>API: POST /api/assessments/{id}/submit
  API->>AS: score_submission (MC local, open via Gemini)
  AS->>DB: answers, percentage, SkillVerification
  AS->>DB: recompute candidate_rankings (if public)

  S->>API: POST /api/jobs/{id}/apply
  API->>DB: JobApplication + match_score (verified skills only)
```

### Seeker stages (summary)

1. **Auth** — register/login → JWT  
2. **CV** — upload PDF/DOCX → extract text  
3. **Analyze** — Gemini extracts claimed skills (unverified)  
4. **Voice interview** — Kiswahili spoken Q&A via [MsingiAI](https://platform.msingiai.com/docs) after CV; Gemini writes questions and scores transcripts  
5. **Assess** — skill must be on profile; daily cap; AI questions  
6. **Verify** — pass mark → `skill_verifications.is_current`  
7. **Apply** — match score from verified scores only  

---

## 3. Employer flow

```mermaid
sequenceDiagram
  actor E as Employer
  participant API as FastAPI
  participant DB as MySQL
  participant M as matching_service

  E->>API: POST /api/auth/register (employer)
  API->>DB: User + EmployerProfile
  API-->>E: JWT

  E->>API: PUT /api/employers/profile
  API->>DB: company_name, industry, …

  E->>API: POST /api/jobs (draft)
  E->>API: PUT /api/jobs/{id}/skills
  API->>DB: JobSkill (minimum_score, importance_weight)

  E->>API: PUT job status=published
  Note over API: Gates: location, employment_type,<br/>skills, company_name, future deadline

  E->>API: GET /api/jobs/{id}/matches
  API->>M: rank_public_candidates
  M->>DB: current verified scores
  M-->>E: ranked CandidateMatchOut

  E->>API: GET /api/jobs/{id}/applications
  E->>API: PUT /api/applications/{id}/status
```

### Match formula

For job skills with weight \(w_i\) and minimum \(m_i\), and candidate verified score \(s_i\):

- If \(s_i \ge m_i\): earn \(w_i \times (s_i / 100)\)
- Else: requirement not met  
- \(\text{match\%} = \dfrac{\sum earned}{\sum w_i} \times 100\)

Unverified or missing skills count as missing.

---

## 4. Assessment & verification internals

```mermaid
flowchart LR
  Start[start assessment] --> Gen[Gemini questions]
  Gen --> InProg[status: in_progress]
  InProg --> Submit[submit all answers]
  Submit --> MC[Mark MC locally]
  Submit --> Open[Gemini evaluate open answers]
  MC --> Total[Sum awarded / total_marks]
  Open --> Total
  Total --> Pass{percentage ≥ PASS_PERCENTAGE?}
  Pass -->|yes| Verified[SkillVerification verified + is_current]
  Pass -->|no| Failed[SkillVerification failed]
  Verified --> Rank[recompute_skill_ranking]
```

Marks by type: multiple_choice = 1, text = 2, practical = 3.  
Verification level from score bands, **capped by** assessment `difficulty_level`.

---

## 5. Data model (core relationships)

```mermaid
erDiagram
  users ||--o| candidate_profiles : has
  users ||--o| employer_profiles : has
  users ||--o{ cvs : uploads
  users ||--o{ candidate_skills : claims
  users ||--o{ assessments : takes
  users ||--o{ voice_interviews : speaks
  users ||--o{ skill_verifications : earns
  users ||--o{ job_applications : applies
  users ||--o{ jobs : posts
  skills ||--o{ candidate_skills : linked
  skills ||--o{ job_skills : required
  skills ||--o{ assessments : tested
  assessments ||--o{ assessment_questions : has
  assessments ||--o{ assessment_answers : has
  assessments ||--o| skill_verifications : produces
  voice_interviews ||--o{ voice_interview_turns : has
  jobs ||--o{ job_skills : requires
  jobs ||--o{ job_applications : receives
```

---

## 6. Route map

| Module | Prefix | Primary actors |
|--------|--------|----------------|
| `routes/auth.py` | `/api/auth` | All |
| `routes/users.py` | `/api/users`, `/api/candidates`, `/api/admin` | Seeker, employer, admin |
| `routes/employers.py` | `/api/employers` | Employer |
| `routes/cv.py` | `/api/cv` | Seeker |
| `routes/skills.py` | `/api/skills` | Public + seeker + admin |
| `routes/assessments.py` | `/api/assessments`, `/api/verifications` | Seeker |
| `routes/voice_interviews.py` | `/api/voice-interviews` | Seeker (Msingi TTS/STT) |
| `routes/jobs.py` | `/api/jobs` | Public + employer |
| `routes/applications.py` | `/api/jobs/{id}/apply`, `/api/applications` | Seeker + employer |
| `routes/leaderboard.py` | `/api/leaderboard` | Public |

---

## 7. Cross-cutting concerns

- **Secrets:** only from `backend/.env` — no weak JWT/DB defaults in code  
- **AuthZ:** JWT → revocation check → active user → role → ownership  
- **Uploads:** PDF + DOCX; magic-byte detection; size cap; stored under `uploads/cvs`; voice under `uploads/voice`  
- **MsingiAI:** server-side `MSINGI_API_KEY` only; TTS/STT via `https://api.msingiai.com` ([docs](https://platform.msingiai.com/docs)); billable on audio endpoints  
- **AI safety:** untrusted CV/answers fenced; JSON schema-validated  
- **Health:** `GET /health` reports DB reachability and whether Gemini is configured  

---

## 8. Related docs

- [backend/README.md](./README.md) — setup, migrations, tests  
- [FRONTEND_INTEGRATION_GUIDE.md](../FRONTEND_INTEGRATION_GUIDE.md) — endpoint contract for the UI  

### Interactive view in Cursor

An interactive version of this architecture (tabs + flow diagrams) is available as a Cursor Canvas beside chat:

`~/.cursor/projects/home-saint-thibitishaSkillz/canvases/backend-flow-architecture.canvas.tsx`

That canvas is a Cursor IDE surface (not committed as a runnable app inside this repo). **This `ARCHITECTURE.md` file is the source of truth in the repository** for GitHub, pitch decks, and teammates.  

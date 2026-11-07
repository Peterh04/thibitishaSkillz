# Thibitisha Skills Platform

Thibitisha Skills is a skill verification and skills-first recruitment platform that helps job seekers prove their abilities through assessments and connects employers with qualified talent based on verified competencies.

## Repository Layout

- `backend/`: FastAPI backend service, database models, Gemini AI services, REST APIs, and automated test suite.
- `frontend/`: User interface (React/Vite).

## Backend Quickstart

For full backend documentation, configuration, and API reference, see [backend/README.md](backend/README.md).

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


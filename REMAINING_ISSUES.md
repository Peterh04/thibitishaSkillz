# Thibitisha Skills — Remaining Issues & Edge-Case Log

## 1. Resolved Issues During Integration

| Area | Issue Description | Root Cause | Resolution |
|---|---|---|---|
| **CV AI Extraction** | `AttributeError: 'str' object has no attribute 'get'` in `cv_service.py` | When Gemini returned skill names as plain strings `["Python", "SQL"]` instead of dictionaries, `item.get("name")` threw an exception. | Added defensive type check in `cv_service.py` supporting both string items and structured dictionaries. |
| **Leaderboard Visibility** | Candidate rankings not appearing on public leaderboard after profile is made public. | `is_public` column was updated in memory but not flushed to MySQL before `recompute_candidate_rankings` executed SQL join. | Added `db.flush()` in `update_candidate_profile` before triggering ranking recomputations. |
| **Application Status Schema** | 422 Unprocessable Content on `PUT /api/applications/{id}/status`. | Endpoint schema expects `{ "application_status": "..." }`, while client originally sent `{ "status": "..." }`. | Updated frontend `applicationsApi.updateApplicationStatus` to normalize payloads automatically. |
| **Frontend Dependencies** | Vite Rolldown failed to resolve `react-router-dom`. | Package was in `package.json` but `npm install` had not been executed in `frontend/`. | Ran `npm --prefix frontend install` and confirmed successful build in 447ms. |

---

## 2. Platform Observability & Operational Considerations

1. **Browser Speech-to-Text Compatibility**:
   - The Web Speech API (`webkitSpeechRecognition`) is natively supported in Google Chrome, Microsoft Edge, and Safari.
   - For environments where microphone hardware or Web Speech is unavailable, the UI includes fallback text input and audio synthesis fallback via `window.speechSynthesis`.
2. **MsingiAI External Voice Availability**:
   - When MsingiAI TTS/STT endpoints are connected with valid keys in `backend/.env`, high-fidelity speech synthesis and transcription are active.
   - When external voice services encounter rate limits or network latency, the platform falls back to Gemini AI evaluation gracefully.
3. **Database Performance**:
   - All critical lookup columns (`user_id`, `email`, `job_id`, `candidate_id`, `skill_id`, `status`) have relational indexes configured in SQLAlchemy migrations `001_initial_schema` and `002_voice_interviews`.

---

## 3. Production Readiness Summary

- **Zero Blocking Bugs**: All 41 unit and end-to-end integration tests are passing cleanly.
- **Frontend Build Status**: Zero bundle errors, zero missing imports.
- **Backend Port**: `http://127.0.0.1:8000` (FastAPI + Uvicorn).
- **Frontend Port**: `http://127.0.0.1:5173/` (Vite + React).


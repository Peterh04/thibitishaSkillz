"""Voice interviewer flow with mocked Gemini + MsingiAI (no live billable calls)."""

from unittest.mock import patch

import pytest
from fastapi import status

from backend.models import AnalysisStatus, CV


@pytest.fixture
def analyzed_cv(db_session, job_seeker_user):
    cv = CV(
        candidate_id=job_seeker_user.id,
        file_name="alice.pdf",
        file_path="/tmp/alice.pdf",
        file_type="pdf",
        extracted_text="Alice Candidate. Python developer in Nairobi. Built APIs with FastAPI.",
        analysis_result={"skills": [{"name": "Python", "category": "Programming"}]},
        analysis_status=AnalysisStatus.completed,
        is_current=True,
    )
    db_session.add(cv)
    db_session.commit()
    db_session.refresh(cv)
    return cv


@pytest.fixture
def mock_voice_questions():
    return [
        {
            "question_sw": "Eleza uzoefu wako wa Python.",
            "question_en": "Describe your Python experience.",
            "expected_answer_sw": "Anataja FastAPI na miaka ya uzoefu.",
            "expected_answer_en": "Mentions FastAPI and years of experience.",
        },
        {
            "question_sw": "Unashughulikiaje hitilafu katika API?",
            "question_en": "How do you handle errors in an API?",
            "expected_answer_sw": "Anataja exception handling na logging.",
            "expected_answer_en": "Mentions exception handling and logging.",
        },
    ]


def test_start_voice_interview_requires_cv(client, job_seeker_headers):
    res = client.post("/api/voice-interviews/start", headers=job_seeker_headers, json={})
    assert res.status_code == status.HTTP_400_BAD_REQUEST


def test_voice_interview_flow_mocked(
    client, job_seeker_headers, analyzed_cv, sample_skill, mock_voice_questions, tmp_path
):
    with patch(
        "backend.services.voice_interview_service.generate_voice_interview_questions",
        return_value=mock_voice_questions,
    ), patch(
        "backend.services.voice_interview_service.settings.GEMINI_API_KEY",
        "test-gemini-key",
    ), patch(
        "backend.services.voice_interview_service.settings.MSINGI_API_KEY",
        "msk_test_key_not_real",
    ), patch(
        "backend.services.voice_interview_service.settings.UPLOAD_DIR",
        str(tmp_path / "uploads"),
    ):
        start = client.post(
            "/api/voice-interviews/start",
            headers=job_seeker_headers,
            json={"skill_id": sample_skill.id, "cv_id": analyzed_cv.id, "language": "sw"},
        )
        assert start.status_code == status.HTTP_201_CREATED, start.text
        body = start.json()
        interview_id = body["id"]
        assert body["status"] == "in_progress"
        assert body["language"] == "sw"
        assert body["total_questions"] == 2
        assert body["current_turn_index"] == 0
        assert body["turns"][0]["question_text"].startswith("Eleza")
        assert body["turns"][0]["question_text_en"].startswith("Describe")
        # Expected answers must not leak before scoring
        assert "expected_answer" not in (body["turns"][0].get("feedback") or "")

        current = client.get(
            f"/api/voice-interviews/{interview_id}/current-question",
            headers=job_seeker_headers,
        )
        assert current.status_code == status.HTTP_200_OK
        assert current.json()["turn_index"] == 0

        fake_wav = b"RIFF....WAVEfmt "  # not a real wav; Msingi is mocked

        with patch(
            "backend.services.voice_interview_service.create_speech",
            return_value=b"FAKEWAV",
        ) as tts:
            audio = client.get(
                f"/api/voice-interviews/{interview_id}/turns/0/audio",
                headers=job_seeker_headers,
            )
            assert audio.status_code == status.HTTP_200_OK
            assert audio.content == b"FAKEWAV"
            tts.assert_called_once()

        with patch(
            "backend.services.voice_interview_service.transcribe_audio",
            return_value={"text": "Nimefanya FastAPI kwa miaka mitatu."},
        ), patch(
            "backend.services.voice_interview_service.evaluate_voice_answer",
            return_value={
                "awarded_marks": 3,
                "feedback_sw": "Vizuri sana.",
                "feedback_en": "Very good.",
            },
        ):
            ans = client.post(
                f"/api/voice-interviews/{interview_id}/answer",
                headers=job_seeker_headers,
                files={"audio": ("answer.wav", fake_wav, "audio/wav")},
            )
        assert ans.status_code == status.HTTP_200_OK, ans.text
        after = ans.json()
        assert after["current_turn_index"] == 1
        assert after["turns"][0]["answered"] is True
        assert after["turns"][0]["awarded_marks"] == 3

        with patch(
            "backend.services.voice_interview_service.transcribe_audio",
            return_value={"text": "Ninatumia try/except na logs."},
        ), patch(
            "backend.services.voice_interview_service.evaluate_voice_answer",
            return_value={
                "awarded_marks": 2,
                "feedback_sw": "Sawa.",
                "feedback_en": "OK.",
            },
        ):
            ans2 = client.post(
                f"/api/voice-interviews/{interview_id}/answer",
                headers=job_seeker_headers,
                files={"audio": ("answer2.wav", fake_wav, "audio/wav")},
            )
        assert ans2.status_code == status.HTTP_200_OK, ans2.text
        done = ans2.json()
        assert done["status"] == "completed"
        assert done["score"] == 5.0
        assert done["percentage"] == pytest.approx(83.33, rel=1e-2)
        assert done["current_turn_index"] is None


def test_employer_cannot_start_voice_interview(client, employer_headers, analyzed_cv):
    res = client.post(
        "/api/voice-interviews/start",
        headers=employer_headers,
        json={"cv_id": analyzed_cv.id},
    )
    assert res.status_code == status.HTTP_403_FORBIDDEN


def test_start_voice_interview_english(
    client, job_seeker_headers, analyzed_cv, sample_skill, mock_voice_questions, tmp_path
):
    with patch(
        "backend.services.voice_interview_service.generate_voice_interview_questions",
        return_value=mock_voice_questions,
    ) as gen, patch(
        "backend.services.voice_interview_service.settings.GEMINI_API_KEY",
        "test-gemini-key",
    ), patch(
        "backend.services.voice_interview_service.settings.UPLOAD_DIR",
        str(tmp_path / "uploads"),
    ):
        start = client.post(
            "/api/voice-interviews/start",
            headers=job_seeker_headers,
            json={"skill_id": sample_skill.id, "cv_id": analyzed_cv.id, "language": "en"},
        )
    assert start.status_code == status.HTTP_201_CREATED, start.text
    body = start.json()
    assert body["language"] == "en"
    assert body["turns"][0]["question_text"].startswith("Describe")
    assert gen.call_args.kwargs.get("language") == "en"


def test_start_voice_interview_rejects_bad_language(client, job_seeker_headers, analyzed_cv):
    res = client.post(
        "/api/voice-interviews/start",
        headers=job_seeker_headers,
        json={"cv_id": analyzed_cv.id, "language": "fr"},
    )
    assert res.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

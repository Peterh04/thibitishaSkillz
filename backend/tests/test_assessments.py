"""Tests for skill assessments, question generation, submission marking, and verifications."""

from unittest.mock import patch
import pytest
from fastapi import status


@pytest.fixture
def mock_questions():
    return [
        {
            "question_text": "What is the output of print(type([])) in Python?",
            "question_type": "multiple_choice",
            "options": ["<class 'list'>", "<class 'dict'>", "<class 'tuple'>", "<class 'set'>"],
            "correct_answer": "<class 'list'>",
            "explanation": "[] denotes an empty list literal in Python.",
        },
        {
            "question_text": "Which keyword is used to define a generator function in Python?",
            "question_type": "multiple_choice",
            "options": ["return", "yield", "gen", "produce"],
            "correct_answer": "yield",
            "explanation": "The yield keyword turns a regular function into a generator.",
        },
        {
            "question_text": "Explain how Python handles memory management and garbage collection.",
            "question_type": "text",
            "options": None,
            "correct_answer": "Python uses reference counting as primary mechanism and a cyclic garbage collector.",
            "explanation": "Reference counting deallocates immediately when refcount reaches 0; cyclic GC detects reference cycles.",
        },
    ]


def test_assessment_flow_full(client, job_seeker_headers, sample_skill, mock_questions):
    # 1. Add skill to candidate's profile first
    add_skill_res = client.post(
        "/api/skills/my-skills",
        headers=job_seeker_headers,
        json={"skill_id": sample_skill.id, "claimed_level": "intermediate"},
    )
    assert add_skill_res.status_code == status.HTTP_201_CREATED

    # 2. Start assessment with mocked Gemini question generation
    with patch("backend.routes.assessments.generate_questions", return_value=mock_questions):
        start_res = client.post(
            "/api/assessments/start",
            headers=job_seeker_headers,
            json={"skill_id": sample_skill.id, "difficulty_level": "intermediate"},
        )

    assert start_res.status_code == status.HTTP_201_CREATED
    assessment_data = start_res.json()
    assessment_id = assessment_data["id"]
    assert assessment_data["status"] == "in_progress"
    assert assessment_data["total_questions"] == 3
    # 2 multiple_choice (1 mark each) + 1 text (2 marks) = 4 marks total
    assert assessment_data["total_marks"] == 4

    # 3. Retrieve questions (verify correct_answer is NOT exposed)
    questions_res = client.get(f"/api/assessments/{assessment_id}/questions", headers=job_seeker_headers)
    assert questions_res.status_code == status.HTTP_200_OK
    questions = questions_res.json()
    assert len(questions) == 3
    for q in questions:
        assert "correct_answer" not in q
        assert "explanation" not in q

    # 4. Submit answers
    # Answer 1: Correct MC
    # Answer 2: Wrong MC
    # Answer 3: Written text evaluated by Gemini
    q1 = questions[0]
    q2 = questions[1]
    q3 = questions[2]

    answers_payload = {
        "answers": [
            {"question_id": q1["id"], "candidate_answer": "<class 'list'>"},  # 1 mark
            {"question_id": q2["id"], "candidate_answer": "return"},           # 0 marks
            {"question_id": q3["id"], "candidate_answer": "Python uses reference counting and garbage collection."}, # text
        ]
    }

    mock_text_eval = {
        q3["id"]: {
            "awarded_marks": 2,
            "feedback": "Good explanation of reference counting and cyclic collector.",
        }
    }

    with patch("backend.services.assessment_service.evaluate_answers", return_value=mock_text_eval):
        submit_res = client.post(
            f"/api/assessments/{assessment_id}/submit",
            headers=job_seeker_headers,
            json=answers_payload,
        )

    assert submit_res.status_code == status.HTTP_200_OK
    result_data = submit_res.json()
    assert result_data["status"] == "completed"
    assert result_data["score"] == 3  # 1 from q1 + 0 from q2 + 2 from q3 = 3
    assert result_data["total_marks"] == 4
    assert result_data["percentage"] == 75.0
    assert result_data["passed"] is True
    assert result_data["verification_level"] in ["intermediate", "beginner"]

    # 5. Retrieve results (verify correct answers and feedback ARE exposed now)
    results_res = client.get(f"/api/assessments/{assessment_id}/results", headers=job_seeker_headers)
    assert results_res.status_code == status.HTTP_200_OK
    results_detail = results_res.json()
    assert len(results_detail["questions"]) == 3
    q1_result = next(q for q in results_detail["questions"] if q["id"] == q1["id"])
    assert q1_result["is_correct"] is True
    assert q1_result["awarded_marks"] == 1
    assert "correct_answer" in q1_result

    # 6. Verify skill verifications endpoint
    verif_res = client.get("/api/verifications/my-skills", headers=job_seeker_headers)
    assert verif_res.status_code == status.HTTP_200_OK
    verifications = verif_res.json()
    assert len(verifications) >= 1
    v = verifications[0]
    assert v["skill_id"] == sample_skill.id
    assert v["score"] == 75.0
    assert v["is_current"] is True

    # 7. Verify specific skill verification endpoint
    single_v = client.get(f"/api/verifications/{sample_skill.id}", headers=job_seeker_headers)
    assert single_v.status_code == status.HTTP_200_OK
    assert single_v.json()["score"] == 75.0


def test_assessment_question_audio(client, job_seeker_headers, sample_skill, mock_questions):
    client.post(
        "/api/skills/my-skills",
        headers=job_seeker_headers,
        json={"skill_id": sample_skill.id, "claimed_level": "intermediate"},
    )
    with patch("backend.routes.assessments.generate_questions", return_value=mock_questions):
        start_res = client.post(
            "/api/assessments/start",
            headers=job_seeker_headers,
            json={"skill_id": sample_skill.id, "difficulty_level": "intermediate"},
        )
    assessment_id = start_res.json()["id"]
    q_res = client.get(f"/api/assessments/{assessment_id}/questions", headers=job_seeker_headers)
    q1 = q_res.json()[0]

    with patch("backend.routes.assessments.settings.MSINGI_API_KEY", "test_key"), \
         patch("backend.services.msingi_service.create_speech", return_value=b"RIFFWAVE"):
        audio_res = client.get(
            f"/api/assessments/{assessment_id}/questions/{q1['id']}/audio",
            headers=job_seeker_headers,
        )
        assert audio_res.status_code == status.HTTP_200_OK
        assert audio_res.headers["content-type"] == "audio/wav"
        assert audio_res.content == b"RIFFWAVE"



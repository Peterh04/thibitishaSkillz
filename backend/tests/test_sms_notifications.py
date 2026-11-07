"""SMS helpers and stage notifications (ThriveVas mocked — no live sends)."""

from unittest.mock import MagicMock, patch

from backend.models import ApplicationStatus, Job, JobApplication, JobStatus, User, UserRole
from backend.services.notification_service import (
    notify_application_status_changed,
    notify_application_submitted,
    notify_assessment_completed,
)
from backend.services.sms_service import SmsResult, normalize_msisdn, send_sms


def test_normalize_msisdn_kenya():
    assert normalize_msisdn("0712345678") == "254712345678"
    assert normalize_msisdn("+254712345678") == "254712345678"
    assert normalize_msisdn("712345678") == "254712345678"
    assert normalize_msisdn("") is None
    assert normalize_msisdn("abc") is None


def test_send_sms_skipped_when_disabled():
    with patch("backend.services.sms_service.settings.THRIVE_SMS_ENABLED", False):
        result = send_sms("0712345678", "Habari", event="test")
    assert result.status == "skipped"
    assert result.detail == "disabled"
    assert result.to_msisdn == "254712345678"


def test_send_sms_posts_when_enabled():
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {"messageId": "msg-1", "status": "accepted"}

    with patch("backend.services.sms_service.settings.THRIVE_SMS_ENABLED", True), patch(
        "backend.services.sms_service.settings.THRIVE_SMS_API_KEY", "test-key"
    ), patch("backend.services.sms_service.settings.THRIVE_SMS_SHORT_CODE", "TSKILL"), patch(
        "backend.services.sms_service.httpx.post", return_value=mock_response
    ) as post:
        result = send_sms("0712345678", "Test message", event="unit_test")

    assert result.status == "sent"
    assert result.provider_message_id == "msg-1"
    assert post.called
    kwargs = post.call_args.kwargs
    assert "apiKey" in kwargs["json"]
    assert kwargs["json"]["mobile"] == "254712345678"


def test_notify_application_stages_call_send(db_session):
    candidate = User(
        full_name="Alice Candidate",
        email="alice-sms@example.com",
        password_hash="x",
        role=UserRole.job_seeker,
        phone_number="0711111111",
    )
    employer = User(
        full_name="Bob Employer",
        email="bob-sms@example.com",
        password_hash="x",
        role=UserRole.employer,
        phone_number="0722222222",
    )
    db_session.add_all([candidate, employer])
    db_session.flush()
    job = Job(
        employer_id=employer.id,
        title="Backend Engineer",
        description="Build APIs",
        status=JobStatus.published,
        location="Nairobi",
    )
    db_session.add(job)
    db_session.flush()
    application = JobApplication(
        job_id=job.id,
        candidate_id=candidate.id,
        application_status=ApplicationStatus.pending,
        match_score=80.0,
    )
    db_session.add(application)
    db_session.commit()

    skipped = SmsResult(status="skipped", provider="thrivevas", to_msisdn="254711111111", detail="disabled")
    with patch("backend.services.notification_service.send_sms", return_value=skipped) as mocked:
        notify_application_submitted(
            db_session, candidate=candidate, employer=employer, job=job, application=application
        )
        assert mocked.call_count == 2

        application.application_status = ApplicationStatus.shortlisted
        notify_application_status_changed(
            db_session, candidate=candidate, employer=employer, job=job, application=application
        )
        assert mocked.call_count == 4


def test_notify_assessment_completed_message(db_session, job_seeker_user):
    job_seeker_user.phone_number = "0700000000"
    db_session.commit()
    skipped = SmsResult(status="skipped", provider="thrivevas", to_msisdn="254700000000", detail="disabled")
    with patch("backend.services.notification_service.send_sms", return_value=skipped) as mocked:
        notify_assessment_completed(
            db_session,
            job_seeker_user,
            skill_name="Python",
            percentage=72.0,
            passed=True,
            assessment_id=1,
        )
        assert mocked.call_count == 1
        args, kwargs = mocked.call_args
        assert "Python" in args[1]
        assert kwargs["event"] == "assessment_passed"

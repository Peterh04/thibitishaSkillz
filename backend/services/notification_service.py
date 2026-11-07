"""Stage-based SMS notifications for candidates and employers.

SMS failures never break the main API flow. Messages are short, PII-light
(no passwords, tokens, or full CV text), and only sent when a phone exists.
"""

from __future__ import annotations

import logging
from sqlalchemy.orm import Session

from backend.models import (
    ApplicationStatus,
    Job,
    JobApplication,
    SmsDeliveryStatus,
    SmsNotificationLog,
    User,
)
from backend.services.sms_service import SmsResult, send_sms

logger = logging.getLogger("thibitisha.notifications")

APP = "Thibitisha Skills"


def _persist(
    db: Session | None,
    *,
    event: str,
    role: str,
    user: User | None,
    result: SmsResult,
    related_type: str | None = None,
    related_id: int | None = None,
    body: str | None = None,
) -> None:
    if db is None:
        return
    try:
        status = SmsDeliveryStatus.pending
        if result.status == "sent":
            status = SmsDeliveryStatus.sent
        elif result.status == "skipped":
            status = SmsDeliveryStatus.skipped
        else:
            status = SmsDeliveryStatus.failed
        db.add(
            SmsNotificationLog(
                event_key=event,
                recipient_role=role,
                user_id=user.id if user else None,
                to_msisdn=result.to_msisdn,
                body_preview=(body or "")[:160] or None,
                related_type=related_type,
                related_id=related_id,
                provider=result.provider,
                provider_message_id=result.provider_message_id,
                status=status,
                error_detail=(result.detail or "")[:255] if result.status != "sent" else None,
            )
        )
        db.commit()
    except Exception:
        logger.exception("Failed to persist SMS log event=%s", event)
        try:
            db.rollback()
        except Exception:
            pass


def notify_user(
    db: Session | None,
    user: User | None,
    *,
    event: str,
    message: str,
    role: str,
    related_type: str | None = None,
    related_id: int | None = None,
) -> SmsResult:
    phone = user.phone_number if user else None
    result = send_sms(phone, message, event=event)
    _persist(
        db,
        event=event,
        role=role,
        user=user,
        result=result,
        related_type=related_type,
        related_id=related_id,
        body=message,
    )
    return result


def notify_cv_analyzed(db: Session, candidate: User, *, skill_count: int) -> None:
    msg = (
        f"{APP}: Habari {candidate.full_name.split()[0]}, "
        f"CV yako imechanganuliwa. Skills zilizotambuliwa: {skill_count}. "
        f"Endelea na voice interview au assessment."
    )
    notify_user(db, candidate, event="cv_analyzed", message=msg, role="candidate", related_type="user", related_id=candidate.id)


def notify_voice_interview_completed(
    db: Session, candidate: User, *, percentage: float | None, interview_id: int
) -> None:
    score_bit = f" Alama: {percentage:.0f}%." if percentage is not None else ""
    msg = (
        f"{APP}: Voice interview yako imekamilika.{score_bit} "
        f"Unaweza kuendelea na skill assessment."
    )
    notify_user(
        db,
        candidate,
        event="voice_interview_completed",
        message=msg,
        role="candidate",
        related_type="voice_interview",
        related_id=interview_id,
    )


def notify_assessment_completed(
    db: Session,
    candidate: User,
    *,
    skill_name: str,
    percentage: float,
    passed: bool,
    assessment_id: int,
) -> None:
    outcome = "umefaulu" if passed else "hujafaulu"
    msg = (
        f"{APP}: Assessment ya {skill_name} imekamilika — {outcome} "
        f"({percentage:.0f}%). Angalia matokeo kwenye akaunti yako."
    )
    notify_user(
        db,
        candidate,
        event="assessment_passed" if passed else "assessment_failed",
        message=msg,
        role="candidate",
        related_type="assessment",
        related_id=assessment_id,
    )


def notify_application_submitted(
    db: Session,
    *,
    candidate: User,
    employer: User | None,
    job: Job,
    application: JobApplication,
) -> None:
    cand_msg = (
        f"{APP}: Maombi yako kwa '{job.title}' yamewasilishwa. "
        f"Tutakujulisha ukichujwa au kukubaliwa."
    )
    notify_user(
        db,
        candidate,
        event="application_submitted_candidate",
        message=cand_msg,
        role="candidate",
        related_type="application",
        related_id=application.id,
    )
    if employer is not None:
        match = f" Match: {application.match_score:.0f}%." if application.match_score is not None else ""
        emp_msg = (
            f"{APP}: {candidate.full_name} ameomba nafasi '{job.title}'.{match} "
            f"Fungua dashboard kukagua."
        )
        notify_user(
            db,
            employer,
            event="application_submitted_employer",
            message=emp_msg,
            role="employer",
            related_type="application",
            related_id=application.id,
        )


def notify_application_status_changed(
    db: Session,
    *,
    candidate: User,
    employer: User | None,
    job: Job,
    application: JobApplication,
) -> None:
    status = application.application_status
    if status == ApplicationStatus.shortlisted:
        cand_msg = (
            f"{APP}: Hongera! Umechujwa (shortlisted) kwa '{job.title}'. "
            f"Employer atawasiliana nawe."
        )
        emp_msg = f"{APP}: Umemchagua {candidate.full_name} kwa '{job.title}'."
        event_c, event_e = "application_shortlisted_candidate", "application_shortlisted_employer"
    elif status == ApplicationStatus.accepted:
        cand_msg = f"{APP}: Hongera! Umekubaliwa kwa '{job.title}'."
        emp_msg = f"{APP}: Umemkubali {candidate.full_name} kwa '{job.title}'."
        event_c, event_e = "application_accepted_candidate", "application_accepted_employer"
    elif status == ApplicationStatus.rejected:
        cand_msg = (
            f"{APP}: Maombi yako kwa '{job.title}' hayajakubaliwa kwa sasa. "
            f"Endelea kuthibitisha skills zako."
        )
        emp_msg = f"{APP}: Umemkatalia {candidate.full_name} kwa '{job.title}'."
        event_c, event_e = "application_rejected_candidate", "application_rejected_employer"
    else:
        cand_msg = f"{APP}: Hali ya maombi yako kwa '{job.title}' sasa ni: {status.value}."
        emp_msg = None
        event_c, event_e = "application_status_candidate", "application_status_employer"

    notify_user(
        db,
        candidate,
        event=event_c,
        message=cand_msg,
        role="candidate",
        related_type="application",
        related_id=application.id,
    )
    if employer is not None and emp_msg:
        notify_user(
            db,
            employer,
            event=event_e,
            message=emp_msg,
            role="employer",
            related_type="application",
            related_id=application.id,
        )


def notify_job_published(db: Session, employer: User, job: Job) -> None:
    msg = f"{APP}: Nafasi '{job.title}' sasa ni published na inaonekana kwa waombaji."
    notify_user(
        db,
        employer,
        event="job_published",
        message=msg,
        role="employer",
        related_type="job",
        related_id=job.id,
    )

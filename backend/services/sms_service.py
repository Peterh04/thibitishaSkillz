"""ThriveVas / Thrive Wave SMS client.

Provider docs: https://docs.thrivevas.com
Public product: https://thrivevas.com/solutions/sms

Credentials stay server-side. When THRIVE_SMS_ENABLED is false or the API key
is missing, send_sms logs and returns skipped — never raises into product flows.
Exact request path/payload can be adjusted when working credentials arrive.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass
from typing import Any

import httpx

from backend.config import settings

logger = logging.getLogger("thibitisha.sms")


class SmsError(Exception):
    """Thrive SMS request failed."""

    def __init__(self, message: str, *, status_code: int | None = None):
        super().__init__(message)
        self.status_code = status_code


@dataclass(frozen=True)
class SmsResult:
    status: str  # sent | skipped | failed
    provider: str
    to_msisdn: str | None
    provider_message_id: str | None = None
    detail: str | None = None


def normalize_msisdn(phone: str | None, default_country: str | None = None) -> str | None:
    """Normalize to digits-only international form (Kenya default 254…)."""
    if not phone:
        return None
    raw = phone.strip()
    if not raw:
        return None
    digits = re.sub(r"\D+", "", raw)
    if not digits:
        return None
    country = (default_country or settings.THRIVE_SMS_DEFAULT_COUNTRY_CODE or "254").strip()
    if digits.startswith("0") and len(digits) == 10:
        digits = country + digits[1:]
    elif len(digits) == 9 and digits.startswith("7"):
        digits = country + digits
    elif digits.startswith("2540") and len(digits) == 13:
        digits = "254" + digits[4:]
    if len(digits) < 10 or len(digits) > 15:
        return None
    return digits


def sms_ready() -> bool:
    return bool(settings.THRIVE_SMS_ENABLED and settings.THRIVE_SMS_API_KEY.strip())


def _build_payload(msisdn: str, message: str) -> dict[str, Any]:
    """Request body shaped for ThriveVas-style gateways; overridable via config later."""
    payload: dict[str, Any] = {
        "apiKey": settings.THRIVE_SMS_API_KEY.strip(),
        "shortCode": settings.THRIVE_SMS_SHORT_CODE.strip() or "ThriveVas",
        "origin": settings.THRIVE_SMS_ORIGIN.strip() or "API_INTERFACE",
        "mobile": msisdn,
        "message": message,
        "to": msisdn,
        "text": message,
    }
    if settings.THRIVE_SMS_SENDER_ID.strip():
        payload["senderId"] = settings.THRIVE_SMS_SENDER_ID.strip()
        payload["from"] = settings.THRIVE_SMS_SENDER_ID.strip()
    return payload


def _headers() -> dict[str, str]:
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    key = settings.THRIVE_SMS_API_KEY.strip()
    style = (settings.THRIVE_SMS_AUTH_STYLE or "body_key").strip().lower()
    if style == "bearer" and key:
        headers["Authorization"] = f"Bearer {key}"
    elif style == "header_apikey" and key:
        headers["apiKey"] = key
        headers["X-API-Key"] = key
    return headers


def send_sms(to_phone: str | None, message: str, *, event: str = "generic") -> SmsResult:
    """Send one SMS. Never raises — product routes must stay available if SMS is down."""
    text = (message or "").strip()
    if not text:
        return SmsResult(status="skipped", provider="thrivevas", to_msisdn=None, detail="empty_message")

    msisdn = normalize_msisdn(to_phone)
    if not msisdn:
        logger.info("SMS skipped event=%s reason=invalid_phone", event)
        return SmsResult(status="skipped", provider="thrivevas", to_msisdn=None, detail="invalid_phone")

    if not settings.THRIVE_SMS_ENABLED:
        logger.info("SMS skipped event=%s to=%s reason=disabled", event, msisdn)
        return SmsResult(status="skipped", provider="thrivevas", to_msisdn=msisdn, detail="disabled")

    if not settings.THRIVE_SMS_API_KEY.strip():
        logger.info("SMS skipped event=%s to=%s reason=missing_api_key", event, msisdn)
        return SmsResult(status="skipped", provider="thrivevas", to_msisdn=msisdn, detail="missing_api_key")

    base = settings.THRIVE_SMS_BASE_URL.rstrip("/")
    path = settings.THRIVE_SMS_SEND_PATH.strip() or "/"
    if not path.startswith("/"):
        path = "/" + path
    url = f"{base}{path}"

    try:
        response = httpx.post(
            url,
            headers=_headers(),
            json=_build_payload(msisdn, text),
            timeout=30.0,
        )
    except httpx.HTTPError as exc:
        logger.warning("SMS network error event=%s error=%s", event, exc.__class__.__name__)
        return SmsResult(
            status="failed",
            provider="thrivevas",
            to_msisdn=msisdn,
            detail="network_error",
        )

    if response.status_code >= 400:
        logger.warning(
            "SMS provider rejected event=%s status=%s",
            event,
            response.status_code,
        )
        return SmsResult(
            status="failed",
            provider="thrivevas",
            to_msisdn=msisdn,
            detail=f"http_{response.status_code}",
        )

    message_id = None
    try:
        data = response.json()
        if isinstance(data, dict):
            nested = data.get("data") if isinstance(data.get("data"), dict) else {}
            message_id = (
                data.get("messageId")
                or data.get("message_id")
                or data.get("id")
                or nested.get("messageId")
                or nested.get("id")
            )
    except Exception:
        message_id = None

    logger.info("SMS sent event=%s to=%s", event, msisdn)
    return SmsResult(
        status="sent",
        provider="thrivevas",
        to_msisdn=msisdn,
        provider_message_id=str(message_id) if message_id else None,
        detail="ok",
    )

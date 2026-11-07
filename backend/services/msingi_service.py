"""MsingiAI speech client (TTS + STT).

Docs: https://platform.msingiai.com/docs
Base URL: https://api.msingiai.com

API key must stay on the server (Authorization: Bearer msk_...).
Never log the key or raw audio payloads.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx

from backend.config import settings

logger = logging.getLogger("thibitisha.msingi")


class MsingiError(Exception):
    """MsingiAI request failed or returned a non-success response."""

    def __init__(self, message: str, *, status_code: int | None = None, request_id: str | None = None):
        super().__init__(message)
        self.status_code = status_code
        self.request_id = request_id


def _require_key() -> str:
    key = settings.MSINGI_API_KEY.strip()
    if not key:
        raise MsingiError("MsingiAI is not configured. Set MSINGI_API_KEY in backend/.env.")
    return key


def _headers() -> dict[str, str]:
    return {"Authorization": f"Bearer {_require_key()}"}


def _base() -> str:
    return settings.MSINGI_BASE_URL.rstrip("/")


def _parse_error(response: httpx.Response) -> MsingiError:
    request_id = response.headers.get("X-Request-ID")
    try:
        payload = response.json()
        err = payload.get("error") if isinstance(payload, dict) else None
        if isinstance(err, dict):
            message = str(err.get("message") or "MsingiAI request failed")
            request_id = err.get("request_id") or request_id
            return MsingiError(message, status_code=response.status_code, request_id=request_id)
    except Exception:
        pass
    if response.status_code == 401:
        return MsingiError("MsingiAI rejected the API key.", status_code=401, request_id=request_id)
    if response.status_code == 402:
        return MsingiError("MsingiAI workspace has insufficient credit.", status_code=402, request_id=request_id)
    if response.status_code == 403:
        return MsingiError("MsingiAI key is not permitted for this operation.", status_code=403, request_id=request_id)
    if response.status_code == 429:
        return MsingiError("MsingiAI rate limit hit. Retry shortly.", status_code=429, request_id=request_id)
    return MsingiError(
        f"MsingiAI request failed with HTTP {response.status_code}.",
        status_code=response.status_code,
        request_id=request_id,
    )


def create_speech(text: str, voice_id: str | None = None, language: str | None = None) -> bytes:
    """POST /v1/audio/speech → WAV bytes.

    Msingi documents Kiswahili as the primary TTS language; English text is also
    accepted by the same endpoint for bilingual interviews (quality may vary).
    """
    cleaned = (text or "").strip()
    if not cleaned:
        raise MsingiError("Speech text is empty.")
    if len(cleaned) > 2000:
        cleaned = cleaned[:2000]
    voice = (voice_id or settings.MSINGI_DEFAULT_VOICE_ID or "female4").strip()
    payload: dict[str, Any] = {"text": cleaned, "voice_id": voice}
    # Optional hint only — ignored if the API rejects unknown fields (we strip on 422).
    lang = (language or "").strip().lower()
    if lang in {"sw", "en"}:
        payload["language"] = lang
    try:
        response = httpx.post(
            f"{_base()}/v1/audio/speech",
            headers={**_headers(), "Content-Type": "application/json"},
            json=payload,
            timeout=120.0,
        )
        # Some workspaces may reject unknown "language" — retry without it.
        if response.status_code == 422 and "language" in payload:
            payload.pop("language", None)
            response = httpx.post(
                f"{_base()}/v1/audio/speech",
                headers={**_headers(), "Content-Type": "application/json"},
                json=payload,
                timeout=120.0,
            )
    except httpx.HTTPError as exc:
        logger.warning("Msingi TTS network error: %s", exc.__class__.__name__)
        raise MsingiError("MsingiAI speech service is unreachable.") from exc
    if response.status_code != 200:
        raise _parse_error(response)
    if not response.content:
        raise MsingiError("MsingiAI returned empty audio.")
    return response.content


def transcribe_audio(content: bytes, filename: str = "answer.wav") -> dict[str, Any]:
    """POST /v1/audio/transcriptions → transcript JSON."""
    if not content:
        raise MsingiError("Audio file is empty.")
    try:
        response = httpx.post(
            f"{_base()}/v1/audio/transcriptions",
            headers=_headers(),
            files={"file": (filename, content, "application/octet-stream")},
            timeout=120.0,
        )
    except httpx.HTTPError as exc:
        logger.warning("Msingi STT network error: %s", exc.__class__.__name__)
        raise MsingiError("MsingiAI transcription service is unreachable.") from exc
    if response.status_code != 200:
        raise _parse_error(response)
    data = response.json()
    if not isinstance(data, dict) or "text" not in data:
        raise MsingiError("MsingiAI returned an unexpected transcription payload.")
    return data


def list_voices() -> list[dict[str, Any]]:
    """GET /v1/voices — non-billable inventory check."""
    try:
        response = httpx.get(f"{_base()}/v1/voices", headers=_headers(), timeout=30.0)
    except httpx.HTTPError as exc:
        raise MsingiError("MsingiAI voices endpoint is unreachable.") from exc
    if response.status_code != 200:
        raise _parse_error(response)
    data = response.json()
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("voices", "data", "items"):
            if isinstance(data.get(key), list):
                return data[key]
    return []

"""Small helpers shared across the backend."""

import re
from datetime import datetime, timezone


def utcnow() -> datetime:
    """Current UTC time stored without timezone info (MySQL DATETIME)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


def skill_name_key(name: str) -> str:
    """Lower-case key so 'Python' and 'python' are the same skill."""
    collapsed = re.sub(r"\s+", " ", name.strip().lower())
    return collapsed


def compact_text(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", value.lower())


def skill_supported_by_text(skill_name: str, source_text: str) -> bool:
    """True when the skill name is actually present in the CV text."""
    if not skill_name or not source_text:
        return False
    if skill_name.lower() in source_text.lower():
        return True
    compacted_name = compact_text(skill_name)
    if len(compacted_name) < 2:
        return False
    return compacted_name in compact_text(source_text)


def clean_text(value: str, limit: int) -> str:
    cleaned = (value or "").replace("\x00", "").strip()
    if len(cleaned) > limit:
        return cleaned[:limit]
    return cleaned


def clamp(value: int, low: int, high: int) -> int:
    return max(low, min(high, value))

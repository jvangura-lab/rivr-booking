"""ISO-8601 helpers — shared so we don't duplicate the Z-stripping dance."""
from __future__ import annotations

from datetime import datetime, timezone


def parse_iso(s: str) -> datetime:
    if not isinstance(s, str):
        raise ValueError("expected ISO string")
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(timezone.utc)


def to_z(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

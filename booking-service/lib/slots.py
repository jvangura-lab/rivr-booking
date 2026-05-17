"""Slot generation from free/busy intervals.

Pure functions, no Google client dependency — easy to unit test.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Iterable
from zoneinfo import ZoneInfo

_WEEKDAY_INDEX = {
    "Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6,
}


@dataclass(frozen=True)
class Interval:
    start: datetime  # UTC aware
    end: datetime    # UTC aware

    def to_iso(self) -> dict:
        return {
            "start": self.start.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
            "end": self.end.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
        }


def _candidate_starts(
    *,
    founder_tz: ZoneInfo,
    working_hours_start: int,
    working_hours_end: int,
    working_days: list[str],
    duration_min: int,
    lookahead_days: int,
    from_utc: datetime,
) -> Iterable[datetime]:
    """Yield candidate slot start instants (UTC), aligned to founder-local working hours."""
    allowed_weekdays = {_WEEKDAY_INDEX[d] for d in working_days if d in _WEEKDAY_INDEX}
    local_now = from_utc.astimezone(founder_tz)
    # First candidate: today in founder tz, advance to next slot boundary.
    cursor_date = local_now.date()
    end_date = (local_now + timedelta(days=lookahead_days)).date()

    while cursor_date <= end_date:
        if cursor_date.weekday() in allowed_weekdays:
            day_start = datetime(
                cursor_date.year, cursor_date.month, cursor_date.day,
                working_hours_start, 0, tzinfo=founder_tz,
            )
            day_end = datetime(
                cursor_date.year, cursor_date.month, cursor_date.day,
                working_hours_end, 0, tzinfo=founder_tz,
            )
            cursor = day_start
            while cursor + timedelta(minutes=duration_min) <= day_end:
                if cursor > local_now:
                    yield cursor.astimezone(timezone.utc)
                cursor += timedelta(minutes=duration_min)
        cursor_date += timedelta(days=1)


def _overlaps(a_start: datetime, a_end: datetime, busy: list[Interval], buffer_min: int) -> bool:
    """Slot collides with any busy block (with buffer applied around the slot)."""
    buf = timedelta(minutes=buffer_min)
    s = a_start - buf
    e = a_end + buf
    for b in busy:
        if b.start < e and s < b.end:
            return True
    return False


def free_slots(
    *,
    busy: list[Interval],
    founder_tz_name: str,
    working_hours_start: int,
    working_hours_end: int,
    working_days: list[str],
    duration_min: int,
    lookahead_days: int,
    buffer_min: int,
    now_utc: datetime | None = None,
) -> list[Interval]:
    """Compute free slots in the lookahead window, honoring working hours + buffer."""
    tz = ZoneInfo(founder_tz_name)
    now = now_utc or datetime.now(timezone.utc)
    out: list[Interval] = []
    for start in _candidate_starts(
        founder_tz=tz,
        working_hours_start=working_hours_start,
        working_hours_end=working_hours_end,
        working_days=working_days,
        duration_min=duration_min,
        lookahead_days=lookahead_days,
        from_utc=now,
    ):
        end = start + timedelta(minutes=duration_min)
        if not _overlaps(start, end, busy, buffer_min):
            out.append(Interval(start=start, end=end))
    return out


def fake_busy(now_utc: datetime | None = None) -> list[Interval]:
    """Synthetic busy blocks for local dev when FAKE_CALENDAR=true."""
    now = now_utc or datetime.now(timezone.utc)
    base = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return [
        Interval(start=base + timedelta(days=1, hours=15), end=base + timedelta(days=1, hours=17)),
        Interval(start=base + timedelta(days=2, hours=18), end=base + timedelta(days=2, hours=19)),
        Interval(start=base + timedelta(days=4, hours=16), end=base + timedelta(days=4, hours=21)),
        Interval(start=base + timedelta(days=7, hours=17, minutes=30), end=base + timedelta(days=7, hours=19)),
    ]

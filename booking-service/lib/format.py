"""Human-readable time formatting in a target timezone."""
from __future__ import annotations

from datetime import datetime
from urllib.parse import urlencode
from zoneinfo import ZoneInfo


def display_when(*, start_utc: datetime, end_utc: datetime, tz_name: str) -> tuple[str, str]:
    """Return (when_display, tz_display).

    Example: ("Tuesday, May 19 · 9:30–10:00 AM", "Pacific Time (PT)")
    """
    tz = ZoneInfo(tz_name)
    s = start_utc.astimezone(tz)
    e = end_utc.astimezone(tz)
    weekday = s.strftime("%A")
    month_day = s.strftime("%B %-d")
    start_hm = s.strftime("%-I:%M").lstrip()
    end_hm = e.strftime("%-I:%M %p")
    when = f"{weekday}, {month_day} · {start_hm}–{end_hm}"
    tz_disp = f"{tz_name} ({s.strftime('%Z')})"
    return when, tz_disp


def google_calendar_url(*, summary: str, description: str, start_utc: datetime, end_utc: datetime) -> str:
    """Build a `https://calendar.google.com/calendar/render?action=TEMPLATE` URL."""
    params = {
        "action": "TEMPLATE",
        "text": summary,
        "details": description,
        "dates": (
            start_utc.strftime("%Y%m%dT%H%M%SZ")
            + "/"
            + end_utc.strftime("%Y%m%dT%H%M%SZ")
        ),
    }
    return "https://calendar.google.com/calendar/render?" + urlencode(params)

"""Google Calendar wrapper.

Two public functions:
  fetch_busy()  — freebusy.query for the impersonated calendar over the lookahead window
  create_event() — create a booking event with Google Meet conference data
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone
from typing import Iterable

from googleapiclient.discovery import build

import config
from lib import auth
from lib.slots import Interval
from lib.logging_setup import log_event

log = logging.getLogger(__name__)


def _service():
    return build("calendar", "v3", credentials=auth.calendar_credentials(), cache_discovery=False)


def fetch_busy(*, lookahead_days: int, now_utc: datetime | None = None) -> list[Interval]:
    now = now_utc or datetime.now(timezone.utc)
    end = now + timedelta(days=lookahead_days + 1)
    body = {
        "timeMin": now.isoformat().replace("+00:00", "Z"),
        "timeMax": end.isoformat().replace("+00:00", "Z"),
        "items": [{"id": "primary"}],
        "timeZone": "UTC",
    }
    resp = _service().freebusy().query(body=body).execute()
    busy_raw: list[dict] = resp.get("calendars", {}).get("primary", {}).get("busy", []) or []
    out: list[Interval] = []
    for b in busy_raw:
        try:
            out.append(Interval(
                start=_parse_iso(b["start"]),
                end=_parse_iso(b["end"]),
            ))
        except (KeyError, ValueError):
            continue
    return out


def is_slot_free(*, slot_start: datetime, slot_end: datetime, buffer_min: int) -> bool:
    """Re-check a specific slot via freebusy. Used at /api/book time to defend against races."""
    buf = timedelta(minutes=buffer_min)
    body = {
        "timeMin": (slot_start - buf).isoformat().replace("+00:00", "Z"),
        "timeMax": (slot_end + buf).isoformat().replace("+00:00", "Z"),
        "items": [{"id": "primary"}],
        "timeZone": "UTC",
    }
    resp = _service().freebusy().query(body=body).execute()
    busy = resp.get("calendars", {}).get("primary", {}).get("busy", []) or []
    return len(busy) == 0


def create_event(
    *,
    summary: str,
    description: str,
    slot_start: datetime,
    slot_end: datetime,
    attendees: list[str],
) -> dict:
    """Create a Calendar event with a Google Meet link. Returns the event payload."""
    request_id = f"rivr-booking-{uuid.uuid4().hex}"
    body = {
        "summary": summary,
        "description": description,
        "start": {"dateTime": slot_start.isoformat().replace("+00:00", "Z"), "timeZone": "UTC"},
        "end": {"dateTime": slot_end.isoformat().replace("+00:00", "Z"), "timeZone": "UTC"},
        "attendees": [{"email": e} for e in attendees],
        "conferenceData": {
            "createRequest": {
                "requestId": request_id,
                "conferenceSolutionKey": {"type": "hangoutsMeet"},
            }
        },
        "reminders": {"useDefault": True},
        "guestsCanInviteOthers": False,
        "guestsCanModify": False,
    }
    event = (
        _service()
        .events()
        .insert(
            calendarId="primary",
            body=body,
            conferenceDataVersion=1,
            sendUpdates="all",
        )
        .execute()
    )
    log_event(
        log, logging.INFO, "calendar.event_created",
        event_id=event.get("id"), slot_start=body["start"]["dateTime"],
    )
    return event


def _parse_iso(s: str) -> datetime:
    """Parse a Google-returned ISO timestamp into a UTC-aware datetime."""
    if s.endswith("Z"):
        s = s[:-1] + "+00:00"
    return datetime.fromisoformat(s).astimezone(timezone.utc)

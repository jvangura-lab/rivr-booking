"""GET /api/availability?from=YYYY-MM-DD&days=14&tz=Area/Zone

Returns free 30-min slots over the lookahead window. Times are always returned
in UTC; the widget renders in user-local time.

When FAKE_CALENDAR=true, returns slots based on a synthetic busy list — no
Google credentials required. Useful for frontend dev.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request

import config
from lib import slots as slots_lib
from lib.logging_setup import log_event

bp = Blueprint("availability", __name__)
log = logging.getLogger(__name__)


@bp.get("/api/availability")
def availability():
    started = datetime.now(timezone.utc)

    days = int(request.args.get("days", config.LOOKAHEAD_DAYS))
    days = max(1, min(days, 30))
    tz_param = request.args.get("tz") or config.FOUNDER_TIMEZONE  # for response context only

    if config.FAKE_CALENDAR:
        busy = slots_lib.fake_busy(now_utc=started)
    else:
        # Real calendar integration arrives in Phase B.
        from lib import calendar as calendar_lib  # local import: keeps health/fake paths Google-free
        try:
            busy = calendar_lib.fetch_busy(lookahead_days=days, now_utc=started)
        except Exception as e:
            log_event(log, logging.ERROR, "availability.calendar_error", error=str(e))
            return jsonify(error="calendar_unavailable"), 503

    free = slots_lib.free_slots(
        busy=busy,
        founder_tz_name=config.FOUNDER_TIMEZONE,
        working_hours_start=config.WORKING_HOURS_START,
        working_hours_end=config.WORKING_HOURS_END,
        working_days=config.WORKING_DAYS,
        duration_min=config.MEETING_DURATION_MIN,
        lookahead_days=days,
        buffer_min=config.BUFFER_MIN,
        now_utc=started,
    )

    duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    log_event(
        log, logging.INFO, "availability.served",
        slot_count=len(free), days=days, tz=tz_param,
        fake=config.FAKE_CALENDAR, duration_ms=duration_ms,
    )

    return jsonify(
        slots=[s.to_iso() for s in free],
        founder_tz=config.FOUNDER_TIMEZONE,
        duration_min=config.MEETING_DURATION_MIN,
        generated_at=started.isoformat().replace("+00:00", "Z"),
    )

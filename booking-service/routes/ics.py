"""GET /api/booking/<id>.ics — serve an ICS file so Apple/Outlook can import the event."""
from __future__ import annotations

from flask import Blueprint, Response

import config
from lib import bookings, ics as ics_lib

bp = Blueprint("ics", __name__)


@bp.get("/api/booking/<booking_id>.ics")
def ics(booking_id: str):
    b = bookings.store.get(booking_id)
    if not b:
        return ("not found", 404)
    body = ics_lib.build_ics(
        uid=b.id,
        summary=b.summary,
        description=f"{b.description}\n\nMeet: {b.meet_url}",
        location=b.meet_url,
        start_utc=b.slot_start,
        end_utc=b.slot_end,
        organizer_email=config.IMPERSONATE_USER or "rivr@example.com",
    )
    return Response(
        body,
        mimetype="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="rivr-{booking_id}.ics"'},
    )

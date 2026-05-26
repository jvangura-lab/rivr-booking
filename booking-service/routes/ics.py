"""GET /api/booking/<id>.ics — serve an ICS file so Apple/Outlook can import the event."""
from __future__ import annotations

import html

from flask import Blueprint, Response

import config
from lib import bookings, ics as ics_lib

bp = Blueprint("ics", __name__)


@bp.get("/api/booking/<booking_id>.ics")
def ics(booking_id: str):
    b = bookings.store.get(booking_id)
    if not b:
        return _render_expired(booking_id)
    body = ics_lib.build_ics(
        uid=b.id,
        summary=b.summary,
        description=f"{b.description}\n\nMeet: {b.meet_url}",
        location=b.meet_url,
        start_utc=b.slot_start,
        end_utc=b.slot_end,
        organizer_email=config.IMPERSONATE_USER,
    )
    return Response(
        body,
        mimetype="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="rivr-{booking_id}.ics"'},
    )


def _render_expired(booking_id: str) -> Response:
    contact = html.escape(config.IMPERSONATE_USER)
    safe_id = html.escape(booking_id)
    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>This link has expired</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
</head>
<body style="margin:0;padding:0;background:#FAFAFA;font-family:Inter,-apple-system,Segoe UI,sans-serif;color:#111111;">
  <div style="max-width:480px;margin:96px auto;padding:0 24px;text-align:center;">
    <div style="font-size:12px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#525252;">RIVR</div>
    <h1 style="font-family:'Instrument Serif',Georgia,serif;font-size:32px;line-height:1.15;margin:24px 0 12px;color:#111111;letter-spacing:-0.015em;font-weight:400;">
      This link has expired.
    </h1>
    <p style="font-size:16px;line-height:1.6;color:#525252;margin:0 0 28px;">
      Calendar attachments are only kept for a short window. Your meeting is still on the calendar — if you need a fresh invite, just reach out.
    </p>
    <a href="mailto:{contact}?subject=Booking%20{safe_id}" style="display:inline-block;background:#C9A875;color:#FFFFFF;font-weight:500;font-size:15px;padding:13px 22px;border-radius:8px;text-decoration:none;">
      Contact {contact}
    </a>
    <div style="font-size:13px;color:#A3A3A3;margin-top:40px;">
      RIVR · the booking layer for service businesses
    </div>
  </div>
</body>
</html>
"""
    return Response(page, status=410, mimetype="text/html")

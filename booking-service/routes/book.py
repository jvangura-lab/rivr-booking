"""POST /api/book — turn a hold into a real Calendar event + send confirmation email.

Flow:
  1. Validate body + hold token
  2. Re-check slot is free (race protection) — skipped under FAKE_CALENDAR
  3. Create Calendar event w/ Meet link
  4. Persist booking record (for the ICS endpoint)
  5. Send Gmail confirmation
  6. Return booking_id + meet_url + add-to-calendar links
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone

from flask import Blueprint, jsonify, request, url_for

import config
from lib import bookings, format as fmt
from lib.holds import store as hold_store
from lib.iso import parse_iso, to_z
from lib.logging_setup import log_event

bp = Blueprint("book", __name__)
log = logging.getLogger(__name__)


def _hash_email(email: str) -> str:
    import hashlib
    return hashlib.sha256(email.lower().encode("utf-8")).hexdigest()[:12]


@bp.post("/api/book")
def book():
    started = datetime.now(timezone.utc)
    body = request.get_json(silent=True) or {}

    # ─── Validate input ──────────────────────────────────────────────────
    try:
        hold_token = body["hold_token"]
        slot_start = parse_iso(body["slot_start"])
        slot_end = parse_iso(body["slot_end"])
        contact = body["contact"]
        name = contact["name"].strip()
        email = contact["email"].strip()
        if not name or "@" not in email:
            raise ValueError("contact")
    except (KeyError, ValueError, AttributeError, TypeError):
        return jsonify(error="invalid_request"), 400

    tz_name = body.get("tz") or config.FOUNDER_TIMEZONE
    qualification = body.get("qualification", {}) or {}
    website = (contact.get("website") or "").strip()
    role = (contact.get("role") or "").strip()

    # ─── Hold check ──────────────────────────────────────────────────────
    held = hold_store.claim(hold_token)
    if not held or held.slot_start != slot_start or held.slot_end != slot_end:
        log_event(log, logging.WARNING, "book.hold_invalid", email_hash=_hash_email(email))
        return jsonify(error="hold_expired"), 410

    # ─── Slot re-check + event creation ──────────────────────────────────
    summary = f"RIVR walkthrough · {name}"
    description_lines = [
        f"Name: {name}",
        f"Email: {email}",
    ]
    if website:
        description_lines.append(f"Website: {website}")
    if role:
        description_lines.append(f"Role: {role}")
    if qualification:
        description_lines.append("")
        description_lines.append("Qualification:")
        for k, v in qualification.items():
            description_lines.append(f"  {k}: {v}")
    description = "\n".join(description_lines)

    attendees = [email] + [g for g in config.GUEST_EMAILS if g and g != email]

    if config.FAKE_CALENDAR:
        # Dev-mode mock: synthesize a booking without touching Google.
        import uuid as _uuid
        suffix = _uuid.uuid4().hex[:12]
        event_id = f"fake-{suffix}"
        meet_url = f"https://meet.google.com/fake-{suffix}"
    else:
        from lib import calendar as calendar_lib
        try:
            if not calendar_lib.is_slot_free(
                slot_start=slot_start, slot_end=slot_end, buffer_min=config.BUFFER_MIN
            ):
                log_event(log, logging.INFO, "book.slot_taken", email_hash=_hash_email(email))
                return jsonify(error="slot_taken"), 409
            event = calendar_lib.create_event(
                summary=summary,
                description=description,
                slot_start=slot_start,
                slot_end=slot_end,
                attendees=attendees,
            )
            event_id = event.get("id", "")
            meet_url = event.get("hangoutLink") or ""
            if not meet_url:
                # Fall back to conference data entry points if hangoutLink is missing.
                entries = (event.get("conferenceData") or {}).get("entryPoints") or []
                for e in entries:
                    if e.get("entryPointType") == "video" and e.get("uri"):
                        meet_url = e["uri"]
                        break
        except Exception as exc:
            log.exception("book.calendar_failed")
            return jsonify(error="calendar_unavailable"), 503

    # ─── Persist booking record ─────────────────────────────────────────
    bookings.store.put(bookings.Booking(
        id=event_id,
        slot_start=slot_start,
        slot_end=slot_end,
        attendee_email=email,
        attendee_name=name,
        meet_url=meet_url,
        summary=summary,
        description=description,
    ))

    when_display, tz_display = fmt.display_when(start_utc=slot_start, end_utc=slot_end, tz_name=tz_name)
    google_url = fmt.google_calendar_url(
        summary=summary, description=f"{description}\n\nMeet: {meet_url}",
        start_utc=slot_start, end_utc=slot_end,
    )
    ics_url = url_for("ics.ics", booking_id=event_id, _external=True)

    # ─── Confirmation email ────────────────────────────────────────────
    subject_suffix = when_display.split(" · ")[0]  # "Tuesday, May 19"
    if config.FAKE_CALENDAR:
        log_event(log, logging.INFO, "gmail.skipped_fake_mode", to=email)
    else:
        try:
            from lib import gmail
            gmail.send_confirmation(
                to_email=email,
                to_name=name,
                when_display=when_display,
                tz_display=tz_display,
                meet_url=meet_url,
                google_url=google_url,
                ics_url=ics_url,
                subject_suffix=subject_suffix,
            )
        except Exception as exc:
            # Don't fail the booking — event is already created.
            log_event(
                log, logging.ERROR, "book.email_failed",
                booking_id=event_id,
                email_hash=_hash_email(email),
                slot_start=to_z(slot_start),
                error_type=type(exc).__name__,
                error=str(exc),
                exc_info=True,
            )

    duration_ms = int((datetime.now(timezone.utc) - started).total_seconds() * 1000)
    log_event(
        log, logging.INFO, "book.success",
        booking_id=event_id, email_hash=_hash_email(email),
        slot_start=to_z(slot_start), duration_ms=duration_ms,
    )

    return jsonify(
        booking_id=event_id,
        meet_url=meet_url,
        when_display=when_display,
        tz_display=tz_display,
        calendar_links={
            "google": google_url,
            "ics": ics_url,
        },
    )

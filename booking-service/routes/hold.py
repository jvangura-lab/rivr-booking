"""POST /api/hold — issue a 5-minute hold on a slot."""
from __future__ import annotations

import logging

from flask import Blueprint, jsonify, request

from lib.holds import store, SlotAlreadyHeld
from lib.logging_setup import log_event
from lib.iso import parse_iso

bp = Blueprint("hold", __name__)
log = logging.getLogger(__name__)


@bp.post("/api/hold")
def hold():
    body = request.get_json(silent=True) or {}
    try:
        slot_start = parse_iso(body["slot_start"])
        slot_end = parse_iso(body["slot_end"])
    except (KeyError, ValueError):
        return jsonify(error="invalid_slot"), 400

    try:
        h = store.create(slot_start=slot_start, slot_end=slot_end)
    except SlotAlreadyHeld:
        log_event(log, logging.INFO, "hold.conflict", slot_start=body["slot_start"])
        return jsonify(error="slot_held"), 409

    log_event(log, logging.INFO, "hold.created", token=h.token, slot_start=body["slot_start"])
    return jsonify(
        hold_token=h.token,
        expires_at=h.expires_at.isoformat().replace("+00:00", "Z"),
    )

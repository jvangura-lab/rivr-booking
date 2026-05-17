"""In-memory booking record store (process-local, mirrors holds.py).

Stores just enough for the ICS endpoint to reconstruct a calendar invite
after the user clicks Apple/Outlook from the confirmation page. If we ever
need durable history, swap to Firestore.
"""
from __future__ import annotations

import threading
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class Booking:
    id: str
    slot_start: datetime  # UTC
    slot_end: datetime    # UTC
    attendee_email: str
    attendee_name: str
    meet_url: str
    summary: str
    description: str


class BookingStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_id: dict[str, Booking] = {}

    def put(self, b: Booking) -> None:
        with self._lock:
            self._by_id[b.id] = b

    def get(self, booking_id: str) -> Booking | None:
        with self._lock:
            return self._by_id.get(booking_id)


store = BookingStore()

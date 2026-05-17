"""In-memory slot holds with a 5-minute TTL.

Safe under the single-instance Cloud Run setup (min=max=1). If we ever scale
horizontally, swap this for Firestore — the public API stays identical.
"""
from __future__ import annotations

import threading
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

HOLD_TTL_MIN = 5


@dataclass(frozen=True)
class Hold:
    token: str
    slot_start: datetime  # UTC
    slot_end: datetime    # UTC
    expires_at: datetime  # UTC


class HoldStore:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._by_token: dict[str, Hold] = {}

    def _evict_expired(self, now: datetime) -> None:
        # Caller holds the lock.
        dead = [t for t, h in self._by_token.items() if h.expires_at <= now]
        for t in dead:
            del self._by_token[t]

    def create(self, *, slot_start: datetime, slot_end: datetime) -> Hold:
        now = datetime.now(timezone.utc)
        with self._lock:
            self._evict_expired(now)
            # If someone already holds the same slot and that hold is live, return 409.
            for h in self._by_token.values():
                if h.slot_start == slot_start and h.slot_end == slot_end:
                    raise SlotAlreadyHeld(h)
            hold = Hold(
                token=uuid.uuid4().hex,
                slot_start=slot_start,
                slot_end=slot_end,
                expires_at=now + timedelta(minutes=HOLD_TTL_MIN),
            )
            self._by_token[hold.token] = hold
            return hold

    def claim(self, token: str) -> Hold | None:
        """Return + remove the hold if still live. None if missing or expired."""
        now = datetime.now(timezone.utc)
        with self._lock:
            self._evict_expired(now)
            return self._by_token.pop(token, None)

    def peek(self, token: str) -> Hold | None:
        now = datetime.now(timezone.utc)
        with self._lock:
            self._evict_expired(now)
            return self._by_token.get(token)


class SlotAlreadyHeld(Exception):
    def __init__(self, existing: Hold) -> None:
        super().__init__("slot already held")
        self.existing = existing


# Module-level singleton — process-local, dies when the container restarts. Fine for v1.
store = HoldStore()

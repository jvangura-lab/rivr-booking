"""Google service-account credentials with Domain-Wide Delegation.

Two credential sources, in order:
1. GOOGLE_SA_KEY_JSON env var (prod — value comes from Secret Manager)
2. GOOGLE_APPLICATION_CREDENTIALS file path (local dev)

The credentials impersonate IMPERSONATE_USER so Calendar + Gmail API calls run
as that founder (DWD must be enabled in the Workspace admin console for the
required scopes).
"""
from __future__ import annotations

import json
from functools import lru_cache

from google.oauth2 import service_account

import config

SCOPES_CALENDAR = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/calendar.events",
]
SCOPES_GMAIL = [
    "https://www.googleapis.com/auth/gmail.send",
]


def _load_sa_info() -> dict:
    if config.GOOGLE_SA_KEY_JSON:
        return json.loads(config.GOOGLE_SA_KEY_JSON)
    if config.GOOGLE_APPLICATION_CREDENTIALS:
        with open(config.GOOGLE_APPLICATION_CREDENTIALS, "r", encoding="utf-8") as f:
            return json.load(f)
    raise RuntimeError(
        "no Google credentials: set GOOGLE_SA_KEY_JSON or GOOGLE_APPLICATION_CREDENTIALS"
    )


@lru_cache(maxsize=4)
def _delegated_credentials(scope_tuple: tuple[str, ...]):
    if not config.IMPERSONATE_USER:
        raise RuntimeError("IMPERSONATE_USER env var is required for DWD")
    info = _load_sa_info()
    creds = service_account.Credentials.from_service_account_info(info, scopes=list(scope_tuple))
    return creds.with_subject(config.IMPERSONATE_USER)


def calendar_credentials():
    return _delegated_credentials(tuple(SCOPES_CALENDAR))


def gmail_credentials():
    return _delegated_credentials(tuple(SCOPES_GMAIL))

"""Environment-driven config. Read once at import."""
from __future__ import annotations

import os

PORT = int(os.environ.get("PORT", "8080"))
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO")

# Google auth
GOOGLE_APPLICATION_CREDENTIALS = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
GOOGLE_SA_KEY_JSON = os.environ.get("GOOGLE_SA_KEY_JSON")
IMPERSONATE_USER = os.environ.get("IMPERSONATE_USER", "")
GUEST_EMAILS = [
    e.strip() for e in os.environ.get("GUEST_EMAILS", "").split(",") if e.strip()
]

# Availability
WORKING_HOURS_START = int(os.environ.get("WORKING_HOURS_START", "9"))
WORKING_HOURS_END = int(os.environ.get("WORKING_HOURS_END", "17"))
WORKING_DAYS = [
    d.strip() for d in os.environ.get("WORKING_DAYS", "Mon,Tue,Wed,Thu,Fri").split(",") if d.strip()
]
MEETING_DURATION_MIN = int(os.environ.get("MEETING_DURATION_MIN", "30"))
LOOKAHEAD_DAYS = int(os.environ.get("LOOKAHEAD_DAYS", "14"))
FOUNDER_TIMEZONE = os.environ.get("FOUNDER_TIMEZONE", "America/Los_Angeles")
BUFFER_MIN = int(os.environ.get("BUFFER_MIN", "15"))

# Email
CONFIRMATION_FROM_NAME = os.environ.get("CONFIRMATION_FROM_NAME", "RIVR")
CONFIRMATION_SUBJECT_PREFIX = os.environ.get(
    "CONFIRMATION_SUBJECT_PREFIX", "Walkthrough confirmed"
)

# CORS
CORS_ALLOWED_ORIGINS = [
    o.strip() for o in os.environ.get("CORS_ALLOWED_ORIGINS", "").split(",") if o.strip()
]

# Dev
FAKE_CALENDAR = os.environ.get("FAKE_CALENDAR", "false").lower() == "true"

# Static bundle
WIDGET_DIST_DIR = os.environ.get(
    "WIDGET_DIST_DIR",
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "widget_dist"),
)

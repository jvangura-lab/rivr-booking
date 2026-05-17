"""Send confirmation email via Gmail API as the impersonated user."""
from __future__ import annotations

import base64
import logging
import os
from email.message import EmailMessage

from googleapiclient.discovery import build
from jinja2 import Environment, FileSystemLoader, select_autoescape

import config
from lib import auth
from lib.logging_setup import log_event

log = logging.getLogger(__name__)

_TEMPLATE_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
_env = Environment(
    loader=FileSystemLoader(_TEMPLATE_DIR),
    autoescape=select_autoescape(["html"]),
)


def _service():
    return build("gmail", "v1", credentials=auth.gmail_credentials(), cache_discovery=False)


def send_confirmation(
    *,
    to_email: str,
    to_name: str,
    when_display: str,
    tz_display: str,
    meet_url: str,
    google_url: str,
    ics_url: str,
    subject_suffix: str,
) -> str:
    first_name = (to_name or "").split(" ")[0] or "there"

    html = _env.get_template("confirmation.html").render(
        first_name=first_name,
        when_display=when_display,
        tz_display=tz_display,
        meet_url=meet_url,
        google_url=google_url,
        ics_url=ics_url,
    )
    text = _env.get_template("confirmation.txt").render(
        first_name=first_name,
        when_display=when_display,
        tz_display=tz_display,
        meet_url=meet_url,
        google_url=google_url,
        ics_url=ics_url,
    )

    msg = EmailMessage()
    msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
    msg["From"] = f"{config.CONFIRMATION_FROM_NAME} <{config.IMPERSONATE_USER}>"
    msg["Subject"] = f"{config.CONFIRMATION_SUBJECT_PREFIX} — {subject_suffix}"
    msg.set_content(text)
    msg.add_alternative(html, subtype="html")

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode("utf-8")
    resp = (
        _service()
        .users()
        .messages()
        .send(userId="me", body={"raw": raw})
        .execute()
    )
    message_id = resp.get("id", "")
    log_event(log, logging.INFO, "gmail.sent", message_id=message_id, to=to_email)
    return message_id

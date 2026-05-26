"""Flask entrypoint.

Serves the built Vite bundle at `/` (SPA fallback) and the API under `/api/*`.
Single container, single URL — no CORS overhead in the default same-origin path.
"""
from __future__ import annotations

import logging
import os

from flask import Flask, send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix

import config
from lib.logging_setup import configure as configure_logging
from routes import availability, book, health, hold, ics

configure_logging(config.LOG_LEVEL)
log = logging.getLogger(__name__)

if not config.IMPERSONATE_USER:
    raise RuntimeError(
        "IMPERSONATE_USER is required (sender of calendar invites + confirmation emails, "
        "and organizer on ICS exports). Set it even in FAKE_CALENDAR mode."
    )

app = Flask(__name__, static_folder=None)
# Trust Cloud Run's proxy headers so url_for(_external=True) emits https.
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1, x_for=1)

# API blueprints
app.register_blueprint(health.bp)
app.register_blueprint(availability.bp)
app.register_blueprint(hold.bp)
app.register_blueprint(book.bp)
app.register_blueprint(ics.bp)


# ─── CORS (only active when CORS_ALLOWED_ORIGINS is set) ────────────────────
@app.after_request
def cors_headers(resp):
    if not config.CORS_ALLOWED_ORIGINS:
        return resp
    from flask import request
    origin = request.headers.get("Origin")
    if origin and origin in config.CORS_ALLOWED_ORIGINS:
        resp.headers["Access-Control-Allow-Origin"] = origin
        resp.headers["Vary"] = "Origin"
        resp.headers["Access-Control-Allow-Headers"] = "Content-Type"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return resp


@app.route("/api/<path:_>", methods=["OPTIONS"])
def cors_preflight(_):
    return ("", 204)


# ─── Static widget bundle ───────────────────────────────────────────────────
@app.get("/")
def index():
    return _serve_widget("index.html")


@app.get("/<path:path>")
def widget_static(path):
    if path.startswith("api/"):
        # Defensive: shouldn't match because routes are registered first.
        return ("not found", 404)
    full = os.path.join(config.WIDGET_DIST_DIR, path)
    if os.path.isfile(full):
        return _serve_widget(path)
    # SPA fallback
    return _serve_widget("index.html")


def _serve_widget(path: str):
    if not os.path.isdir(config.WIDGET_DIST_DIR):
        # Bundle not built yet — useful during backend-only local dev.
        return (
            "widget bundle not built. run `npm run build` in widget/ "
            "or use the Vite dev server at :5173",
            404,
        )
    return send_from_directory(config.WIDGET_DIST_DIR, path)


if __name__ == "__main__":
    # Local dev only. Cloud Run uses gunicorn (see Dockerfile).
    app.run(host="0.0.0.0", port=config.PORT, debug=True)

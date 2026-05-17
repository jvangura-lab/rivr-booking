# RIVR booking

Standalone booking funnel — iframe-embeddable widget + Cloud Run backend.

## Structure

```
widget/            React + Vite frontend (the 4-step funnel)
booking-service/   Python + Flask backend (Cloud Run; Google Calendar + Gmail)
```

The Flask service serves both the API (`/api/*`) and the built widget bundle
(everything else, with SPA fallback to `index.html`). One Cloud Run service,
one URL, same origin — no CORS overhead in the default path.

## Backend — local dev

```bash
cd booking-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in values
export $(grep -v '^#' .env | xargs)
python main.py
# → http://localhost:8080/api/health
```

## Frontend — local dev

```bash
cd widget
npm install
npm run dev
# → http://localhost:5173
```

In dev, the widget proxies `/api/*` to `http://localhost:8080` (see `vite.config.js`).

## Deploy

```bash
cd booking-service
./deploy.sh
```

Builds the Vite bundle, copies it into the Docker image, deploys to Cloud Run.

## Env vars (booking-service)

See `booking-service/.env.example` for the full list. Critical ones:

- `GOOGLE_SA_KEY_JSON` — service account key (use Secret Manager in prod)
- `IMPERSONATE_USER` — founder email the service account impersonates (calendar owner + email sender)
- `GUEST_EMAILS` — comma-separated emails invited as guests on every booking
- `CORS_ALLOWED_ORIGINS` — only needed when embedding from a different domain

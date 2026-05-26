#!/usr/bin/env bash
# Build the widget bundle, copy it into the service dir, build the Docker image,
# and deploy to Cloud Run. Idempotent.
#
# Required env (or set via `gcloud config`):
#   GCP_PROJECT   — target project ID
#   GCP_REGION    — Cloud Run region (default: us-central1)
#   SERVICE_NAME  — Cloud Run service name (default: rivr-booking)
#
# Secrets (must already exist in Secret Manager and be granted to the service):
#   rivr-booking-sa-key   — service account JSON (mounted as GOOGLE_SA_KEY_JSON)
#
# Set IMPERSONATE_USER and GUEST_EMAILS via Cloud Run env vars (not in this script).

set -euo pipefail

PROJECT="${GCP_PROJECT:?set GCP_PROJECT}"
REGION="${GCP_REGION:-us-central1}"
SERVICE="${SERVICE_NAME:-rivr-booking}"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SERVICE_DIR="$ROOT/booking-service"
WIDGET_DIR="$ROOT/widget"

echo "▸ Building widget bundle…"
(cd "$WIDGET_DIR" && npm ci && npm run build)

echo "▸ Staging widget bundle into service dir…"
rm -rf "$SERVICE_DIR/widget_dist"
cp -R "$WIDGET_DIR/dist" "$SERVICE_DIR/widget_dist"

IMAGE="gcr.io/$PROJECT/$SERVICE"

echo "▸ Building container image: $IMAGE"
gcloud builds submit "$SERVICE_DIR" \
    --project="$PROJECT" \
    --tag="$IMAGE"

echo "▸ Deploying to Cloud Run…"
gcloud run deploy "$SERVICE" \
    --project="$PROJECT" \
    --region="$REGION" \
    --image="$IMAGE" \
    --platform=managed \
    --allow-unauthenticated \
    --min-instances=1 \
    --max-instances=1 \
    --memory=512Mi \
    --cpu=1 \
    --timeout=60 \
    --set-env-vars="^|^IMPERSONATE_USER=jonas@rivrsystems.com|GUEST_EMAILS=thor@rivrsystems.com" \
    --set-secrets=GOOGLE_SA_KEY_JSON=rivr-booking-sa-key:latest

echo "▸ Done."
gcloud run services describe "$SERVICE" \
    --project="$PROJECT" \
    --region="$REGION" \
    --format='value(status.url)'

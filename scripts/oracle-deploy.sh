#!/usr/bin/env bash
# Run ON the Oracle VM after git clone (not on your Mac).
# Usage: JWT_SECRET=xxx PUBLIC_APP_URL=https://app.vercel.app ALLOWED_ORIGINS=https://app.vercel.app ./scripts/oracle-deploy.sh
set -e
cd "$(dirname "$0")/.."

: "${JWT_SECRET:?Set JWT_SECRET}"
: "${PUBLIC_APP_URL:?Set PUBLIC_APP_URL (your Vercel URL)}"
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-$PUBLIC_APP_URL}"

sudo mkdir -p /opt/xperieval/data /opt/xperieval/uploads
sudo chown -R "$USER:$USER" /opt/xperieval

echo "→ Building Docker image..."
docker build -f Dockerfile.api -t xperieval-api .

echo "→ Restarting container..."
docker stop xperieval-api 2>/dev/null || true
docker rm xperieval-api 2>/dev/null || true

docker run -d \
  --name xperieval-api \
  --restart unless-stopped \
  -p 127.0.0.1:3001:3001 \
  -v /opt/xperieval/data:/var/data/data \
  -v /opt/xperieval/uploads:/var/data/uploads \
  -e NODE_ENV=production \
  -e PORT=3001 \
  -e JWT_SECRET="$JWT_SECRET" \
  -e PUBLIC_APP_URL="$PUBLIC_APP_URL" \
  -e ALLOWED_ORIGINS="$ALLOWED_ORIGINS" \
  -e GROQ_API_KEY="${GROQ_API_KEY:-}" \
  xperieval-api

sleep 2
curl -sf http://127.0.0.1:3001/api/health && echo ""
echo "→ API running on 127.0.0.1:3001 — demo portfolio (6 jobs, 18 candidates) seeds automatically on first boot."
echo "→ To copy your LOCAL database + uploads instead: ORACLE_HOST=user@ip ./scripts/sync-local-to-oracle.sh"
echo "→ Expose via Caddy or Cloudflare Tunnel (see docs/DEPLOY_VERCEL_ORACLE.md)"

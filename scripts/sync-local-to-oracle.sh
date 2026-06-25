#!/usr/bin/env bash
# Copy your LOCAL database + uploads to the Oracle VM (preserves real applications, recordings, resumes).
#
# Usage:
#   ORACLE_HOST=ubuntu@YOUR_VM_IP ./scripts/sync-local-to-oracle.sh
#
# Prerequisites:
#   - SSH access to the Oracle VM
#   - API container stopped OR brief downtime during DB copy (script stops/starts Docker)
#   - Local paths: data/xperieval.db and uploads/

set -euo pipefail
cd "$(dirname "$0")/.."

: "${ORACLE_HOST:=ubuntu@129.158.237.209}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/oracle_xperieval}"
SSH_OPTS=(-i "$SSH_KEY" -o ConnectTimeout=30 -o StrictHostKeyChecking=accept-new)

DATA_DIR="${DATA_DIR:-data}"
UPLOADS_DIR="${UPLOADS_DIR:-uploads}"
REMOTE_DATA="/opt/xperieval/data"
REMOTE_UPLOADS="/opt/xperieval/uploads"

if [[ ! -f "$DATA_DIR/xperieval.db" ]]; then
  echo "Missing $DATA_DIR/xperieval.db — run the app locally first or set DATA_DIR."
  exit 1
fi

echo "→ Checkpointing local SQLite WAL..."
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DATA_DIR/xperieval.db" "PRAGMA wal_checkpoint(TRUNCATE);"
fi

echo "→ Stopping API on Oracle (brief downtime)..."
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" 'docker stop xperieval-api 2>/dev/null || true'

echo "→ Ensuring remote directories (writable by ubuntu for sync)..."
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" "sudo mkdir -p $REMOTE_DATA $REMOTE_UPLOADS && sudo chown -R ubuntu:ubuntu $REMOTE_DATA $REMOTE_UPLOADS"

echo "→ Copying database..."
scp "${SSH_OPTS[@]}" "$DATA_DIR/xperieval.db" "$ORACLE_HOST:$REMOTE_DATA/xperieval.db"
if [[ -f "$DATA_DIR/xperieval.db-wal" ]]; then
  scp "${SSH_OPTS[@]}" "$DATA_DIR/xperieval.db-wal" "$ORACLE_HOST:$REMOTE_DATA/" 2>/dev/null || true
fi
if [[ -f "$DATA_DIR/xperieval.db-shm" ]]; then
  scp "${SSH_OPTS[@]}" "$DATA_DIR/xperieval.db-shm" "$ORACLE_HOST:$REMOTE_DATA/" 2>/dev/null || true
fi

echo "→ Syncing uploads (resumes, audio recordings)..."
if [[ -d "$UPLOADS_DIR" ]]; then
  rsync -avz -e "ssh ${SSH_OPTS[*]}" --delete "$UPLOADS_DIR/" "$ORACLE_HOST:$REMOTE_UPLOADS/"
else
  echo "  (no local uploads/ folder — skipping)"
fi

echo "→ Starting API..."
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" "sudo chown -R root:root $REMOTE_DATA $REMOTE_UPLOADS 2>/dev/null || true; docker start xperieval-api"
sleep 3
ssh "${SSH_OPTS[@]}" "$ORACLE_HOST" 'curl -sf http://127.0.0.1:3001/api/health && echo "" || echo "Health check failed — check docker logs xperieval-api"'

echo "→ Done. Refresh https://xperieval.vercel.app — your local data should now appear."

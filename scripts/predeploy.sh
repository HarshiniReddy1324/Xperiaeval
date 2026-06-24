#!/usr/bin/env bash
# Quick checks before pushing to Railway. Run: bash scripts/predeploy.sh
set -e
cd "$(dirname "$0")/.."
echo "→ npm ci..."
npm ci --omit=dev 2>/dev/null || npm ci
echo "→ npm run build..."
npm run build
echo "→ OK — safe to push. Railway will run the same build inside Docker."
echo ""
echo "Next: git push → Railway auto-deploys (~3 min)"

#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

echo "📦 Preparing static export of frontend..."

if [ -d "app/api" ]; then
  echo "⤴️  Moving existing app/api -> backend/_app_api_backup"
  mkdir -p backend
  mv app/api backend/_app_api_backup
else
  echo "ℹ️  No app/api directory present—continuing"
fi

echo "🔧 Running Next.js static export (this may take a few minutes)"
BUILD_MODE=static SKIP_TYPE_CHECK=true npx next build

echo "⤵️  Restoring app/api back to app/"
if [ -d "backend/_app_api_backup" ]; then
  mv backend/_app_api_backup app/api
fi

echo "✅ Static export complete. Files are in ./out"

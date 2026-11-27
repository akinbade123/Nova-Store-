#!/usr/bin/env bash
# Smoke test: starts the Vite dev server, loads every route in headless Chrome,
# prints any runtime errors, then stops the server.
# Usage (from the repo root): bash .claude/skills/nova-storefront/scripts/smoke.sh [extra paths...]
# Needs Google Chrome. Set CHROME_PATH if it isn't in the default macOS location.
# puppeteer-core is installed in a temp folder, never into the project.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../../../.." && pwd)"
PORT="${PORT:-5179}"
TOOLS="${TMPDIR:-/tmp}/nova-smoke"

mkdir -p "$TOOLS"
if [ ! -d "$TOOLS/node_modules/puppeteer-core" ]; then
  echo "Installing puppeteer-core into $TOOLS (one time)..."
  (cd "$TOOLS" && npm init -y >/dev/null && npm install --silent puppeteer-core)
fi
cp "$HERE/smoke.mjs" "$TOOLS/smoke.mjs"

cd "$REPO"
[ -d node_modules ] || npm ci
npx vite --port "$PORT" --strictPort >"$TOOLS/vite.log" 2>&1 &
VITE_PID=$!
trap 'kill $VITE_PID 2>/dev/null || true' EXIT

for _ in $(seq 1 40); do
  curl -fs "http://localhost:$PORT/" >/dev/null 2>&1 && break
  sleep 0.5
done

BASE_URL="http://localhost:$PORT" node "$TOOLS/smoke.mjs" "$@"

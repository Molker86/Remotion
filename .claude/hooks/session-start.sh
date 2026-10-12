#!/bin/bash
# Installs dependencies so Claude can preview and render Remotion videos
# right away in Claude Code on the web sessions.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"

if [ ! -d node_modules ] || [ package-lock.json -nt node_modules ]; then
  npm install --no-audit --no-fund --loglevel=error
fi

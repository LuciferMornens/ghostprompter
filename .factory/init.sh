#!/usr/bin/env bash
set -euo pipefail

# Idempotent environment setup for GhostPrompter mission workers
cd "$(dirname "$0")/.."

# Install dependencies if needed
if [ ! -d node_modules ]; then
  npm install
fi

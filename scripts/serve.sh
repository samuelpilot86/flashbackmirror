#!/bin/bash

# Lance un serveur HTTP local pour l'app
# Usage: ./scripts/serve.sh [port]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/App"
PORT="${1:-5500}"

cd "$APP_DIR"

# Utilise python3 si disponible, sinon python
if command -v python3 >/dev/null 2>&1; then
  echo "🚀 Serveur HTTP sur http://localhost:$PORT (répertoire: $APP_DIR)"
  python3 -m http.server "$PORT"
else
  echo "🚀 Serveur HTTP sur http://localhost:$PORT (répertoire: $APP_DIR)"
  python -m SimpleHTTPServer "$PORT"
fi

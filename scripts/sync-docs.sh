#!/bin/bash

# Script pour synchroniser les fichiers de App/ vers docs/ pour GitHub Pages
# Usage: ./scripts/sync-docs.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

echo "🔄 Synchronisation App/ → docs/..."

# Copier les fichiers essentiels
cp "$PROJECT_DIR/App/index.html" "$PROJECT_DIR/docs/index.html"
cp "$PROJECT_DIR/App/script.js" "$PROJECT_DIR/docs/script.js"
cp "$PROJECT_DIR/App/styles.css" "$PROJECT_DIR/docs/styles.css"

echo "✅ Fichiers synchronisés :"
echo "   - index.html"
echo "   - script.js"
echo "   - styles.css"
echo ""
echo "📝 N'oubliez pas de commiter et pousser :"
echo "   git add docs/"
echo "   git commit -m 'Mise à jour de l'application'"
echo "   git push origin main"


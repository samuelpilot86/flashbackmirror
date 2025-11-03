#!/bin/bash

# Script de surveillance automatique avec commit périodique
# Usage: ./scripts/watch-and-commit.sh [ intervalle_en_secondes ]

set -e

# Répertoire du dépôt
REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

# Intervalle par défaut: 5 minutes (300 secondes)
INTERVAL="${1:-300}"

echo "👀 Surveillance du dépôt: $REPO_DIR"
echo "⏱️  Intervalle de vérification: ${INTERVAL} secondes ($(($INTERVAL / 60)) minutes)"
echo "⚠️  Appuyez sur Ctrl+C pour arrêter"
echo ""

# Vérifier que nous sommes dans un dépôt Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Erreur: Ce répertoire n'est pas un dépôt Git"
    exit 1
fi

# Boucle de surveillance
while true; do
    # Vérifier s'il y a des changements
    if [ -n "$(git status --porcelain)" ]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] 🔄 Changements détectés, commit en cours..."
        "$REPO_DIR/scripts/auto-commit.sh" "$REPO_DIR"
        echo ""
    else
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] ℹ️  Aucun changement"
    fi
    
    # Attendre l'intervalle spécifié
    sleep "$INTERVAL"
done


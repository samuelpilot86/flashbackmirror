#!/bin/bash

# Script d'automatisation des commits Git
# Usage: ./scripts/auto-commit.sh [ repo_dir ]

set -e

# Répertoire du dépôt (par défaut: répertoire courant)
REPO_DIR="${1:-$(pwd)}"
cd "$REPO_DIR"

# Vérifier que nous sommes dans un dépôt Git
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Erreur: Ce répertoire n'est pas un dépôt Git"
    exit 1
fi

# Obtenir le nom de la branche actuelle
BRANCH=$(git branch --show-current)

# Vérifier s'il y a des changements
if [ -z "$(git status --porcelain)" ]; then
    echo "ℹ️  Aucun changement à committer sur la branche '$BRANCH'"
    exit 0
fi

# Afficher les changements
echo "📝 Changements détectés sur la branche '$BRANCH':"
git status --short

# Ajouter tous les fichiers modifiés/nouveaux
echo ""
echo "➕ Ajout de tous les fichiers..."
git add -A

# Générer un message de commit automatique
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
CHANGES=$(git diff --cached --stat | tail -1)

if [ -n "$CHANGES" ]; then
    COMMIT_MSG="Auto-commit: $CHANGES - $TIMESTAMP"
else
    COMMIT_MSG="Auto-commit: $TIMESTAMP"
fi

# Effectuer le commit
echo "💾 Création du commit..."
git commit -m "$COMMIT_MSG"

echo ""
echo "✅ Commit créé avec succès!"
echo "📊 Dernier commit:"
git log -1 --oneline

# Optionnel: push automatique (décommenter si souhaité)
# echo ""
# echo "🚀 Push vers origin..."
# git push origin "$BRANCH"


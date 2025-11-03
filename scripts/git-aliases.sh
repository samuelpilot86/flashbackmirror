#!/bin/bash

# Fichier d'aliases Git pour faciliter les commits automatiques
# Source ce fichier ou ajoutez-le à votre ~/.bashrc ou ~/.zshrc

# Alias pour commit automatique rapide
alias gac='bash "$(git rev-parse --show-toplevel)/scripts/auto-commit.sh"'

# Alias pour surveillance continue (5 min par défaut)
alias gwatch='bash "$(git rev-parse --show-toplevel)/scripts/watch-and-commit.sh"'

# Alias pour surveillance personnalisée
alias gwatch-custom='bash "$(git rev-parse --show-toplevel)/scripts/watch-and-commit.sh"'

echo "✅ Aliases Git chargés:"
echo "   gac      - Commit automatique unique"
echo "   gwatch   - Surveillance continue (5 min)"
echo "   gwatch-custom <sec> - Surveillance personnalisée"


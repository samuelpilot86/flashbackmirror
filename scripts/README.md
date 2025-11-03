# Scripts d'automatisation Git

Ce dossier contient des scripts pour automatiser les commits Git localement.

## Scripts disponibles

### 1. `auto-commit.sh` - Commit automatique unique

Commite automatiquement tous les changements détectés.

**Usage:**
```bash
./scripts/auto-commit.sh
```

**Fonctionnalités:**
- Ajoute automatiquement tous les fichiers modifiés/nouveaux
- Génère un message de commit avec statistiques
- Affiche un résumé du commit créé

### 2. `watch-and-commit.sh` - Surveillance continue

Surveille le dépôt et commite automatiquement à intervalles réguliers.

**Usage:**
```bash
# Surveillance toutes les 5 minutes (défaut)
./scripts/watch-and-commit.sh

# Surveillance personnalisée (ex: toutes les 2 minutes = 120 secondes)
./scripts/watch-and-commit.sh 120
```

**Fonctionnalités:**
- Vérifie périodiquement les changements
- Commite automatiquement si des changements sont détectés
- Tourne en arrière-plan (Ctrl+C pour arrêter)

### 3. Hook Git `pre-commit`

Un hook Git dans `.git/hooks/pre-commit` est disponible mais désactivé par défaut.

Pour l'activer:
1. Éditez `.git/hooks/pre-commit`
2. Décommentez la ligne `git add -A`
3. Assurez-vous que le fichier est exécutable: `chmod +x .git/hooks/pre-commit`

## Installation

Rendez les scripts exécutables:

```bash
chmod +x scripts/auto-commit.sh
chmod +x scripts/watch-and-commit.sh
```

## Automatisation avancée

### Utiliser avec cron (macOS/Linux)

Pour exécuter le commit automatique à intervalles fixes, ajoutez à votre crontab:

```bash
# Éditer le crontab
crontab -e

# Exemple: commit automatique toutes les heures
0 * * * * /bin/bash "/Users/samuel/kDrive/Docs légers - DD/PM IA/MVP/MirrorBack/scripts/auto-commit.sh"

# Exemple: commit automatique toutes les 30 minutes
*/30 * * * * /bin/bash "/Users/samuel/kDrive/Docs légers - DD/PM IA/MVP/MirrorBack/scripts/auto-commit.sh"
```

### Utiliser avec launchd (macOS)

Créez un fichier `~/Library/LaunchAgents/com.mirrorback.autocommit.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.mirrorback.autocommit</string>
    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>/Users/samuel/kDrive/Docs légers - DD/PM IA/MVP/MirrorBack/scripts/auto-commit.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>1800</integer>
    <key>RunAtLoad</能以>
    <true/>
</dict>
</plist>
```

Puis chargez-le:
```bash
launchctl load ~/Library/LaunchAgents/com.mirrorback.autocommit.plist
```

## Notes

- ⚠️ Les scripts ne font **PAS** de push automatique vers le remote par défaut
- Pour activer le push automatique, décommentez la section dans `auto-commit.sh`
- Assurez-vous d'avoir configuré vos credentials Git avant d'utiliser les scripts

## Servir l'application en HTTP local (recommandé)

Certaines fonctionnalités (lecture de blobs vidéo) sont bloquées par les navigateurs en `file://`. Servez l'app via HTTP local pour éviter les erreurs de sécurité.

### Démarrage rapide

```bash
# Lancer un serveur HTTP sur http://localhost:5500
./scripts/serve.sh 5500

# Ouvrir: http://localhost:5500/index.html
```

Alternatives:

```bash
# Python
cd App && python3 -m http.server 5500

# Node
npx http-server App -p 5500 --cors
```


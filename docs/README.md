# Flashback Mirror - Application Web

Cette application est hébergée via GitHub Pages.

## Accès

Une fois GitHub Pages configuré, l'application sera accessible à :
**https://samuelpilot86.github.io/flashbackmirror/**

## Configuration GitHub Pages

1. Aller sur https://github.com/samuelpilot86/flashbackmirror/settings/pages
2. Source : "Deploy from a branch"
3. Branch : `main`
4. Folder : `/docs`
5. Cliquer sur "Save"

## Mise à jour

Pour mettre à jour l'application en ligne :
1. Modifier les fichiers dans `App/`
2. Copier les fichiers modifiés vers `docs/` :
   ```bash
   cp App/index.html App/script.js App/styles.css docs/
   ```
3. Commiter et pousser :
   ```bash
   git add docs/
   git commit -m "Mise à jour de l'application"
   git push origin main
   ```

Les changements seront automatiquement déployés sur GitHub Pages (quelques minutes de délai).


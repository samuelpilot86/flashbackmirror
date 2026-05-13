# Flashback Mirror — contexte pour l’agent

## Produit

Application web **Flashback** (enregistreur / buffer / flashback d’entraînement), statique, sans bundler.

## Où est le code applicatif

- **Source déployée** : dossier `docs/` à la racine du dépôt.
- Fichiers principaux : `docs/index.html`, `docs/script.js`, `docs/styles.css`.
- Le dossier `App/` mentionné dans une ancienne version du README **n’existe pas** dans ce dépôt : travailler **directement** dans `docs/`.

## Documentation produit / suivi

- `Description docs/backlog.md`
- `Description docs/requirements-user-stories.md`

(Le nom du dossier contient un espace : bien quoter les chemins en shell.)

## Déploiement

- **GitHub Pages** : branche `main`, dossier `/docs`.
- URL publique : https://samuelpilot86.github.io/flashbackmirror/
- Mise à jour du site : commit + `git push` des changements sous `docs/` (délai de quelques minutes côté GitHub).

## Assets

- Dossier `Logo/` à la racine (images / SVG) — à utiliser ou référencer depuis `docs/` si besoin (chemins relatifs).

## Fichiers volontairement hors dépôt

Des copies locales de secours du HTML (`docs/index … .html`) et `docs/old/` sont listés dans `.gitignore` : ne pas les ajouter au dépôt.

## Conventions

- Changements **ciblés** : éviter les refactors ou fichiers non demandés.
- Préserver le style et les patterns existants dans `script.js` / `styles.css`.
- Langue : **français** pour les messages à l’utilisateur (issues, réponses, messages de commit si l’utilisateur le demande).

## Test local

Servir le dossier `docs/` avec un serveur HTTP statique (ex. `npx --yes serve docs` depuis la racine) pour éviter les limitations `file://` sur la caméra / certains modules.

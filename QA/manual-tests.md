# Tests manuels Flashback Recorder

## 1. Démarrage & enregistrement
1. Ouvrir l'application.
2. Vérifier que le bouton Shift affiche `Stop`, l'indicateur montre `● REC` et que la timeline est visible.
3. Ajouter un marqueur via `Shift`; vérifier son apparition sur la timeline.

## 2. Passage en flashback
1. Appuyer sur `←`.
2. Constater le passage à l'état `Flashback` (`● FLASHBACK`, bouton `Pause`).
3. Naviguer avec `←`/`→` et vérifier le comportement exponentiel.
4. Utiliser `↑`/`↓` pour naviguer entre les marqueurs.

## 3. Pause & reprise
1. Pendant un flashback, appuyer sur `Space`.
2. Vérifier l'état `Flashback paused` (`● PAUSE`, bouton `Read`).
3. Appuyer de nouveau sur `Space`; lecture reprise sur la même position.

## 4. Retour à l'enregistrement
1. Laisser la lecture atteindre la fin ou appuyer sur `Space` jusqu'à `Record`.
2. Vérifier le retour à `● REC`, bouton `Stop`.
3. S'assurer que l'enregistrement redémarre et que la timeline continue d'évoluer.

## 5. Timeline & marqueurs en pause
1. Mettre le flashback en pause (`Space`).
2. Vérifier que le curseur rouge reste visible et que la timeline réagit aux ajouts de marqueurs (désactivés en pause).

## 6. État `recordingStopped`
1. En enregistrement, appuyer sur `Space` pour stopper.
2. Vérifier l'état `● READY`, bouton `Record`, absence de point rouge.
3. Relancer via `Space` et confirmer le retour à l'enregistrement.

**Résultat attendu** : aucune erreur console, transitions cohérentes, bouton Shift/indicateur toujours alignés avec l'état courant.

**Note** : Les raccourcis clavier ont été inversés (US-012) :
- `Space` = contrôle unifié principal (Stop/Record/Pause/Resume)
- `Shift` = ajouter un marqueur

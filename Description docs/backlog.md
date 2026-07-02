# Product Backlog - Flashback Application

## Overview
This backlog contains future enhancements and features planned for the Flashback training recorder application. Items are prioritized based on user value and technical feasibility.

## Table of Contents

<!-- 
  TABLE OF CONTENTS - Auto-update required
  
  INSTRUCTIONS FOR ADDING NEW ITEMS:
  1. When adding a new backlog item (e.g., "### BUG-019: Title"), add a line here
  2. Format: - [Full Title](#item-id)
  3. To create the ID from the title:
     - Convert to lowercase
     - Replace spaces with hyphens
     - Remove special characters (keep only letters, numbers, hyphens)
     - Example: "BUG-019: My Title" → "bug-019-my-title"
  4. Add the same ID to the heading: ### BUG-019: My Title {#bug-019-my-title}
  
  The table of contents will automatically link to the sections when viewed in a Markdown viewer.
-->

- [BUG-020: Mini-Enceinte S'Éteint Après une Certaine Durée](#bug-020-mini-enceinte-setient-apres-une-certaine-duree)
- [BUG-022: Message "Aucun périphérique audio n'a été détecté" S'Affiche Trop Tôt](#bug-022-message-aucun-périphérique-audio-na-été-détecté-saffiche-trop-tôt)
- [BUG-023: Créer des Logs pour Déboguer l'Impossibilité de Lire la Vidéo Après un Enregistrement Prolongé](#bug-023-créer-des-logs-pour-déboguer-limpossibilité-de-lire-la-vidéo-après-un-enregistrement-prolongé)
- [FEAT-002: Sélection des Périphériques Audio et Vidéo d'Entrée et de Sortie](#feat-002-sélection-des-périphériques-audio-et-vidéo-dentrée-et-de-sortie)
- [FEAT-003: Marquage Automatique de Moments Importants](#feat-003-marquage-automatique-de-moments-importants)
- [FEAT-004: Paramétrage de la Vitesse de Replay](#feat-004-paramétrage-de-la-vitesse-de-replay)
- [MARKETING-001: Créer un Logo pour Flashback Mirror](#marketing-001-créer-un-logo-pour-flashback-mirror)
- [TEST-001: Tests de Comportement avec Changements d'Équipement et États Système](#test-001-tests-de-comportement-avec-changements-dequipement-et-etats-systeme)
- [TEST-002: Vérifier la Lecture de Flashback Après un Enregistrement de Plus de 30 Minutes (peut être fait pendant une séance de sport)](#test-002-vérifier-la-lecture-de-flashback-après-un-enregistrement-de-plus-de-30-minutes-peut-être-fait-pendant-une-séance-de-sport)
- [TEST-003: Vérifier que la Mini-Enceinte ne S'Éteint Pas Après 30 Minutes d'Enregistrement (peut être fait pendant une séance de sport)](#test-003-vérifier-que-la-mini-enceinte-ne-setient-pas-après-30-minutes-denregistrement-peut-être-fait-pendant-une-séance-de-sport)


## Backlog Items


### BUG-020: Mini-Enceinte S'Éteint Après une Certaine Durée {#bug-020-mini-enceinte-setient-apres-une-certaine-duree}

> **État : résolu en code — en attente de confirmation terrain (TEST-003)**

**Description**:  
La mini-enceinte (ou casque Bluetooth/USB) se met en veille automatiquement après une période d'inactivité audio, ce qui interrompt la lecture des flashbacks ou peut causer des problèmes lors de la reprise de l'enregistrement. Ce comportement est dû aux mécanismes d'économie d'énergie des périphériques audio.

**Solution implémentée** : classe `AudioKeepAlive` (deux approches en parallèle) :
- **Approche 1** : signal inaudible périodique (20 Hz, gain 0.01, 1 s toutes les 10 s)
- **Approche 2** : `GainNode` silencieux connecté en permanence + vérification de l'état de l'`AudioContext` toutes les 5 s

Active pendant l'enregistrement (`audioKeepAlive.start()` dans `startRecording()`, `.stop()` dans `stopRecording()`).

**Acceptance Criteria**:
- [ ] L'enceinte reste active pendant toute la session d'enregistrement (→ TEST-003)
- [ ] La lecture des flashbacks démarre immédiatement sans délai d'activation de l'enceinte (→ TEST-003)
- [x] Aucun son audible n'est généré (20 Hz, gain 0.001 — inaudible)
- [ ] La solution fonctionne avec différents types de périphériques (→ TEST-003)
- [ ] Pas d'impact négatif sur la performance ou la consommation de batterie (→ TEST-003)

**Priorité**: Moyenne-Haute — en attente de validation terrain (TEST-003)

---

### BUG-022: Message "Aucun périphérique audio n'a été détecté" S'Affiche Trop Tôt {#bug-022-message-aucun-périphérique-audio-na-été-détecté-saffiche-trop-tôt}

> **État : résolu** — `AudioOutputMonitor.start()` déplacé après le premier `getUserMedia` réussi dans `startRecording()`.

**Acceptance Criteria**:
- [x] Le message ne s'affiche pas au chargement si un périphérique est disponible
- [x] `enumerateDevices()` est appelé après l'obtention des permissions
- [x] Le message ne s'affiche que si aucun périphérique n'est réellement détecté

**Priorité**: Résolue

---

### BUG-023: Créer des Logs pour Déboguer l'Impossibilité de Lire la Vidéo Après un Enregistrement Prolongé {#bug-023-créer-des-logs-pour-déboguer-limpossibilité-de-lire-la-vidéo-après-un-enregistrement-prolongé}

**Description**:  
Créer des logs détaillés pour déboguer un problème où la vidéo ne peut pas être lue après un enregistrement prolongé. Ce problème peut être lié à la gestion de la mémoire, aux chunks vidéo, à la création des blobs, ou à d'autres aspects du système d'enregistrement qui ne se manifestent qu'après une période d'enregistrement prolongée.

**Comportement Observé**:
- Après un enregistrement prolongé (durée à déterminer), la lecture de la vidéo échoue
- Le problème ne se manifeste pas lors d'enregistrements courts
- L'application peut continuer à enregistrer mais ne peut plus lire les flashbacks
- Aucun message d'erreur clair n'est affiché à l'utilisateur

**Objectif**:
- Ajouter des logs détaillés pour identifier la cause exacte du problème
- Les logs doivent couvrir tous les aspects pertinents du système d'enregistrement et de lecture
- Les logs doivent permettre de comprendre où et pourquoi la lecture échoue

**Acceptance Criteria**:
- [ ] Logs ajoutés lors de la création des blobs vidéo (taille, type MIME, timestamp)
- [ ] Logs ajoutés lors de la lecture des flashbacks (état du blob, URL créée, erreurs de lecture)
- [ ] Logs ajoutés lors de la gestion de la mémoire (taille des buffers, nombre de chunks, sessions)
- [ ] Logs ajoutés lors des opérations de rolling buffer (trim, cleanup)
- [ ] Logs ajoutés lors des erreurs de lecture vidéo (erreurs du navigateur, problèmes de blob)
- [ ] Les logs incluent des timestamps pour tracer la séquence d'événements
- [ ] Les logs incluent des informations sur l'état de l'application (durée d'enregistrement, nombre de sessions, etc.)
- [ ] Les logs sont suffisamment détaillés pour identifier la cause racine du problème

**Technical Considerations**:
- **Points de logging à ajouter**:
  - Lors de la création des blobs (`URL.createObjectURL()`, taille du blob, type MIME)
  - Lors de la lecture vidéo (`video.play()`, `video.load()`, erreurs de lecture)
  - Lors de la gestion des chunks (ajout, suppression, taille)
  - Lors des opérations de rolling buffer (trim, cleanup, taille avant/après)
  - Lors de la finalisation des sessions (taille totale, nombre de chunks)
  - Lors des erreurs de MediaRecorder ou de lecture vidéo
  
- **Informations à logger**:
  - Timestamp de l'événement
  - Durée totale d'enregistrement au moment de l'événement
  - Nombre de sessions enregistrées
  - Taille des buffers (chunkBuffer, currentSessionChunks)
  - État des blobs (créés, valides, URLs)
  - Erreurs du navigateur (si disponibles)
  - État de la vidéo (readyState, networkState, error)
  
- **Format des logs**:
  - Utiliser des préfixes clairs pour identifier le contexte (ex: `[VIDEO_READ]`, `[BLOB_CREATE]`, `[BUFFER_TRIM]`)
  - Inclure des objets structurés pour faciliter l'analyse
  - Utiliser `console.log`, `console.warn`, ou `console.error` selon la sévérité

**Dependencies**:
- Système d'enregistrement existant
- Système de lecture vidéo (flashback)
- Gestion des buffers et sessions

**Recommended Approach**:
1. Identifier les points critiques dans le code où des problèmes peuvent survenir (création de blobs, lecture vidéo, gestion mémoire)
2. Ajouter des logs avant et après ces opérations critiques
3. Ajouter des logs lors des erreurs pour capturer les informations de contexte
4. Tester avec un enregistrement prolongé pour générer les logs
5. Analyser les logs pour identifier la cause racine du problème
6. Une fois le problème identifié et corrigé, certains logs peuvent être retirés ou réduits

**Priorité**: Haute (bloque la fonctionnalité principale après un enregistrement prolongé)

---

### FEAT-002: Sélection des Périphériques Audio et Vidéo d'Entrée et de Sortie {#feat-002-sélection-des-périphériques-audio-et-vidéo-dentrée-et-de-sortie}

> **État : résolu en code — en attente de validation terrain**

**Description**:  
Permettre à l'utilisateur de choisir explicitement la caméra, le microphone et le périphérique de sortie audio. Exposé dans la section « Périphériques » du Panneau de Configuration (⚙️, bas droite), avec vumètre micro et preview caméra en temps réel.

**Solution implémentée** :
- Panneau de configuration (⚙️) avec trois sections : Périphériques, Enregistrement, Affichage
- Dropdown microphone + vumètre canvas (AnalyserNode)
- Dropdown caméra + `<video>` preview live
- Dropdown sortie audio avec `setSinkId(deviceId)` (Chrome/Firefox) ou message informatif (Safari)
- Option « Défaut du système » (deviceId `'default'`) en premier dans la liste sortie
- Sélections persistées dans `localStorage` ; restaurées via `{ deviceId: { ideal: id } }` au rechargement
- Listes rafraîchies à chaque `devicechange`
- `audioOutputMonitor.start()` déplacé après `getUserMedia` (fix BUG-022)

**Acceptance Criteria**:
- [x] Dropdown microphone avec labels + vumètre canvas (AnalyserNode) en temps réel
- [x] Dropdown caméra avec labels + `<video>` preview live dans le panneau
- [x] Dropdown sortie audio avec labels (Chrome/Firefox) ou message informatif (Safari)
- [x] Option « Défaut système » pour la sortie audio sur Chrome/Firefox
- [x] Sélection de micro → relance `getUserMedia` avec le nouveau `deviceId`
- [x] Sélection de caméra → relance `getUserMedia` avec le nouveau `deviceId`
- [x] Sélection sortie → `setSinkId(deviceId)` appliqué immédiatement sur la vidéo flashback
- [x] Sélections persistées dans `localStorage`, restaurées au chargement
- [x] Aucun crash si un périphérique sauvegardé n'est plus disponible

**Priorité**: Haute (corriger le problème de routage audio Bluetooth)

---

### FEAT-003: Marquage Automatique de Moments Importants {#feat-003-marquage-automatique-de-moments-importants}

**Description**:  
Implémenter un système de marquage automatique de moments importants pendant l'enregistrement. Le système détecte automatiquement des événements significatifs (par exemple, mouvements brusques, changements de volume audio, détection de voix, etc.) et crée des marqueurs à ces moments pour faciliter la navigation et la révision ultérieure.

**User Value**:
- **Efficacité** : Identification automatique des moments clés sans intervention manuelle
- **Navigation** : Accès rapide aux moments importants via les marqueurs automatiques
- **Révision** : Focus sur les moments pertinents plutôt que de parcourir tout l'enregistrement
- **Apprentissage** : Identification des patterns et moments récurrents dans les performances
- **Gain de temps** : Réduction du temps nécessaire pour trouver les moments à revoir

**Comportement Actuel**:
- Les marqueurs doivent être créés manuellement par l'utilisateur via le bouton "Mark"
- Aucune détection automatique d'événements significatifs
- L'utilisateur doit naviguer manuellement pour trouver les moments importants

**Comportement Attendu**:
- Le système détecte automatiquement certains types d'événements pendant l'enregistrement
- Des marqueurs sont créés automatiquement aux moments détectés
- Les marqueurs automatiques sont visuellement distincts des marqueurs manuels (optionnel)
- L'utilisateur peut activer/désactiver le marquage automatique
- L'utilisateur peut configurer les types d'événements à détecter (si applicable)
- Les marqueurs automatiques peuvent être supprimés comme les marqueurs manuels

**Acceptance Criteria**:
- [ ] Le système détecte automatiquement au moins un type d'événement (ex: changements de volume audio significatifs)
- [ ] Des marqueurs sont créés automatiquement aux moments détectés
- [ ] Les marqueurs automatiques sont visibles sur la timeline
- [ ] L'utilisateur peut activer/désactiver le marquage automatique (toggle dans les options)
- [ ] L'utilisateur peut naviguer vers les marqueurs automatiques comme les marqueurs manuels
- [ ] Les marqueurs automatiques peuvent être supprimés
- [ ] Le système ne crée pas trop de marqueurs (éviter le spam)
- [ ] La détection fonctionne en temps réel pendant l'enregistrement

**Technical Considerations**:
- **Types d'événements à détecter** (exemples) :
  - Changements de volume audio significatifs (augmentation soudaine, silence)
  - Détection de voix (parole vs silence)
  - Mouvements brusques dans la vidéo (détection de mouvement via analyse d'image)
  - Changements de luminosité (ex: flash, changement de scène)
  - Patterns audio spécifiques (ex: applaudissements, cris)
  
- **Analyse en temps réel**:
  - Utiliser l'API Web Audio pour analyser le signal audio
  - Utiliser `AudioContext` et `AnalyserNode` pour calculer le volume, la fréquence, etc.
  - Analyser les frames vidéo pour détecter les mouvements (optionnel, plus complexe)
  - Implémenter des seuils et des algorithmes de détection pour éviter les faux positifs
  
- **Performance**:
  - L'analyse doit être légère pour ne pas impacter l'enregistrement
  - Utiliser des techniques d'échantillonnage si nécessaire
  - Éviter de créer trop de marqueurs (débounce, seuils minimaux)
  
- **Interface utilisateur**:
  - Ajouter un toggle dans le menu d'options pour activer/désactiver
  - Optionnel : Distinguer visuellement les marqueurs automatiques (couleur différente, icône)
  - Afficher le nombre de marqueurs automatiques créés
  
- **Configuration**:
  - Permettre à l'utilisateur de configurer la sensibilité de détection
  - Permettre de choisir les types d'événements à détecter (si plusieurs types sont implémentés)
  - Sauvegarder les préférences dans localStorage

**Dependencies**:
- Système de marqueurs existant (bouton "Mark")
- API Web Audio pour l'analyse audio
- Système d'enregistrement pour accéder aux données en temps réel

**Recommended Approach**:
1. **Phase 1 - Détection audio simple** :
   - Implémenter l'analyse du volume audio en temps réel
   - Détecter les changements significatifs de volume
   - Créer des marqueurs automatiques aux moments détectés
   - Ajouter un toggle pour activer/désactiver
   
2. **Phase 2 - Amélioration** :
   - Affiner les algorithmes de détection (seuils, débounce)
   - Ajouter d'autres types de détection si nécessaire
   - Permettre la configuration de la sensibilité
   - Distinguer visuellement les marqueurs automatiques
   
3. **Phase 3 - Avancé (optionnel)** :
   - Détection de mouvement dans la vidéo
   - Détection de patterns audio spécifiques
   - Machine learning pour améliorer la détection (futur)

**Priorité**: Moyenne (améliore l'expérience utilisateur mais n'est pas essentiel)

---

### FEAT-004: Paramétrage de la Vitesse de Replay {#feat-004-paramétrage-de-la-vitesse-de-replay}

**Description**:  
Permettre à l'utilisateur de contrôler la vitesse de lecture des flashbacks. Cette fonctionnalité permet d'accélérer ou de ralentir la lecture vidéo et audio pour faciliter la révision, l'analyse détaillée, ou le passage rapide de certaines sections.

**User Value**:
- **Efficacité** : Accélération de la lecture pour passer rapidement les sections moins intéressantes
- **Analyse** : Ralentissement de la lecture pour analyser en détail les mouvements et techniques
- **Flexibilité** : Adaptation de la vitesse selon le contexte (sport, danse, éloquence)
- **Gain de temps** : Révision plus rapide des enregistrements longs
- **Apprentissage** : Analyse au ralenti pour comprendre les détails techniques

**Comportement Actuel**:
- La lecture des flashbacks se fait à vitesse normale (1x)
- Aucune possibilité de modifier la vitesse de lecture
- L'utilisateur doit attendre la fin de la lecture pour revoir une section

**Comportement Attendu**:
- L'utilisateur peut sélectionner différentes vitesses de lecture (ex: 0.25x, 0.5x, 0.75x, 1x, 1.25x, 1.5x, 2x)
- La vitesse s'applique à la fois à la vidéo et à l'audio
- La vitesse peut être modifiée pendant la lecture
- La vitesse sélectionnée est sauvegardée et restaurée pour les prochaines sessions
- Un indicateur visuel montre la vitesse actuelle

**Acceptance Criteria**:
- [ ] Un contrôle de vitesse est accessible pendant la lecture d'un flashback
- [ ] Plusieurs vitesses sont disponibles (ralenti, normal, accéléré)
- [ ] La vitesse s'applique à la fois à la vidéo et à l'audio
- [ ] La vitesse peut être modifiée pendant la lecture sans interruption
- [ ] La vitesse sélectionnée est sauvegardée dans localStorage
- [ ] La vitesse est restaurée au chargement de l'application
- [ ] Un indicateur visuel (ex: "2x", "0.5x") montre la vitesse actuelle
- [ ] L'interface reste intuitive et facile à utiliser

**Technical Considerations**:
- **API HTML5 Video**:
  - Utiliser la propriété `playbackRate` de l'élément `<video>` pour contrôler la vitesse
  - Les valeurs typiques sont : 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0
  - Certains navigateurs supportent des valeurs plus extrêmes (ex: 0.1 à 16)
  - La propriété `playbackRate` affecte automatiquement la vidéo et l'audio
  
- **Interface utilisateur**:
  - Ajouter un contrôle dans l'interface de lecture (boutons, slider, ou menu déroulant)
  - Options possibles :
    - Boutons avec icônes (ralenti, normal, accéléré)
    - Slider pour sélection continue
    - Menu déroulant avec valeurs prédéfinies
  - Afficher la vitesse actuelle de manière visible
  - Positionner le contrôle de manière accessible mais non intrusive
  
- **Intégration**:
  - Le contrôle doit être visible uniquement pendant la lecture d'un flashback
  - Appliquer la vitesse lors du démarrage de la lecture
  - Permettre le changement de vitesse pendant la lecture
  - Réinitialiser à la vitesse normale (1x) ou sauvegardée lors du démarrage d'un nouveau flashback
  
- **Persistance**:
  - Sauvegarder la vitesse sélectionnée dans localStorage
  - Restaurer la vitesse au chargement de l'application
  - Optionnel : Permettre une vitesse par défaut différente de 1x
  
- **Limitations**:
  - Certains navigateurs peuvent avoir des limitations sur les vitesses extrêmes
  - L'audio peut devenir déformé à des vitesses très élevées ou très basses
  - Tester la compatibilité avec différents navigateurs

**Dependencies**:
- Système de lecture vidéo (flashback) existant
- Élément `<video>` pour la propriété `playbackRate`
- Système de localStorage pour la persistance
- Interface utilisateur pour le contrôle

**Recommended Approach**:
1. **Phase 1 - Contrôle basique** :
   - Ajouter des boutons pour les vitesses courantes (0.5x, 1x, 1.5x, 2x)
   - Implémenter la modification de `playbackRate` sur l'élément vidéo
   - Afficher un indicateur de vitesse
   - Tester avec différents navigateurs
   
2. **Phase 2 - Amélioration** :
   - Ajouter plus d'options de vitesse (0.25x, 0.75x, 1.25x, etc.)
   - Sauvegarder la préférence dans localStorage
   - Ajouter un slider pour sélection continue (optionnel)
   - Améliorer l'indicateur visuel
   
3. **Phase 3 - Intégration** :
   - Permettre la configuration de la vitesse par défaut
   - Ajouter des raccourcis clavier pour changer la vitesse (optionnel)

**Priorité**: Moyenne (améliore l'expérience utilisateur mais n'est pas essentiel)

---

### MARKETING-001: Créer un Logo pour Flashback Mirror {#marketing-001-créer-un-logo-pour-flashback-mirror}

**Description**:  
Créer un logo professionnel pour Flashback Mirror qui représente l'identité visuelle de l'application. Le logo sera utilisé pour la promotion, le branding, et l'affichage dans l'application elle-même.

**User Value**:
- **Identité visuelle** : Créer une identité de marque reconnaissable
- **Professionnalisme** : Améliorer la crédibilité et l'image de l'application
- **Reconnaissance** : Faciliter la mémorisation et l'identification de l'application
- **Marketing** : Utiliser le logo pour la promotion sur LinkedIn et autres canaux

**Comportement Actuel**:
- Aucun logo n'existe pour l'application
- L'application utilise uniquement le titre texte "Flashback Mirror"

**Comportement Attendu**:
- Un logo professionnel est créé pour Flashback Mirror
- Le logo peut être utilisé dans l'application (favicon, en-tête)
- Le logo peut être utilisé pour la promotion (LinkedIn, réseaux sociaux)
- Le logo est disponible dans différents formats (PNG, SVG, différentes tailles)

**Acceptance Criteria**:
- [ ] Un logo est créé pour Flashback Mirror
- [ ] Le logo représente visuellement le concept de "flashback" ou de "miroir temporel"
- [ ] Le logo est professionnel et adapté à un contexte B2C (entraînement, performance)
- [ ] Le logo est disponible en format SVG (vectoriel) pour la qualité
- [ ] Le logo est disponible en format PNG avec fond transparent
- [ ] Le logo est disponible en différentes tailles (favicon 16x16, icône 64x64, logo complet)
- [ ] Le logo peut être utilisé dans l'application (favicon, en-tête si souhaité)
- [ ] Le logo peut être utilisé pour la promotion sur LinkedIn

**Technical Considerations**:
- **Design**:
  - Concept visuel : Représenter l'idée de "flashback" (retour en arrière temporel) et "miroir" (réflexion, auto-évaluation)
  - Style : Moderne, épuré, adapté à un contexte sportif/performance
  - Couleurs : À définir selon l'identité visuelle souhaitée
  - Typographie : Intégrer ou compléter le texte "Flashback Mirror" si nécessaire
  
- **Formats**:
  - SVG pour la qualité vectorielle et la scalabilité
  - PNG avec fond transparent pour les usages web
  - Favicon (16x16, 32x32) pour l'onglet du navigateur
  - Tailles multiples pour différents contextes d'utilisation
  
- **Outils**:
  - Design tools : Figma, Adobe Illustrator, Canva, ou autres outils de design
  - Optionnel : Faire appel à un designer professionnel ou utiliser des outils en ligne

**Dependencies**:
- Définition de l'identité visuelle souhaitée
- Outils de design (ou designer)

**Recommended Approach**:
1. Définir le concept visuel et les éléments clés à représenter (flashback, miroir, temps)
2. Créer des esquisses ou maquettes du logo
3. Choisir les couleurs et la typographie
4. Créer le logo final dans un outil de design
5. Exporter dans les différents formats nécessaires (SVG, PNG, favicon)
6. Intégrer le logo dans l'application (favicon, optionnellement en-tête)
7. Utiliser le logo pour la promotion

**Priorité**: Moyenne (améliore le branding mais n'est pas bloquant pour le fonctionnement)

---

### TEST-001: Tests de Comportement avec Changements d'Équipement et États Système {#test-001-tests-de-comportement-avec-changements-dequipement-et-etats-systeme}

**Description**:  
Tester le comportement de l'application dans différents scénarios impliquant des changements d'équipement audio/vidéo et des changements d'état du système. Ces tests visent à identifier les problèmes potentiels et à garantir la robustesse de l'application.

**Scénarios à Tester**:

1. **Branchement d'une enceinte**:
   - Tester ce qui se passe quand une enceinte (ou casque) est branchée pendant l'enregistrement
   - Tester ce qui se passe quand une enceinte est branchée pendant la lecture d'un flashback
   - Vérifier que l'audio est correctement routé vers le nouveau périphérique
   - Vérifier qu'il n'y a pas d'interruption de l'enregistrement ou de la lecture

2. **Retour en arrière (flashback)**:
   - Tester le comportement lors d'un retour en arrière pendant l'enregistrement
   - Tester le comportement lors d'un retour en arrière pendant la lecture d'un flashback
   - Vérifier que la synchronisation audio/vidéo est maintenue
   - Vérifier qu'il n'y a pas de perte de données ou de corruption

3. **Dépassement du temps maximum**:
   - Tester ce qui se passe quand la durée d'enregistrement dépasse `maxDuration`
   - Vérifier que les anciennes données sont correctement supprimées (trim)
   - Vérifier que l'enregistrement continue sans interruption
   - Vérifier que les flashbacks fonctionnent correctement avec les données tronquées
   - Vérifier que l'affichage de la timeline et des barres reste cohérent

4. **Fermeture de l'ordinateur**:
   - Tester ce qui se passe quand l'ordinateur est mis en veille/fermé pendant l'enregistrement
   - Tester ce qui se passe quand l'ordinateur est mis en veille/fermé pendant la lecture d'un flashback
   - Vérifier la récupération après réveil (reconnexion de la caméra/microphone)
   - Vérifier qu'il n'y a pas de perte de données enregistrées
   - Vérifier que l'état de l'application est correctement restauré

**Acceptance Criteria**:
- [ ] Documenter le comportement observé pour chaque scénario
- [ ] Identifier les bugs ou comportements inattendus
- [ ] Vérifier que l'application gère gracieusement ces changements (pas de crash, pas de perte de données)
- [ ] Vérifier que l'audio/vidéo continue de fonctionner correctement après les changements
- [ ] Vérifier que l'interface utilisateur reste cohérente et informative
- [ ] Créer des issues/bugs pour les problèmes identifiés

**Résultats Attendus**:
- Rapport de test documentant le comportement pour chaque scénario
- Liste des bugs identifiés (si applicable)
- Recommandations pour améliorer la robustesse de l'application

**Technical Considerations**:
- Ces tests peuvent nécessiter des tests manuels approfondis
- Certains scénarios peuvent nécessiter des outils de test automatisés (simulation de changements de périphériques)
- Les tests de fermeture/veille peuvent nécessiter des tests sur différents systèmes d'exploitation
- Documenter les versions de navigateur et OS utilisées pour chaque test

---

### TEST-002: Vérifier la Lecture de Flashback Après un Enregistrement de Plus de 30 Minutes (peut être fait pendant une séance de sport) {#test-002-vérifier-la-lecture-de-flashback-après-un-enregistrement-de-plus-de-30-minutes-peut-être-fait-pendant-une-séance-de-sport}

**Description**:  
Vérifier que la lecture d'un flashback fonctionne correctement après un enregistrement de plus de 30 minutes. Ce test vise à garantir que l'application gère correctement les enregistrements de longue durée et que les flashbacks restent accessibles et lisibles même après une session d'enregistrement prolongée.

**Scénario à Tester**:

1. **Enregistrement de longue durée**:
   - Démarrer un enregistrement et le laisser tourner pendant plus de 30 minutes
   - Vérifier que l'enregistrement continue sans interruption pendant toute la durée
   - Vérifier que les données sont correctement stockées et accessibles

2. **Lecture de flashback après enregistrement long**:
   - Après l'enregistrement de 30+ minutes, naviguer vers un flashback (retour en arrière)
   - Vérifier que la lecture du flashback démarre correctement
   - Vérifier que la synchronisation audio/vidéo est maintenue
   - Vérifier que la navigation dans le flashback fonctionne (avancer, reculer)
   - Vérifier que les différentes parties de l'enregistrement sont accessibles (début, milieu, fin)

**Acceptance Criteria**:
- [ ] L'enregistrement continue sans interruption pendant plus de 30 minutes
- [ ] Les flashbacks sont accessibles après un enregistrement de 30+ minutes
- [ ] La lecture des flashbacks démarre correctement sans erreur
- [ ] La synchronisation audio/vidéo est maintenue pendant la lecture
- [ ] La navigation dans les flashbacks fonctionne correctement (avancer, reculer, saut temporel)
- [ ] Toutes les parties de l'enregistrement sont accessibles (début, milieu, fin)
- [ ] Aucune perte de données ou corruption lors de la lecture
- [ ] Les performances restent acceptables (pas de ralentissement significatif)
- [ ] L'affichage de la timeline et des barres reste cohérent

**Résultats Attendus**:
- Rapport de test documentant le comportement observé
- Confirmation que les flashbacks fonctionnent correctement après un enregistrement long
- Identification de tout problème de performance ou de corruption de données
- Recommandations pour améliorer la gestion des enregistrements de longue durée (si nécessaire)

**Technical Considerations**:
- Ce test nécessite un test manuel de longue durée (30+ minutes)
- Vérifier la gestion mémoire pendant l'enregistrement long (rolling buffer, trim)
- Vérifier que les sessions sont correctement gérées et finalisées
- Vérifier que les chunks sont correctement stockés et accessibles
- Documenter les versions de navigateur et OS utilisées
- Tester avec différentes configurations (maxDuration différentes)
- Vérifier que le rolling buffer fonctionne correctement avec les enregistrements longs

**Priorité**: Moyenne-Haute (garantit la robustesse pour les sessions d'enregistrement prolongées)

**Note**: Ce test peut être effectué pendant une séance de sport, permettant de valider le comportement dans un contexte d'utilisation réel tout en optimisant le temps de test.

---

### TEST-003: Vérifier que la Mini-Enceinte ne S'Éteint Pas Après 30 Minutes d'Enregistrement (peut être fait pendant une séance de sport) {#test-003-vérifier-que-la-mini-enceinte-ne-setient-pas-après-30-minutes-denregistrement-peut-être-fait-pendant-une-séance-de-sport}

**Description**:  
Vérifier que la mini-enceinte (ou casque Bluetooth/USB) reste active et ne s'éteint pas après 30 minutes d'enregistrement continu. Ce test vise à valider que la solution de keep-alive audio (BUG-020) fonctionne correctement sur des sessions d'enregistrement prolongées et que l'enceinte reste active même en l'absence de lecture audio pendant une période prolongée.

**Scénario à Tester**:

1. **Enregistrement de longue durée avec keep-alive**:
   - Démarrer un enregistrement et le laisser tourner pendant plus de 30 minutes
   - Vérifier que l'enregistrement continue sans interruption pendant toute la durée
   - Vérifier que la mini-enceinte reste active (ne s'éteint pas) pendant toute la durée
   - Vérifier qu'aucun son audible n'est généré pour maintenir l'enceinte active

2. **Test de lecture après enregistrement long**:
   - Après l'enregistrement de 30+ minutes, naviguer vers un flashback (retour en arrière)
   - Vérifier que la lecture du flashback démarre immédiatement sans délai d'activation de l'enceinte
   - Vérifier que l'audio est audible dès le début de la lecture
   - Vérifier qu'il n'y a pas de coupure ou d'interruption audio

**Acceptance Criteria**:
- [ ] L'enregistrement continue sans interruption pendant plus de 30 minutes
- [ ] La mini-enceinte reste active pendant toute la durée de l'enregistrement (ne s'éteint pas)
- [ ] Aucun son audible n'est généré pour maintenir l'enceinte active
- [ ] La lecture des flashbacks démarre immédiatement sans délai d'activation de l'enceinte
- [ ] L'audio est audible dès le début de la lecture
- [ ] Aucune coupure ou interruption audio lors de la lecture
- [ ] Le test fonctionne avec différents types de périphériques (Bluetooth, USB, casques)
- [ ] Pas d'impact négatif sur la performance ou la consommation de batterie

**Résultats Attendus**:
- Rapport de test documentant le comportement observé
- Confirmation que la mini-enceinte reste active pendant 30+ minutes d'enregistrement
- Confirmation que la lecture démarre immédiatement sans délai
- Identification de tout problème de mise en veille ou d'extinction de l'enceinte
- Recommandations pour améliorer le keep-alive si nécessaire

**Technical Considerations**:
- Ce test nécessite un test manuel de longue durée (30+ minutes)
- Vérifier que le système de keep-alive audio (BUG-020) fonctionne correctement
- Vérifier que les signaux inaudibles sont bien générés à intervalles réguliers
- Tester avec différents types de périphériques audio (Bluetooth, USB, casques filaires)
- Documenter les versions de navigateur et OS utilisées
- Documenter le type et modèle de l'enceinte testée
- Vérifier l'impact sur la consommation de batterie (devrait être négligeable)
- Tester dans différents contextes (avec/sans interaction utilisateur)

**Priorité**: Moyenne-Haute (valide la solution BUG-020 sur des sessions prolongées)

**Note**: Ce test peut être effectué pendant une séance de sport, permettant de valider le comportement dans un contexte d'utilisation réel tout en optimisant le temps de test. Il peut être combiné avec TEST-002 pour tester simultanément la lecture de flashback et le keep-alive audio.

---



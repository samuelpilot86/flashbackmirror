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

- [BUG-015: Spacebar Adds Space in Max Duration Input Instead of Marker](#bug-015-spacebar-adds-space-in-max-duration-input-instead-of-marker)
- [BUG-020: Mini-Enceinte S'Éteint Après une Certaine Durée](#bug-020-mini-enceinte-setient-apres-une-certaine-duree)
- [BUG-022: Message "Aucun périphérique audio n'a été détecté" S'Affiche Trop Tôt](#bug-022-message-aucun-périphérique-audio-na-été-détecté-saffiche-trop-tôt)
- [BUG-023: Créer des Logs pour Déboguer l'Impossibilité de Lire la Vidéo Après un Enregistrement Prolongé](#bug-023-créer-des-logs-pour-déboguer-limpossibilité-de-lire-la-vidéo-après-un-enregistrement-prolongé)
- [FEAT-001: Menu d'Options avec Mode Miroir](#feat-001-menu-doptions-avec-mode-miroir)
- [FEAT-002: Paramétrage des Sources d'Enregistrement et de Restitution Audio et Vidéo](#feat-002-paramétrage-des-sources-denregistrement-et-de-restitution-audio-et-vidéo)
- [FEAT-003: Marquage Automatique de Moments Importants](#feat-003-marquage-automatique-de-moments-importants)
- [FEAT-004: Paramétrage de la Vitesse de Replay](#feat-004-paramétrage-de-la-vitesse-de-replay)
- [MARKETING-001: Créer un Logo pour Flashback Mirror](#marketing-001-créer-un-logo-pour-flashback-mirror)
- [MARKETING-002: Diffuser l'Application sur le Profil LinkedIn](#marketing-002-diffuser-lapplication-sur-le-profil-linkedin)
- [TEST-001: Tests de Comportement avec Changements d'Équipement et États Système](#test-001-tests-de-comportement-avec-changements-dequipement-et-etats-systeme)
- [TEST-002: Vérifier la Lecture de Flashback Après un Enregistrement de Plus de 30 Minutes (peut être fait pendant une séance de sport)](#test-002-vérifier-la-lecture-de-flashback-après-un-enregistrement-de-plus-de-30-minutes-peut-être-fait-pendant-une-séance-de-sport)
- [TEST-003: Vérifier que la Mini-Enceinte ne S'Éteint Pas Après 30 Minutes d'Enregistrement (peut être fait pendant une séance de sport)](#test-003-vérifier-que-la-mini-enceinte-ne-setient-pas-après-30-minutes-denregistrement-peut-être-fait-pendant-une-séance-de-sport)


## Backlog Items

### BUG-015: Spacebar Adds Space in Max Duration Input Instead of Marker {#bug-015-spacebar-adds-space-in-max-duration-input-instead-of-marker}

**Description**:  
When the user edits the *Max Duration* numeric field via keyboard and then presses `Space`, the focus remains on the input and the spacebar inserts a space character instead of adding a flashback marker (expected behavior of `Space` in the rest of the UI).

**Acceptance Criteria**:
- [ ] After typing in the *Max Duration* input and confirming (e.g. by `Enter`, `Tab`, or blur), pressing `Space` adds a flashback marker instead of inserting a space in the input.
- [ ] While the *Max Duration* input is focused and actively being edited, keyboard behavior is consistent and does not break marker shortcuts once focus leaves the field.
- [ ] The existing behavior of `Space` outside of text inputs (add marker) remains unchanged.

**Technical Considerations**:
- Review the global `keydown` handler in `App/index.html` to ensure it properly ignores events only when focus is on editable fields, and that focus is correctly removed from the numeric input after edition when appropriate.
- Consider normalizing the “editing finished” moment (on `blur` / `Enter`) to avoid lingering focus that captures spacebar presses.

---

### BUG-020: Mini-Enceinte S'Éteint Après une Certaine Durée {#bug-020-mini-enceinte-setient-apres-une-certaine-duree}

**Description**:  
La mini-enceinte (ou casque Bluetooth/USB) se met en veille automatiquement après une période d'inactivité audio, ce qui interrompt la lecture des flashbacks ou peut causer des problèmes lors de la reprise de l'enregistrement. Ce comportement est dû aux mécanismes d'économie d'énergie des périphériques audio.

**Comportement Actuel**:
- L'enceinte s'éteint automatiquement après 5-10 minutes sans signal audio
- Lors de la reprise de lecture d'un flashback, l'audio peut être coupé ou retardé
- L'utilisateur doit parfois réactiver manuellement l'enceinte
- Problème particulièrement visible lors de longues sessions d'enregistrement avec peu de flashbacks

**Comportement Attendu**:
- L'enceinte reste active pendant toute la durée d'utilisation de l'application
- La lecture des flashbacks démarre immédiatement sans délai ou coupure
- Aucune intervention manuelle requise pour maintenir l'enceinte active

**Acceptance Criteria**:
- [ ] L'enceinte reste active pendant toute la session d'enregistrement
- [ ] La lecture des flashbacks démarre immédiatement sans délai d'activation de l'enceinte
- [ ] Aucun son audible n'est généré pour maintenir l'enceinte active (solution transparente)
- [ ] La solution fonctionne avec différents types de périphériques (Bluetooth, USB, casques)
- [ ] Pas d'impact négatif sur la performance ou la consommation de batterie

**Proposition de Solution**:

**Approche 1 : Signal Audio Silencieux Périodique (Recommandé)**
- Générer un signal audio inaudible (fréquence très basse ou très haute, amplitude minimale) à intervalles réguliers (ex: toutes les 30-60 secondes)
- Utiliser l'API Web Audio pour créer un `OscillatorNode` avec une fréquence inaudible (ex: 20 Hz ou 20 kHz) et un gain très faible
- Activer ce signal uniquement pendant l'enregistrement ou les périodes d'inactivité audio
- Désactiver automatiquement pendant la lecture des flashbacks pour éviter toute interférence

**Approche 2 : Keep-Alive Audio Context (Maintien Actif de l'AudioContext)**
- Cette approche consiste à empêcher la suspension automatique de l'AudioContext par le navigateur, ce qui maintient une activité audio minimale et empêche l'enceinte de passer en veille. Contrairement à l'approche 1 qui génère un signal périodique, celle-ci se concentre sur la reprise proactive du contexte audio pour qu'il reste en état "running", même sans production de son. Cela évite les extinctions dues à l'inactivité perçue par l'enceinte, sans générer de signal audio (inaudible ou non).
- Fonctionnement : 
  - Créer un AudioContext dédié au keep-alive.
  - Utiliser un intervalle périodique (ex: toutes les 5-10 secondes) pour vérifier l'état du contexte via `audioContext.state`.
  - Si l'état est "suspended", appeler `audioContext.resume()` pour le remettre en "running".
  - S'assurer que le contexte est connecté à une destination audio (ex: un GainNode muet connecté à `audioContext.destination`) pour simuler une activité.
  - Avantages : Pas de génération de son (même inaudible), consommation minimale ; Inconvénients : Dépend de la politique de suspension du navigateur (certains navigateurs suspendent agressivement les contextes inactifs).
- S'assurer que le contexte audio reste dans l'état "running" même sans lecture active

**Approche 3 : Signal de Test Périodique**
- Jouer un son très court et silencieux (ex: 1ms de silence ou fréquence inaudible) toutes les 2-3 minutes
- Utiliser un `AudioBuffer` pré-généré pour éviter la latence
- S'assurer que le signal est complètement inaudible pour l'utilisateur

**Technical Considerations**:
- **Web Audio API**:
  - Créer un `AudioContext` dédié pour le keep-alive si nécessaire
  - Utiliser `OscillatorNode` avec `frequency` très basse/haute (20 Hz ou 20 kHz)
  - Régler le `gain` à un niveau minimal (ex: 0.001 ou moins) pour être inaudible
  - Utiliser `setInterval()` pour activer le signal périodiquement (ex: toutes les 30-60 secondes)
  
- **Intégration**:
  - Activer le keep-alive uniquement pendant l'enregistrement (état `RECORDING`)
  - Désactiver pendant la lecture des flashbacks pour éviter toute interférence
  - Gérer proprement le nettoyage lors de l'arrêt de l'application
  
- **Performance**:
  - Le signal doit être très léger en termes de CPU (fréquence basse, gain minimal)
  - Éviter de créer de nouveaux `OscillatorNode` à chaque intervalle (réutiliser ou utiliser `AudioBuffer`)
  - Tester l'impact sur la batterie (devrait être négligeable)

- **Compatibilité**:
  - Tester avec différents types de périphériques (Bluetooth, USB, casques filaires)
  - Vérifier que le signal inaudible ne cause pas de problèmes avec certains périphériques
  - Gérer les cas où l'API Web Audio n'est pas disponible (fallback)

**Exemple de Code (Approche 1)**:
```javascript
class AudioKeepAlive {
    constructor() {
        this.audioContext = null;
        this.oscillator = null;
        this.keepAliveInterval = null;
        this.isActive = false;
    }

    start() {
        if (this.isActive) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Créer un signal inaudible (20 Hz, gain très faible)
            this.oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            this.oscillator.type = 'sine';
            this.oscillator.frequency.value = 20; // 20 Hz (inaudible)
            gainNode.gain.value = 0.001; // Très faible amplitude
            
            this.oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Activer périodiquement (30 secondes d'intervalle)
            this.keepAliveInterval = setInterval(() => {
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
                // Jouer un signal très court (10ms)
                this.oscillator.start();
                setTimeout(() => {
                    if (this.oscillator) {
                        this.oscillator.stop();
                        // Recréer pour le prochain cycle
                        this.oscillator = this.audioContext.createOscillator();
                        const gain = this.audioContext.createGain();
                        this.oscillator.type = 'sine';
                        this.oscillator.frequency.value = 20;
                        gain.gain.value = 0.001;
                        this.oscillator.connect(gain);
                        gain.connect(this.audioContext.destination);
                    }
                }, 10);
            }, 30000); // Toutes les 30 secondes
            
            this.isActive = true;
        } catch (error) {
            console.warn('Audio keep-alive non disponible:', error);
        }
    }

    stop() {
        if (!this.isActive) return;
        
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        
        if (this.oscillator) {
            this.oscillator.stop();
            this.oscillator = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.isActive = false;
    }
}

// Utilisation dans l'application
const audioKeepAlive = new AudioKeepAlive();

// Démarrer pendant l'enregistrement
function startRecording() {
    // ... code d'enregistrement existant ...
    audioKeepAlive.start();
}

// Arrêter pendant la lecture ou l'arrêt
function stopRecording() {
    audioKeepAlive.stop();
    // ... code d'arrêt existant ...
}
```

**Dependencies**:
- Web Audio API (`AudioContext`, `OscillatorNode`, `GainNode`)
- Gestion des états de l'application (enregistrement vs lecture)

**Recommended Approach**:
1. Implémenter l'approche 1 (signal audio silencieux périodique) comme solution principale
2. Tester avec différents périphériques audio (Bluetooth, USB, casques)
3. Ajuster la fréquence et l'amplitude si nécessaire pour garantir l'inaudibilité
4. Ajouter un toggle optionnel dans les paramètres pour activer/désactiver le keep-alive si certains utilisateurs préfèrent le comportement par défaut
5. Monitorer l'impact sur la performance et la batterie

**Priorité**: Moyenne-Haute (affecte l'expérience utilisateur lors de longues sessions)

---

### BUG-022: Message "Aucun périphérique audio n'a été détecté" S'Affiche Trop Tôt {#bug-022-message-aucun-périphérique-audio-na-été-détecté-saffiche-trop-tôt}

**Description**:  
Le message "Aucun périphérique audio disponible. Veuillez connecter un périphérique audio." s'affiche dès l'ouverture du fichier `index.html`, alors même que l'application est capable de lire du son par la suite. Ce bug est probablement dû au fait que le test d'accès au périphérique audio se fait trop tôt, avant d'en avoir obtenu l'accès.

**Comportement Actuel**:
- Le message d'erreur "Aucun périphérique audio disponible" s'affiche immédiatement au chargement de la page
- L'application fonctionne correctement par la suite et peut lire du son
- Le message apparaît même lorsqu'un périphérique audio est connecté et fonctionnel
- L'utilisateur voit une alerte d'erreur inutile qui peut créer de la confusion

**Comportement Attendu**:
- Le message ne doit s'afficher que si aucun périphérique audio n'est réellement disponible
- Le test d'accès aux périphériques audio doit se faire après avoir obtenu les permissions nécessaires
- Si un périphérique audio est disponible, aucun message d'erreur ne doit être affiché
- Le message ne doit apparaître que si la vérification confirme l'absence de périphériques après avoir obtenu les permissions

**Acceptance Criteria**:
- [ ] Le message "Aucun périphérique audio disponible" ne s'affiche pas au chargement de la page si un périphérique est disponible
- [ ] Le test d'accès aux périphériques audio se fait après l'obtention des permissions (via `getUserMedia`)
- [ ] Le message s'affiche uniquement si aucun périphérique n'est réellement détecté après les permissions
- [ ] L'application peut lire du son sans afficher de message d'erreur erroné
- [ ] Le comportement est cohérent entre différents navigateurs

**Technical Considerations**:
- **Problème identifié** : Le test d'accès aux périphériques audio (`navigator.mediaDevices.enumerateDevices()`) est probablement appelé avant que `getUserMedia()` n'ait été invoqué, ce qui signifie que les permissions n'ont pas encore été accordées
- **Comportement de l'API** : `enumerateDevices()` peut retourner une liste vide ou des périphériques sans labels si les permissions n'ont pas été accordées au préalable
- **Solution envisagée** : Décaler le test d'accès aux périphériques audio dans le temps, après l'appel à `getUserMedia()` qui déclenche la demande de permissions
- **Investigation nécessaire** : Avant de valider cette solution, il convient de comprendre comment s'affiche ce message et donc comprendre ce qui bug exactement
  - Vérifier l'ordre d'exécution des appels (`AudioOutputMonitor.start()` vs `getUserMedia()`)
  - Vérifier si `enumerateDevices()` est appelé avant ou après l'obtention des permissions
  - Comprendre pourquoi `handleNoDevicesAvailable()` est appelé alors qu'un périphérique est disponible
  - Analyser les logs pour identifier le moment exact où le message apparaît

**Dependencies**:
- `AudioOutputMonitor` class (TECH-003)
- `navigator.mediaDevices.enumerateDevices()` API
- `getUserMedia()` pour l'obtention des permissions

**Recommended Approach**:
1. **Investigation** : Analyser le code pour comprendre l'ordre d'exécution et identifier pourquoi le message s'affiche trop tôt
2. **Comprendre le flux** : Tracer l'appel à `AudioOutputMonitor.start()` et `enumerateDevices()` pour voir quand ils sont exécutés par rapport à `getUserMedia()`
3. **Solution proposée** : Si le problème est confirmé, décaler l'appel à `AudioOutputMonitor.start()` ou `enumerateDevices()` après l'obtention des permissions via `getUserMedia()`
4. **Alternative** : Ajouter une vérification pour s'assurer que les permissions ont été accordées avant d'afficher le message d'erreur
5. **Test** : Vérifier que le message ne s'affiche plus au chargement et qu'il apparaît uniquement si aucun périphérique n'est réellement disponible

**Priorité**: Moyenne (affecte l'expérience utilisateur mais n'empêche pas l'utilisation de l'application)

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

### FEAT-001: Menu d'Options avec Mode Miroir {#feat-001-menu-doptions-avec-mode-miroir}

**Description**:  
Créer un menu d'options accessible depuis l'interface principale permettant de configurer divers paramètres de l'application, notamment le mode miroir pour l'affichage vidéo. Le mode miroir permet d'inverser horizontalement l'affichage de la vidéo, ce qui est utile pour les utilisateurs qui souhaitent voir leur reflet comme dans un miroir (utile pour les entraînements sportifs, la danse, etc.).

**User Value**:
- **Personnalisation** : Les utilisateurs peuvent adapter l'affichage à leurs préférences
- **Confort visuel** : Le mode miroir offre une expérience plus naturelle pour certains types d'entraînement
- **Flexibilité** : Accès facile aux options de configuration sans encombrer l'interface principale
- **Persistance** : Les préférences sont sauvegardées pour les sessions futures

**Acceptance Criteria**:
- [ ] Un bouton ou icône "Options" est visible dans l'interface principale
- [ ] Le menu d'options s'ouvre dans un modal ou un panneau latéral
- [ ] Le menu contient au minimum une option pour activer/désactiver le mode miroir
- [ ] Le mode miroir inverse horizontalement l'affichage de la vidéo (preview et flashbacks)
- [ ] L'état du mode miroir est sauvegardé dans localStorage et restauré au chargement
- [ ] Le menu peut être fermé via un bouton "Fermer" ou en cliquant en dehors du menu
- [ ] L'interface reste utilisable et intuitive avec le menu ouvert
- [ ] Le mode miroir fonctionne à la fois pour la preview en direct et pour les flashbacks

**Technical Considerations**:
- **Menu d'options**:
  - Créer un modal ou un panneau latéral pour afficher les options
  - Utiliser CSS pour le style et l'animation d'ouverture/fermeture
  - Gérer l'état d'ouverture/fermeture du menu
  
- **Mode miroir**:
  - Utiliser CSS `transform: scaleX(-1)` pour inverser horizontalement la vidéo
  - Appliquer la transformation à la fois sur `videoPreview` et `flashbackVideo`
  - S'assurer que la transformation n'affecte pas les autres éléments de l'interface
  - Tester que le mode miroir fonctionne correctement avec les différentes résolutions vidéo
  
- **Persistance**:
  - Sauvegarder l'état du mode miroir dans `localStorage` (ex: `mirrorModeEnabled`)
  - Restaurer l'état au chargement de l'application
  - Appliquer la transformation CSS dès le chargement si le mode miroir était activé
  
- **Intégration**:
  - Ajouter un bouton/icône dans l'interface principale (ex: en haut à droite)
  - Gérer l'ouverture/fermeture du menu via des événements JavaScript
  - S'assurer que le menu ne bloque pas les interactions avec l'application principale

**Dependencies**:
- Interface utilisateur existante
- Système de localStorage pour la persistance
- CSS pour les transformations et animations

**Recommended Approach**:
1. Créer un composant modal pour le menu d'options
2. Ajouter un bouton "Options" dans l'interface principale
3. Implémenter le toggle du mode miroir avec sauvegarde dans localStorage
4. Appliquer la transformation CSS `scaleX(-1)` sur les éléments vidéo
5. Tester que le mode miroir fonctionne pour la preview et les flashbacks
6. Ajouter d'autres options au menu si nécessaire (extensible pour futures fonctionnalités)

**Priorité**: Moyenne (améliore l'expérience utilisateur mais n'est pas bloquant)

---

### FEAT-002: Paramétrage des Sources d'Enregistrement et de Restitution Audio et Vidéo {#feat-002-paramétrage-des-sources-denregistrement-et-de-restitution-audio-et-vidéo}

**Description**:  
Permettre à l'utilisateur de sélectionner et configurer les sources d'enregistrement (caméra, micro) et de restitution (haut-parleurs, écouteurs) audio et vidéo. Cette fonctionnalité permet de choisir parmi les périphériques disponibles et de personnaliser l'expérience d'enregistrement et de lecture selon les préférences et l'équipement de l'utilisateur.

**User Value**:
- **Flexibilité** : Choix du périphérique d'enregistrement (caméra avant/arrière, micro intégré/externe)
- **Qualité** : Sélection du meilleur périphérique disponible pour optimiser la qualité d'enregistrement
- **Confort** : Choix du périphérique de restitution audio (haut-parleurs, écouteurs, Bluetooth)
- **Personnalisation** : Adaptation de l'application à différents contextes d'utilisation (sport, danse, éloquence)
- **Persistance** : Sauvegarde des préférences pour les sessions futures

**Comportement Actuel**:
- L'application utilise les périphériques par défaut du système
- Aucune possibilité de choisir une caméra spécifique (avant/arrière)
- Aucune possibilité de choisir un micro spécifique
- La restitution audio utilise le périphérique par défaut (avec basculement automatique en cas de déconnexion via TECH-003)

**Comportement Attendu**:
- Un menu de sélection des périphériques est accessible depuis le menu d'options (FEAT-001)
- L'utilisateur peut choisir parmi les caméras disponibles (avant, arrière, externes)
- L'utilisateur peut choisir parmi les micros disponibles (intégré, externe, Bluetooth)
- L'utilisateur peut choisir parmi les périphériques de sortie audio disponibles
- Les sélections sont sauvegardées et restaurées au chargement
- Les changements de périphériques sont appliqués immédiatement ou au prochain enregistrement

**Acceptance Criteria**:
- [ ] Un menu de sélection des périphériques est accessible depuis le menu d'options
- [ ] Liste des caméras disponibles avec leurs labels (ex: "FaceTime HD Camera", "USB Camera")
- [ ] Liste des micros disponibles avec leurs labels (ex: "Built-in Microphone", "USB Microphone")
- [ ] Liste des périphériques de sortie audio disponibles avec leurs labels
- [ ] Sélection d'une caméra appliquée lors du prochain enregistrement
- [ ] Sélection d'un micro appliquée lors du prochain enregistrement
- [ ] Sélection d'un périphérique de sortie audio appliquée immédiatement pour les flashbacks
- [ ] Les préférences sont sauvegardées dans localStorage et restaurées au chargement
- [ ] Détection automatique des nouveaux périphériques connectés
- [ ] Gestion des périphériques déconnectés (retour au défaut ou notification)

**Technical Considerations**:
- **API MediaDevices**:
  - Utiliser `navigator.mediaDevices.enumerateDevices()` pour lister les périphériques
  - Utiliser `getUserMedia({ video: { deviceId: {...} }, audio: { deviceId: {...} } })` pour sélectionner les périphériques
  - Utiliser `setSinkId()` pour la sélection de la sortie audio (déjà partiellement implémenté)
  
- **Interface utilisateur**:
  - Ajouter des sélecteurs (dropdowns) dans le menu d'options (FEAT-001)
  - Afficher les labels des périphériques (nécessite les permissions)
  - Gérer les cas où aucun périphérique n'est disponible
  - Afficher l'état actuel (périphérique sélectionné)
  
- **Gestion des permissions**:
  - S'assurer que les permissions sont accordées avant d'afficher les labels
  - Gérer les cas où les permissions sont refusées
  
- **Persistance**:
  - Sauvegarder les `deviceId` sélectionnés dans localStorage
  - Restaurer les sélections au chargement
  - Gérer les cas où un périphérique sauvegardé n'est plus disponible
  
- **Intégration**:
  - Modifier `startRecording()` pour utiliser les périphériques sélectionnés
  - Modifier `setAudioOutputDevice()` pour utiliser la sélection sauvegardée
  - Intégrer avec `AudioOutputMonitor` (TECH-003) pour la détection des changements

**Dependencies**:
- FEAT-001 (Menu d'Options) pour l'interface de sélection
- TECH-003 (AudioOutputMonitor) pour la détection des périphériques audio
- API MediaDevices du navigateur
- Système de localStorage pour la persistance

**Recommended Approach**:
1. Créer une section "Périphériques" dans le menu d'options (FEAT-001)
2. Implémenter la fonction de liste des périphériques disponibles (caméras, micros, sorties audio)
3. Créer des sélecteurs (dropdowns) pour chaque type de périphérique
4. Sauvegarder les sélections dans localStorage
5. Modifier `startRecording()` pour utiliser les périphériques sélectionnés
6. Modifier la gestion de la sortie audio pour utiliser la sélection sauvegardée
7. Gérer les cas où un périphérique sauvegardé n'est plus disponible
8. Tester avec différents périphériques et scénarios de connexion/déconnexion

**Priorité**: Moyenne-Haute (améliore significativement la flexibilité et l'expérience utilisateur)

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
- FEAT-001 (Menu d'Options) pour le toggle et la configuration
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
   - Intégrer le contrôle dans le menu d'options (FEAT-001) si souhaité
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

### MARKETING-002: Diffuser l'Application sur le Profil LinkedIn {#marketing-002-diffuser-lapplication-sur-le-profil-linkedin}

**Description**:  
Créer et publier un post sur LinkedIn pour présenter Flashback Mirror, partager le lien vers l'application, et promouvoir le projet sur le réseau professionnel. Cette action vise à faire connaître l'application, obtenir des retours, et démontrer les compétences en product management.

**User Value**:
- **Visibilité** : Faire connaître Flashback Mirror à un réseau professionnel
- **Feedback** : Obtenir des retours d'utilisateurs et de pairs
- **Networking** : Créer des opportunités de connexion et de collaboration
- **Portfolio** : Démontrer les compétences en product management et développement de produits
- **Validation** : Tester l'intérêt du marché pour le concept

**Comportement Actuel**:
- L'application n'est pas promue sur LinkedIn
- Le projet n'est pas visible sur le réseau professionnel

**Comportement Attendu**:
- Un post LinkedIn est créé et publié
- Le post présente Flashback Mirror de manière engageante
- Le post inclut le lien vers l'application (GitHub Pages)
- Le post inclut des visuels (captures d'écran, logo si disponible)
- Le post génère de l'engagement (likes, commentaires, partages)

**Acceptance Criteria**:
- [ ] Un post LinkedIn est rédigé pour présenter Flashback Mirror
- [ ] Le post explique clairement le concept et la valeur de l'application
- [ ] Le post inclut le lien vers l'application (https://samuelpilot86.github.io/flashbackmirror/)
- [ ] Le post inclut des visuels (captures d'écran, logo si disponible)
- [ ] Le post est publié sur le profil LinkedIn
- [ ] Le post utilise un ton professionnel mais accessible
- [ ] Le post invite à l'essai et aux retours

**Technical Considerations**:
- **Contenu du post**:
  - Titre accrocheur
  - Description du problème résolu
  - Présentation de la solution unique (enregistrement continu + navigation temporelle)
  - Cas d'usage (sport, danse, éloquence)
  - Lien vers l'application
  - Call-to-action (essayer, donner des retours)
  
- **Visuels**:
  - Captures d'écran de l'application en action
  - Logo (si MARKETING-001 est complété)
  - Peut-être une courte vidéo GIF ou vidéo de démonstration
  
- **Timing**:
  - Publier à un moment où l'audience est active
  - Considérer les fuseaux horaires de l'audience cible
  
- **Hashtags**:
  - Utiliser des hashtags pertinents (#ProductManagement, #MVP, #WebApp, #Innovation, etc.)

**Dependencies**:
- MARKETING-001 (Logo) - Optionnel mais recommandé pour avoir un logo à inclure
- Application fonctionnelle et accessible en ligne
- Captures d'écran de l'application

**Recommended Approach**:
1. Préparer le contenu du post (texte, visuels)
2. Créer des captures d'écran de l'application en action
3. Intégrer le logo si disponible (MARKETING-001)
4. Rédiger le post LinkedIn avec un ton professionnel et engageant
5. Ajouter des hashtags pertinents
6. Publier le post sur LinkedIn
7. Répondre aux commentaires et interactions
8. Suivre l'engagement et les retours

**Priorité**: Moyenne-Haute (important pour la visibilité et la validation du concept)

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



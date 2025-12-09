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

- [US-009: Stop Flashback & Resume Recording](#us-009-stop-flashback--resume-recording)
- [BUG-015: Spacebar Adds Space in Max Duration Input Instead of Marker](#bug-015-spacebar-adds-space-in-max-duration-input-instead-of-marker)
- [BUG-019: Images Trop Rapprochées dans la Photo Timeline](#bug-019-images-trop-rapprochees-dans-la-photo-timeline)
- [BUG-020: Mini-Enceinte S'Éteint Après une Certaine Durée](#bug-020-mini-enceinte-setient-apres-une-certaine-duree)
- [FEAT-001: Menu d'Options avec Mode Miroir](#feat-001-menu-doptions-avec-mode-miroir)
- [UX-003: Onboarding Tutorial and Contextual Tooltips](#ux-003-onboarding-tutorial-and-contextual-tooltips)
- [TEST-001: Tests de Comportement avec Changements d'Équipement et États Système](#test-001-tests-de-comportement-avec-changements-dequipement-et-etats-systeme)
- [TEST-002: Vérifier la Lecture de Flashback Après un Enregistrement de Plus de 30 Minutes (peut être fait pendant une séance de sport)](#test-002-vérifier-la-lecture-de-flashback-après-un-enregistrement-de-plus-de-30-minutes-peut-être-fait-pendant-une-séance-de-sport)
- [TEST-003: Vérifier que la Mini-Enceinte ne S'Éteint Pas Après 30 Minutes d'Enregistrement (peut être fait pendant une séance de sport)](#test-003-vérifier-que-la-mini-enceinte-ne-setient-pas-après-30-minutes-denregistrement-peut-être-fait-pendant-une-séance-de-sport)


## Backlog Items

### US-009: Stop Flashback & Resume Recording {#us-009-stop-flashback--resume-recording}
(non-urgent because navigating using the Down button does the same)
**As a** user watching a flashback,
**I want** to be able to stop the flashback playback early and resume recording immediately,
**So that** I don't have to wait for long flashbacks to complete and can continue recording without interruption.

**Acceptance Criteria:**
- [ ] "Stop Flashback" button appears during flashback playback
- [ ] Clicking the button immediately stops playback and starts recording
- [ ] Same behavior as natural end of playback (recording resumes seamlessly)
- [ ] Button hidden during recording state and when stopped
- [ ] Keyboard shortcut (Escape key) for same functionality
- [ ] Visual feedback during transition from playback to recording
- [ ] No data loss or recording gaps during transition

**Example Behavior:**
- **During flashback**: "Stop Flashback" button visible
- **Click/Escape**: Playback stops immediately, recording starts immediately
- **Same as natural end**: No difference in behavior between early stop and natural completion
- **Quick workflow**: User can exit long flashbacks and continue recording seamlessly

**Technical Requirements:**
- Playback interruption handling without corruption
- Seamless transition from playback to recording state
- UI state management for button visibility (only during playback)
- Keyboard event handling (Escape key)
- Maintain recording continuity and session integrity
- No performance impact on transition speed

---


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

### BUG-019: Images Trop Rapprochées dans la Photo Timeline {#bug-019-images-trop-rapprochees-dans-la-photo-timeline}

**Description**:  
Les images (miniatures) dans la photo timeline sont trop rapprochées les unes des autres, ce qui rend l'affichage difficile à lire et peu esthétique. Il manque un espacement visuel suffisant entre les miniatures pour permettre une meilleure distinction et lisibilité.

**Comportement Actuel**:
- Les miniatures sont positionnées de manière contiguë sans espacement visible
- Les bordures entre les images peuvent se chevaucher ou être trop fines
- L'affichage peut paraître encombré et difficile à parcourir visuellement

**Comportement Attendu**:
- Un espacement visible (gap) entre chaque miniature pour améliorer la lisibilité
- Les images restent proportionnelles à leur intervalle de temps
- L'affichage reste cohérent avec la timeline et la waveform
- L'espacement ne doit pas compromettre la précision du positionnement temporel

**Acceptance Criteria**:
- [ ] Ajouter un espacement visuel (gap) entre les miniatures de la photo timeline
- [ ] L'espacement doit être suffisant pour améliorer la lisibilité sans compromettre la précision
- [ ] L'espacement doit être cohérent sur toute la longueur de la timeline
- [ ] L'espacement doit être adaptatif selon la largeur disponible et le nombre d'images
- [ ] Les clics sur la timeline doivent toujours fonctionner correctement malgré l'espacement

**Technical Considerations**:
- Modifier `renderPhotoTimeline()` pour ajouter un espacement entre les miniatures
- L'espacement peut être géré via CSS (`gap`, `margin`, ou `padding`) ou via le calcul de positionnement JavaScript
- S'assurer que l'espacement n'affecte pas le calcul de position pour les clics (`calculateTargetTimeFromClick`)
- Considérer un espacement minimal (ex: 1-2px) et un espacement maximal pour éviter de trop étirer l'affichage
- Tester avec différents nombres d'images et différentes durées d'enregistrement

**Référence**:
- Capture d'écran du problème datée du jour de la création de ce bug

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

### UX-003: Onboarding Tutorial and Contextual Tooltips {#ux-003-onboarding-tutorial-and-contextual-tooltips}

**Description**:  
Implement an onboarding tutorial modal and contextual tooltips to help new users quickly understand Flashback Mirror's unique interface and functionality. The application combines continuous recording, unified timeline, exponential navigation (flashback), and marker features in a way that goes beyond traditional video recorders or players, which can be confusing for new users.

**User Value**:
- **Quick understanding** : New users can grasp the core concepts and use cases in 1-2 minutes
- **Reduced learning curve** : Contextual help guides users through their first interactions
- **Better adoption** : Users are more likely to use advanced features if they understand them quickly
- **Professional experience** : Onboarding demonstrates attention to user experience

**Acceptance Criteria**:

**Onboarding Tutorial Modal**:
- [ ] A modal appears on first launch (detected via localStorage)
- [ ] The modal displays 4 short steps:
  1. "Welcome! Flashback Mirror records continuously to help you easily review yourself and improve (sports, dance, performing arts, public speaking...)."
  2. "Use ← to go back in time, → to go forward."
  3. "Click on the timeline to review a specific moment."
  4. "Recording has started automatically. Happy training!"
- [ ] The modal includes a checkbox or button "Never show tutorial again" for persistence
- [ ] The modal can be closed via a button or clicking outside
- [ ] The preference is saved in localStorage and respected on subsequent visits

**Contextual Tooltips**:
- [ ] **Timeline hover**: Tooltip displays "Click to jump to a specific moment."
- [ ] **←/→ buttons hover**: Tooltip displays "Go back/forward in time (repeated presses increase the distance)."
- [ ] **Mark button hover**: Tooltip displays "Click on Mark to create a marker. Navigate to previous/next marker with the Up and Down buttons."
- [ ] **Marker Up/Down buttons hover**: Tooltip displays "Navigate to previous/next marker."
- [ ] Tooltips appear on hover and disappear when the cursor leaves
- [ ] Tooltips are positioned appropriately and don't obstruct the interface

**Contextual Overlays**:
- [ ] **First flashback**: When user enters flashback mode for the first time, display an overlay: "You are in flashback mode. Use Esc to record again."
- [ ] The overlay appears temporarily (e.g., 5 seconds) or can be dismissed
- [ ] The overlay doesn't appear again after the first flashback (saved in localStorage)

**Technical Considerations**:
- **Onboarding Modal**:
  - Check `localStorage.getItem('flashbackOnboardingShown')` on page load
  - Create a modal component with CSS styling (centered, semi-transparent background)
  - Use CSS animations for smooth appearance/disappearance
  - Save preference in localStorage when "Never show again" is checked
  
- **Tooltips**:
  - Use CSS `::before` or `::after` pseudo-elements, or create tooltip divs dynamically
  - Position tooltips relative to the hovered element (above, below, or to the side)
  - Use JavaScript event listeners (`mouseenter`, `mouseleave`) to show/hide tooltips
  - Ensure tooltips don't overflow viewport boundaries
  - Consider using a tooltip library (e.g., Tippy.js) for advanced positioning and animations
  
- **Contextual Overlays**:
  - Track first flashback entry via localStorage (`flashbackFirstTime`)
  - Display overlay when entering flashback mode for the first time
  - Use CSS for positioning and styling (similar to existing overlays like time offset overlay)
  - Auto-dismiss after timeout or allow manual dismissal
  
- **Performance**:
  - Ensure tooltips don't cause performance issues with frequent hover events
  - Lazy-load tooltip content if needed
  - Minimize DOM manipulation for tooltip creation/destruction

**Dependencies**:
- Interface utilisateur existante
- Système de localStorage pour la persistance
- CSS pour les styles et animations
- JavaScript pour la gestion des événements et états

**Recommended Approach**:
1. Implement the onboarding modal first (simpler, high impact)
2. Add tooltips to key interactive elements (timeline, navigation buttons, markers)
3. Add contextual overlay for first flashback
4. Test with new users to validate effectiveness
5. Iterate based on feedback

**Implementation Details**:

**Onboarding Modal Structure**:
```javascript
// Check on page load
if (!localStorage.getItem('flashbackOnboardingShown')) {
    showOnboardingModal();
}

function showOnboardingModal() {
    // Create modal with 4 steps
    // Add checkbox "Never show again"
    // Save preference on close
}
```

**Tooltip Implementation**:
```javascript
// Add data-tooltip attributes to elements
// Or use event listeners on hover
element.addEventListener('mouseenter', showTooltip);
element.addEventListener('mouseleave', hideTooltip);
```

**Priority**: High (significantly improves user onboarding and reduces confusion)

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



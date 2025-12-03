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
<!-- Also, a sorting has been added by category inducing some prioritization. Insert new items under the "To be sorted" category -->


### Avant diffusion

- [BUG-020: Entrée et Sortie Audio Doivent Toujours Utiliser les Périphériques par Défaut du Device](#bug-020-entree-et-sortie-audio-doivent-toujours-utiliser-les-peripheriques-par-defaut-du-device)


### Diffusion

- [BUG-017: Application Works Only on One Computer, Fails on Other Devices](#bug-017-application-works-only-on-one-computer-fails-on-other-devices)
- [DEPLOY-001: Deploy Application to Web Hosting](#deploy-001-deploy-application-to-web-hosting)


### Après diffusion

- [US-009: Stop Flashback & Resume Recording](#us-009-stop-flashback--resume-recording)
- [BUG-015: Spacebar Adds Space in Max Duration Input Instead of Marker](#bug-015-spacebar-adds-space-in-max-duration-input-instead-of-marker)
- [BUG-018: Progression par Puissance de 2 Incorrecte lors d'Appuis Rapides sur Back](#bug-018-progression-par-puissance-de-2-incorrecte-lors-dappuis-rapides-sur-back)
- [BUG-019: Images Trop Rapprochées dans la Photo Timeline](#bug-019-images-trop-rapprochees-dans-la-photo-timeline)
- [UX-001: Display Time Offset Overlay on Video](#ux-001-display-time-offset-overlay-on-video)
- [TECH-002: Monitor and Adapt to Default Audio Device Changes](#tech-002-monitor-and-adapt-to-default-audio-device-changes)
- [TEST-001: Tests de Comportement avec Changements d'Équipement et États Système](#test-001-tests-de-comportement-avec-changements-dequipement-et-etats-systeme)


## Backlog Items

### BUG-020: Entrée et Sortie Audio Doivent Toujours Utiliser les Périphériques par Défaut du Device {#bug-020-entree-et-sortie-audio-doivent-toujours-utiliser-les-peripheriques-par-defaut-du-device}

**Description**:  
L'application doit toujours utiliser les périphériques d'entrée et de sortie audio par défaut du système, y compris lors des changements de périphériques (par exemple, branchement d'une enceinte Bluetooth, changement de casque, etc.). Actuellement, l'application peut ne pas suivre automatiquement les changements de périphériques par défaut, ce qui peut causer des problèmes d'audio (pas de son, mauvais périphérique utilisé).

**Comportement Actuel**:
- L'application peut utiliser un périphérique audio spécifique au démarrage
- Lors d'un changement de périphérique par défaut (ex: branchement d'une enceinte Bluetooth), l'application peut continuer à utiliser l'ancien périphérique
- L'audio peut ne pas être routé vers le nouveau périphérique par défaut
- L'enregistrement peut continuer avec l'ancien microphone même si un nouveau périphérique par défaut est sélectionné

**Comportement Attendu**:
- L'application utilise toujours les périphériques audio par défaut du système
- Lors d'un changement de périphérique par défaut, l'application détecte le changement et s'adapte automatiquement
- L'audio de lecture (flashback) est automatiquement routé vers le nouveau périphérique de sortie par défaut
- L'enregistrement utilise automatiquement le nouveau périphérique d'entrée par défaut (si possible sans interruption)
- Les changements de périphériques sont transparents pour l'utilisateur (pas besoin de redémarrer l'application)

**Scénarios à Gérer**:
1. **Branchement d'une enceinte Bluetooth** pendant l'enregistrement ou la lecture
2. **Branchement d'un casque** pendant l'enregistrement ou la lecture
3. **Débranchement d'un périphérique** (retour au périphérique par défaut précédent)
4. **Changement du périphérique par défaut dans les paramètres système** pendant l'utilisation
5. **Démarrage de l'application** avec un périphérique par défaut déjà configuré

**Acceptance Criteria**:
- [ ] L'application détecte automatiquement les changements de périphériques audio par défaut
- [ ] L'audio de lecture (flashback) est automatiquement routé vers le nouveau périphérique de sortie par défaut
- [ ] L'enregistrement utilise automatiquement le nouveau périphérique d'entrée par défaut (si possible sans interruption)
- [ ] Les changements sont transparents pour l'utilisateur (pas de message d'erreur, pas besoin de redémarrer)
- [ ] L'application fonctionne correctement au démarrage avec les périphériques par défaut actuels
- [ ] Pas de perte de données ou d'interruption de l'enregistrement lors des changements de périphériques d'entrée
- [ ] Pas d'interruption de la lecture lors des changements de périphériques de sortie

**Technical Considerations**:
- **Détection des changements**:
  - Utiliser `navigator.mediaDevices.addEventListener('devicechange', ...)` pour détecter les ajouts/suppressions de périphériques
  - Polling périodique (toutes les 0,5 secondes) comme fallback pour les navigateurs sans support de `devicechange`
  - Utiliser `navigator.mediaDevices.enumerateDevices()` pour obtenir la liste des périphériques disponibles
  
- **Audio de sortie (lecture)**:
  - Pour les éléments HTML5 `<video>`/`<audio>`, le routage est généralement géré automatiquement par le navigateur
  - Utiliser `setSinkId()` si disponible pour forcer le routage vers le périphérique par défaut
  - Vérifier périodiquement le périphérique par défaut et mettre à jour si nécessaire
  
- **Audio d'entrée (enregistrement)**:
  - Lors d'un changement de périphérique d'entrée par défaut, deux options :
    - Option A: Détecter le changement et notifier l'utilisateur, permettant de continuer avec l'ancien périphérique ou de basculer
    - Option B: Automatiquement réinitialiser `getUserMedia()` avec le nouveau périphérique par défaut (peut interrompre l'enregistrement)
    - Option C: Continuer avec le stream actuel mais détecter le changement pour le prochain enregistrement
    On choisit ici l'option A si disponible, sinon poser la question avant d'implémenter
  
- **Gestion du stream actuel**:
  - Stocker l'ID du périphérique actuellement utilisé
  - Comparer périodiquement avec le périphérique par défaut du système
  - Décider si une transition est nécessaire et comment la gérer
  
- **Compatibilité navigateur**:
  - `devicechange` est bien supporté dans les navigateurs modernes
  - `setSinkId()` a un support limité (Chrome/Edge, pas Safari/Firefox)
  - Implémenter des fallbacks pour les navigateurs sans support complet

**Dependencies**:
- `navigator.mediaDevices` API (déjà utilisé pour `getUserMedia`)
- Support navigateur pour `devicechange` et `setSinkId()` (avec fallbacks)
- Gestion des streams audio/vidéo existants

**Recommended Approach**:
1. Implémenter un listener `devicechange` pour détecter les changements de périphériques
2. Ajouter un polling périodique (toutes les 0,5 secondes) comme fallback
3. Pour la sortie audio: Utiliser `setSinkId()` si disponible, sinon s'appuyer sur le routage automatique du navigateur
4. Pour l'entrée audio: Détecter les changements et notifier l'utilisateur ou basculer automatiquement selon la stratégie choisie
5. Tester avec des scénarios courants: branchement/débranchement d'enceintes Bluetooth, changement de casque, modification des paramètres système

**Priorité**: Avant diffusion (bloquant pour une utilisation en production)

**Liens**:
- Lié à TECH-002 (amélioration future pour une gestion plus avancée)
- Lié à TEST-001 (scénarios de test similaires)

---

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

### BUG-018: Progression par Puissance de 2 Incorrecte lors d'Appuis Rapides sur Back {#bug-018-progression-par-puissance-de-2-incorrecte-lors-dappuis-rapides-sur-back}

**Description**:  
Lors d'appuis rapides successifs sur le bouton Back (←), la progression n'est pas réellement par puissance de 2. Actuellement, le 2ème appui recule de 3 secondes au total (2 + 1) au lieu de 2 secondes. Le comportement attendu est une progression cumulative correcte : 1s au 1er appui, 1s au 2ème (total 2s), 2s au 3ème (total 4s), 4s au 4ème (total 8s), etc.

**Comportement Actuel (Incorrect)**:
- 1er appui : recule de 1s (total : 1s) ✓
- 2ème appui : recule de 2s depuis position actuelle (total : 1 + 2 = 3s) ✗
- 3ème appui : recule de 4s depuis position actuelle (total : 3 + 4 = 7s) ✗

**Comportement Attendu (Correct)**:
- 1er appui : recule de 1s (total : 1s) ✓
- 2ème appui : recule de 1s de plus (total : 2s) ✓
- 3ème appui : recule de 2s de plus (total : 4s) ✓
- 4ème appui : recule de 4s de plus (total : 8s) ✓

**Acceptance Criteria**:
- [ ] Le 1er appui sur Back recule d'exactement 1 seconde
- [ ] À partir du 2ème appui, chaque appui recule de `2^(nombre_d_appuis - 2)` secondes depuis la position actuelle
- [ ] La progression cumulative suit correctement les puissances de 2 : 1s, 2s, 4s, 8s, 16s...
- [ ] Le même comportement s'applique aux appuis rapides successifs (sans réinitialisation du compteur)

**Formule de Calcul**:
- 1er appui (n=1) : delta = 1 seconde
- n-ième appui (n≥2) : delta = 2^(n-2) secondes

**Exemple**:
- Appui 1 : delta = 1s → position = initiale - 1s
- Appui 2 : delta = 2^(2-2) = 2^0 = 1s → position = (initiale - 1s) - 1s = initiale - 2s
- Appui 3 : delta = 2^(3-2) = 2^1 = 2s → position = (initiale - 2s) - 2s = initiale - 4s
- Appui 4 : delta = 2^(4-2) = 2^2 = 4s → position = (initiale - 4s) - 4s = initiale - 8s

**Technical Considerations**:
- Modifier `calculateSeekDuration()` pour calculer le delta incrémental au lieu de la durée totale
- Ou modifier `handleBack()` pour calculer la position cible cumulative correcte
- S'assurer que le compteur `backPressCount` est correctement géré et réinitialisé après le timeout

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

### BUG-017: Application Works Only on One Computer, Fails on Other Devices {#bug-017-application-works-only-on-one-computer-fails-on-other-devices}

**Description**:  
The application currently works reliably only on the user’s main computer, but fails to function correctly on other devices such as the user’s laptop and Juliette’s laptop/tablet. The exact failure modes may include inability to access camera/microphone, blank video, recording not starting, or flashback features not working.

**Acceptance Criteria**:
- [ ] Reproduce and document the behavior on at least two other devices (e.g. laptop + tablet), noting browser, OS, and error messages (console + UI).
- [ ] Identify whether the root cause is browser support, HTTPS / permissions issues, hardware constraints, or app-level bugs.
- [ ] Implement fixes or clear fallbacks so that the app either works or shows an explicit, understandable error message on these devices.
- [ ] Update documentation with a short compatibility note (supported browsers / known limitations).

**Technical Considerations**:
- Check for environment assumptions in `index.html` (e.g. use of experimental APIs, insecure context, missing permission handling).
- Inspect browser console logs and `navigator.mediaDevices.getUserMedia` error details on the failing devices.
- Consider adding a lightweight compatibility check at startup (camera/microphone support, MIME types, feature detection) and surfacing a clear message if something essential is missing.

---

### DEPLOY-001: Deploy Application to Web Hosting {#deploy-001-deploy-application-to-web-hosting}

**Description**:  
Deploy the Flashback application to a web hosting service so that it is accessible from any device via a URL, without requiring local file access or a local server.

**User Value**:
- **Accessibility**: Users can access the application from any device with a web browser, without needing to download or install anything
- **Sharing**: Easy to share the application with others via a simple URL
- **Cross-platform**: Works on any device that supports modern web browsers
- **No setup required**: Users don't need to set up a local development environment

**Acceptance Criteria**:
- [ ] Application is accessible via a public URL (HTTPS required for camera/microphone access)
- [ ] All features work correctly in the hosted environment (recording, flashback, markers, etc.)
- [ ] Application loads quickly and performs well over network connections
- [ ] HTTPS certificate is properly configured (required for `getUserMedia` API)
- [ ] Application is accessible from multiple devices and browsers
- [ ] Error handling works correctly (e.g. camera/microphone permissions denied)

**Technical Considerations**:
- **Hosting options** to consider:
  - Static hosting services (Netlify, Vercel, GitHub Pages, Cloudflare Pages)
  - Traditional web hosting (shared hosting, VPS)
  - Cloud platforms (AWS S3 + CloudFront, Google Cloud Storage, Azure Static Web Apps)
- **HTTPS requirement**: The application requires HTTPS to access camera/microphone via `getUserMedia` API (browser security requirement)
- **File structure**: The application is currently a single `index.html` file, which simplifies deployment
- **No backend required**: The application is fully client-side, so no server-side code or database is needed
- **Domain name**: Consider whether to use a custom domain or a subdomain of the hosting service
- **Performance**: Ensure the hosting service provides good performance and low latency
- **Cost**: Evaluate free vs. paid hosting options based on traffic and requirements

**Dependencies**:
- Current application is a single HTML file with embedded CSS and JavaScript
- No build process required (can be deployed as-is)
- HTTPS certificate (usually provided by hosting service)

**Recommended Approach**:
1. Choose a static hosting service (Netlify or Vercel recommended for ease of use and free HTTPS)
2. Create an account and connect to the repository (if using Git) or upload the `index.html` file
3. Configure custom domain (optional)
4. Test on multiple devices and browsers
5. Document the deployment URL and any access requirements

---

### TECH-002: Monitor and Adapt to Default Audio Device Changes {#tech-002-monitor-and-adapt-to-default-audio-device-changes}

**Description**:  
Implement automatic detection and adaptation when the user's default audio input or output devices change (e.g., plugging/unplugging headphones, switching speakers, changing microphones). The application should regularly check the default audio devices and automatically route audio to/from the correct devices.

**User Value**:
- **Seamless experience**: Users don't need to manually reconfigure the application when they change audio devices
- **Automatic adaptation**: Flashback playback automatically uses the new default output device (headphones, speakers, etc.)
- **Recording continuity**: Recording automatically switches to the new default input device if the microphone changes
- **No interruption**: Device changes don't require restarting the application or re-initializing the recording

**Acceptance Criteria**:
- [ ] Application periodically checks (e.g., every 1-2 seconds) for changes in the default audio output device
- [ ] When default output device changes, flashback playback audio is automatically routed to the new device
- [ ] Application periodically checks for changes in the default audio input device
- [ ] When default input device changes during recording, the recording automatically switches to the new device (or at least detects and notifies the user)
- [ ] Device changes don't cause crashes or loss of recording data
- [ ] Works across different operating systems (macOS, Windows, Linux) and browsers

**Technical Considerations**:
- **Audio Output (Playback)**:
  - Use `navigator.mediaDevices.enumerateDevices()` to detect available audio output devices
  - Monitor for device changes using `navigator.mediaDevices.addEventListener('devicechange', ...)`
  - For HTML5 video/audio elements, audio routing is typically handled by the browser automatically, but may need explicit device selection via `setSinkId()` API (if supported)
  - Consider using Web Audio API `AudioContext` with `setSinkId()` for more control over output routing (browser support varies)
  
- **Audio Input (Recording)**:
  - Monitor `navigator.mediaDevices` for device changes
  - When input device changes, may need to:
    - Option A: Automatically reinitialize `getUserMedia()` with the new default device (may interrupt recording)
    - Option B: Detect the change and notify the user, allowing them to continue with current device or switch
    - Option C: Continue with current stream but warn user that default device has changed
  
- **Implementation approach**:
  - Add a periodic check (setInterval) to enumerate devices and compare with previously detected devices
  - Use `devicechange` event listener for more efficient detection (supported in modern browsers)
  - Store current device IDs to detect changes
  - Handle device disconnection gracefully (fallback to system default)
  
- **Browser compatibility**:
  - `setSinkId()` for output device selection has limited support (Chrome/Edge, not Safari/Firefox)
  - `devicechange` event is well-supported in modern browsers
  - May need fallback to periodic polling for older browsers

**Dependencies**:
- `navigator.mediaDevices` API (already used for `getUserMedia`)
- Browser support for device enumeration and change detection
- Web Audio API (optional, for advanced output routing)

**Recommended Approach**:
1. Implement `devicechange` event listener to detect device additions/removals
2. Add periodic polling (every 1-2 seconds) as a fallback for browsers without `devicechange` support
3. For audio output: Use `setSinkId()` if available, otherwise rely on browser's automatic routing
4. For audio input: Detect changes and either auto-switch (if seamless) or notify user
5. Test with common scenarios: plug/unplug headphones, switch Bluetooth devices, change system default device

---

### UX-001: Display Time Offset Overlay on Video {#ux-001-display-time-offset-overlay-on-video}

**Description**:  
Display a brief, transparent overlay on the video showing the number of seconds moved backward or forward when navigating (e.g., using arrow keys, marker navigation, or timeline clicks). This provides immediate visual feedback about the navigation action performed.

**User Value**:
- **Immediate feedback**: Users instantly see how far they've navigated in time
- **Spatial awareness**: Helps users understand their position relative to the recording timeline
- **Confirmation**: Confirms that navigation actions (keyboard shortcuts, button clicks) have been registered
- **Professional feel**: Similar to video editing software that shows time offsets during scrubbing

**Acceptance Criteria**:
- [ ] When navigating backward (ArrowLeft, ArrowUp, previous marker), display a brief overlay showing negative time offset (e.g., "-2s", "-5s")
- [ ] When navigating forward (ArrowRight, ArrowDown, next marker), display a brief overlay showing positive time offset (e.g., "+1s", "+3s")
- [ ] Overlay appears centered or in a consistent position on the video (e.g., center or top-center)
- [ ] Overlay is semi-transparent and doesn't obstruct the video content significantly
- [ ] Overlay automatically fades out after 1-2 seconds
- [ ] Overlay shows the actual time offset calculated (respects exponential back/forward behavior)
- [ ] Works for all navigation methods: keyboard shortcuts, button clicks, marker navigation, timeline clicks

**Technical Considerations**:
- **Overlay element**: Create a new DOM element positioned absolutely over the video container (similar to existing `video-overlay` for state indicator)
- **Positioning**: Use CSS to center or position the overlay (e.g., `position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%)`)
- **Styling**: 
  - Semi-transparent background (e.g., `rgba(0, 0, 0, 0.7)`)
  - Large, readable font (e.g., 24-32px)
  - White or high-contrast text color
  - Rounded corners, padding for readability
- **Animation**: 
  - Fade-in on display (e.g., `opacity: 0 → 1` with transition)
  - Fade-out after timeout (e.g., `opacity: 1 → 0` then `display: none`)
  - Consider subtle scale animation for emphasis
- **Timing**: 
  - Display duration: 1.5-2 seconds (configurable)
  - Clear timeout if new navigation occurs before fade-out completes
- **Format**: 
  - Negative values: "-2s", "-5s", "-10s" (backward)
  - Positive values: "+1s", "+3s", "+8s" (forward)
  - Zero or very small offsets (< 0.5s) may not need display
- **Integration points**:
  - `handleBack()` / `handleBackKey()`: Calculate offset and display
  - `handleForward()` / `handleForwardKey()`: Calculate offset and display
  - `handleNavigateFlashbackMarker()`: Calculate offset from current position to target marker
  - `handleTimelineClick()`: Calculate offset from current position to clicked position

**Dependencies**:
- Existing navigation functions (`handleBack`, `handleForward`, `handleNavigateFlashbackMarker`, `handleTimelineClick`)
- Video container element (already exists)
- CSS for positioning and animations

**Recommended Approach**:
1. Create a new overlay element in the constructor (similar to `videoOverlay` for state indicator)
2. Create helper function `showTimeOffsetOverlay(seconds)` that:
   - Formats the offset (e.g., "-2s" or "+3s")
   - Displays the overlay with fade-in animation
   - Sets a timeout to fade-out after 1.5-2 seconds
3. Integrate calls to `showTimeOffsetOverlay()` in all navigation functions
4. Calculate actual time offset in each navigation function (current time vs. target time)
5. Test with all navigation methods to ensure consistent behavior

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



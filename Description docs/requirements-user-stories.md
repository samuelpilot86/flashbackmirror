# Requirements Document - User Stories

## Product Overview
**Product Name**: Flashback
**Core Concept**: Continuous recording with intelligent flashback playback based on back button presses

## User Stories

### US-001: Application Startup and Auto-Recording
**As a** user  
**I want** the application to automatically start recording video and audio when I open it  
**So that** I don't miss any important moments and can focus on my activity without manual intervention

**Acceptance Criteria:**
- [ ] Application starts recording immediately upon launch
- [ ] Both video and audio are captured simultaneously
- [ ] Recording indicator is visible to the user
- [ ] No user action required to begin recording
- [ ] Recording starts within 2 seconds max of application launch (ideally less)

**Technical Requirements:**
- WebRTC camera and microphone access
- MediaRecorder API for simultaneous audio/video capture
- Visual recording indicator (red dot, timer, etc.)

---

### US-002: Back Button Flashback Functionality
**As a** user  
**I want** to press the back button multiple times to immediately start playback from specific moments in my recording  
**So that** I can quickly review and analyze recent performance without manual scrubbing through the timeline

**Acceptance Criteria:**
- [ ] Back button is prominently displayed and easily accessible
- [ ] On a laptop, I can use the "left" key of my keybord and it has the same effect as the back button
- [ ] Each back button press immediately triggers playback from a calculated flashback timestamp
- [ ] Flashback duration follows exponential progression: 1s, 2s, 4s, 8s, 16s, etc.
- [ ] Formula: flashback_duration = 2^(n-1) seconds, where n = number of back button presses
- [ ] Recording stops immediately when back button is first pressed
- [ ] Video playback starts immediately from flashback timestamp (no delay)
- [ ] Audio is synchronized with video playback
- [ ] Each subsequent back button press immediately starts playback from the new calculated timestamp

**Example Behavior:**
- **1st press**: Immediately start playback from 1 second before end of recording
- **2nd press**: Immediately start playback from 2 seconds before end of recording  
- **3rd press**: Immediately start playback from 4 seconds before end of recording
- **4th press**: Immediately start playback from 8 seconds before end of recording
- **5th press**: Immediately start playback from 16 seconds before end of recording
In this example, each press starts reading from a different timestamp.

**Technical Requirements:**
- Real-time timestamp calculation
- Immediate transition from recording to playback (no delay)
- Audio/video synchronization
- Memory management for continuous recording

---

### US-004: Back Button Press Counter Reset
**As a** user  
**I want** the back button press counter to reset after 3 seconds of inactivity  
**So that** I can start fresh flashback sequences without confusion

**Acceptance Criteria:**
- [ ] Counter resets to zero after 3 seconds of no back button presses
- [ ] Reset timer starts after last back button press
- [ ] Reset timer is cancelled if back button is pressed again
- [ ] Visual indicator shows current counter state
- [ ] Reset is immediate when timer expires
- [ ] **Important**: The 3-second timeout only resets the counter, NOT the playback behavior
- [ ] Playback continues normally during the 3-second countdown
- [ ] After counter reset, next back button press starts from 1 second back (first press)

**Technical Requirements:**
- Timer management system
- Event handling for button presses
- State management for counter
- Visual feedback for counter state
- Separate timer for counter reset (does not affect playback)

---

### US-005: Continuous Recording with Memory Management
**As a** user  
**I want** recording to resume automatically after flashback playback ends  
**So that** I can maintain continuous capture of my entire session

**Acceptance Criteria:**
- [ ] Recording resumes immediately when playback reaches the end
- [ ] New recording is appended to existing recording in memory
- [ ] No gaps or overlaps in the continuous recording
- [ ] Memory usage is optimized for long sessions
- [ ] Recording quality remains consistent throughout

**Technical Requirements:**
- Memory-efficient recording management
- Seamless transition from playback to recording
- Chunked recording for memory optimization
- Quality consistency across recording segments

---

### US-006: Visual Feedback and Status Indicators
**As a** user  
**I want** clear visual feedback about the current state of the application  
**So that** I always know whether I'm recording, playing back, or in flashback mode

**Acceptance Criteria:**
- [ ] Recording indicator (red dot, "REC" text, timer)
- [ ] Playback indicator (play icon, progress bar)
- [ ] Flashback mode indicator (rewind icon, countdown)
- [ ] Back button press counter display
- [ ] Current timestamp display
- [ ] Memory usage indicator

**Technical Requirements:**
- Real-time UI updates
- Status state management
- Visual design system
- Responsive indicators

---

### US-007: Forward Navigation During Playback
**As a** user watching a flashback,
**I want** to be able to move forward in time using the right arrow key or forward button,
**So that** I can skip ahead to see later parts of my recording or adjust my viewing position.

**Acceptance Criteria:**
- [ ] Forward button (→) or right arrow key advances in time
- [ ] Same exponential progression as back button: 1s → 2s → 4s → 8s → 16s...
- [ ] Independent counter from back button counter
- [ ] Works during flashback playback
- [ ] Can advance beyond current playback position
- [ ] If advancing beyond total recording, shows message and continues from appropriate position
- [ ] Forward counter resets after 3 seconds of inactivity (same as back counter)

**Example Behavior:**
- During flashback playback, pressing forward 1 time advances by 1 second
- Pressing forward 2 times advances by 2 seconds from original position
- Pressing forward 3 times advances by 4 seconds from original position
- Forward navigation starts from current playback position, not from end

**Technical Requirements:**
- Maintain separate forwardPressCount from backPressCount
- Calculate forward duration: Math.pow(2, forwardPressCount - 1)
- During playback, calculate new position by adding forward duration to current position
- Handle edge cases (advancing beyond end of recording)
- Visual feedback for forward counter
- Reset forward counter after 3 seconds of inactivity

---

### US-008: Configurable Maximum Recording Duration with Rolling Buffer
**As a** user conducting long training sessions,
**I want** to set a maximum recording duration and have automatic cleanup when this limit is reached,
**So that** I can record for extended periods without risking browser memory exhaustion or performance degradation.

**Acceptance Criteria:**
- [ ] Configurable maximum duration parameter (default: 10 seconds, range: 1-3600 seconds)
- [ ] UI control (slider/input) to adjust maximum duration in real-time
- [ ] Automatic activation of rolling buffer when duration limit is reached
- [ ] Oldest second of recording automatically removed each new second recorded
- [ ] Memory cleanup prevents leaks (URL.revokeObjectURL, reference removal)
- [ ] Seamless flashback functionality maintained with rolling buffer active
- [ ] Visual indicator showing current duration vs maximum
- [ ] Performance maintained during cleanup operations
- [ ] Duration setting persists across browser sessions (localStorage)

**Example Behavior:**
- **Default setting**: 10 seconds maximum
- **User sets**: 600 seconds (10 minutes) maximum
- **After 600 seconds**: Each new second recorded triggers removal of oldest second
- **Memory usage**: Remains constant at ~600 seconds of data
- **Flashbacks**: Continue working normally within the rolling window

**Technical Requirements:**
- Rolling buffer algorithm: FIFO (First In, First Out) chunk removal
- Session management: Handle partial session cleanup and timestamp recalculation
- Memory management: Proper blob disposal and garbage collection
- UI integration: Settings panel with validation (1-3600 seconds range)
- Storage: localStorage persistence for user preference
- Performance: Sub-100ms cleanup operations to avoid UI freezing

**Business Rules:**
- Duration range: 1-3600 seconds (validated for browser memory constraints)
- Default: 10 seconds (balance between utility and memory safety)
- Cleanup: Automatic, silent, no user interruption
- Flashbacks: Fully functional within rolling window

---

### US-009: Stop Flashback & Resume Recording
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

### US-010: Full Timeline Bar with Timestamp Navigation
**As a** user recording or reviewing my training recordings,
**I want** to see a comprehensive timeline bar showing the entire recording session from start to end,
**So that** I can quickly understand the scope of my recording and navigate to any specific moment instantly.

**Acceptance Criteria:**
- [ ] Timeline bar displays total recording duration from timestamp 0 to maximum timestamp
- [ ] Visual markers indicate boundaries between recording sessions
- [ ] Click anywhere on timeline to instantly jump to that timestamp and start/continue playback from that timestamp
- [ ] Current playback position shown with visual indicator during flashback
- [ ] Time labels display start time (0), current position, and end time
- [ ] Timeline works during both recording and playback states
- [ ] Timeline remains visible during recording state 
- [ ] Seamless integration with existing flashback, forward navigation systems and rolling buffer
- [ ] Timeline adapts when rolling buffer removes old data (the part that is the further left is the start of the rolling buffer. Deleted parts are not represented)
- [ ] Responsive design that adapts to different screen sizes
- [ ] Timeline updates in real-time during recording (The whole length of the timeline is used even if the recording has just started.The visual markers indicating boundaries will thus progress to the left.)

**Example Behavior:**
- **Recording state**: Timeline shows progress from 0 to current recording time, updates every second
- **Flashback state**: Timeline shows full duration with current playback position indicator
- **Click during recording**: Click jumps to timestamp and starts flashback from that point
- **Click during playback**: Click jumps to new timestamp and continues playback from there
- **Rolling buffer active**: Timeline shows only available time window, older sections are not displayed. Timeline starts at the first non-deleted second
- **Session markers**: Vertical lines show where each recording session starts/ends
- **Time display**: "0:00 / 15:30 / 45:22" (start / current / end)
- **Buffer rollover**: Timeline smoothly adjusts when old data is removed

**Edge Cases:**
- **Click on future timestamp during recording**: Should not be allowed (because it is not represented: the whole timeline represents the recorded and not-rolled-out part)
- **Rolling buffer removes data while timeline visible**: Timeline updates smoothly, time labels adjust
- **Very short recordings**: Timeline still functional because the duration of the short recording is stretched through the whole timeline
- **Timeline click during active flashback transition**: Queued until current transition completes
- **Mobile tap vs desktop click**: Same behavior, touch-friendly interaction
- **Browser window resize**: Timeline maintains proportions and usability
- **Timeline visible but no recordings yet**: Shows empty state or placeholder

**Technical Requirements:**
- Timeline calculation across all recorded sessions and current recording with rolling buffer awareness
- Visual rendering using progress bar or custom canvas/SVG component optimized for frequent updates
- Click coordinate to timestamp conversion algorithm handling rolling buffer offsets
- Real-time position updates during playback (60fps if possible)
- Integration with existing playback system (playSessionsFromTimestamp) and rolling buffer cleanup
- Rolling buffer integration: Handle timeline adjustments when oldest data is removed
- Performance optimization for long recordings (virtual scrolling for very long timelines)
- Mobile-responsive design with touch interaction support
- State management: Different behaviors for recording vs playback vs stopped states
- Memory management: Efficient timeline data structures that don't impact recording performance

---

### US-011: Timeline Markers & Navigation

**User Story**:  
**As a** coach/trainee capturing training sessions,  
**I want** to drop flashback markers on the timeline via a button or the space bar and jump to previous/next markers with dedicated controls or keyboard shortcuts,  
**So that** I can instantly revisit key moments without scrubbing through the entire buffer.

**Acceptance Criteria**:
- [ ] Space bar or a dedicated “Add marker” button drops a marker at the current absolute time
- [ ] Timeline renders each timestamp marker with a visible indicator
- [ ] “Previous timestamp” button / `ArrowUp` jumps to the previous marker (or start of buffer if none)
- [ ] “Next timestamp” button / `ArrowDown` jumps to the next marker (or end of buffer if none)
- [ ] Markers shift left as older chunks are purged and disappear when they fall outside the rolling buffer
- [ ] Keyboard shortcuts do not interfere with existing playback controls
- [ ] Timeline is updated at the moment where the timestamp is created (we should not wait for 1 second)

**Technical Considerations**:
- Data structure to store markers with absolute timestamps (no need to explicitly tie them to a chunk)
- Update logic when enforcing the rolling buffer to remove markers outside the retained window
- Timeline rendering updates in sync with marker changes
- Conflict-free keyboard event handling alongside existing shortcuts

---

### 📊 Full Timeline Bar with Timestamp Navigation
**Priority**: Medium
**Estimated Effort**: Medium (1-2 weeks)

**Description**:
Add a comprehensive timeline bar that spans from timestamp 0 (beginning of all recordings) to the total duration timestamp. This bar serves as both a visual overview and an interactive navigation tool.

**User Value**:
- **Complete Overview**: See the entire recording session at a glance
- **Quick Navigation**: Jump to any point instantly
- **Session Boundaries**: Visual indication of where each recording session begins/ends
- **Time Reference**: Always know current position in total timeline

**Acceptance Criteria**:
- [ ] Timeline bar showing total recording duration (0 to max timestamp)
- [ ] Visual markers for session boundaries
- [ ] Click-to-seek functionality
- [ ] Current playback position indicator
- [ ] Time labels (start, current, end times)
- [ ] Integration with existing flashback system
- [ ] Works during playback and recording states


**Technical Requirements**:
- Timeline calculation across multiple sessions
- Visual rendering (progress bar style)
- Click coordinate to timestamp conversion
- Integration with existing playback system
- Real-time position updates

**Dependencies**:
- Existing session management system
- Playback position tracking
- UI component for interactive bars

---

### 🎵 Audio Waveform Visualization & Interactive Flashback Selection
**Priority**: High
**Estimated Effort**: High (2-3 weeks)

**Description**:
Implement an audio waveform visualization that displays the sound levels of the recorded audio over time. Users can click on any point in the waveform to instantly start flashback playback from that exact timestamp.

**User Value**:
- **Precision Control**: Users can precisely select any moment in their recording instead of using exponential back/forward buttons
- **Visual Feedback**: See the audio levels to identify key moments (loud parts, quiet parts, etc.)
- **Faster Navigation**: Direct click navigation instead of sequential button presses
- **Professional Feel**: Similar to audio editing software interfaces

**Acceptance Criteria**:
- [ ] Real-time waveform generation from recorded audio data
- [ ] Clickable waveform bar showing audio amplitude over time
- [ ] Instant flashback start from clicked position
- [ ] Visual indicator of current playback position
- [ ] Zoom/pan capabilities for long recordings
- [ ] Responsive design for different screen sizes

**Technical Requirements**:
- Web Audio API for audio analysis and waveform generation
- Canvas or SVG for waveform rendering
- Click event handling for position selection
- Audio buffer processing for amplitude data extraction
- Performance optimization for large recordings

**Dependencies**:
- Access to raw audio data from MediaRecorder chunks
- Canvas/SVG rendering capabilities
- Web Audio API support

---

### FEAT-001: Règle Timeline avec Photos Extraites de l'Enregistrement {#feat-001-règle-timeline-avec-photos-extraites-de-lenregistrement}

**Description**:  
Créer une nouvelle règle (timeline) qui affiche des photos extraites de l'enregistrement vidéo. Cette règle permettra de visualiser des frames clés de l'enregistrement sous forme de miniatures, offrant une navigation visuelle alternative à la timeline actuelle avec la barre de progression verte.

**User Value**:
- **Navigation visuelle** : Les utilisateurs peuvent voir des aperçus visuels de l'enregistrement pour naviguer plus intuitivement
- **Repérage rapide** : Identifier rapidement des moments clés dans l'enregistrement grâce aux miniatures
- **Expérience enrichie** : Complément à la timeline existante, offrant une vue d'ensemble visuelle de l'enregistrement
- **Navigation précise** : Cliquer sur une miniature pour naviguer directement à ce moment de l'enregistrement

**Acceptance Criteria**:
- [ ] Une nouvelle règle (timeline) est affichée, distincte de la timeline existante avec la barre verte
- [ ] Des photos (frames) sont extraites automatiquement de l'enregistrement vidéo à intervalles réguliers. L'intervalle est déterminé de sorte que la largeur d'une image sur la règle corresponde à la durée de l'intervalle.
- [ ] Les photos sont affichées sous forme de miniatures dans la règle
- [ ] Les miniatures sont positionnées proportionnellement à leur position temporelle dans l'enregistrement
- [ ] Cliquer sur une miniature déclenche un flashback vers le moment correspondant dans l'enregistrement (attention, le clic sur le début de la miniature déclenche un flashback vers ce moment de la miniature. Mais le clic au milieu de la miniature déclenche un flashback vers le début de la miniature, plus la moitié de l'intervalle. Un clic proche de la partie droite de la miniature enverra un moment légèrement antérieur à celui dont vient la miniature suivante.)
- [ ] Les photos sont extraites en temps réel pendant l'enregistrement (si possible) ou après l'enregistrement
- [ ] Les miniatures sont mises à jour dynamiquement pendant l'enregistrement
- [ ] La longueur affichée des miniatures est proportionnelle à la durée de l'enregistrement, de la même manière que c'est le cas pour la barre verte et pour la waveform. En conséquence, l'affichage de la dernière vignette sera fréquemment tronqué et sera dévoilé progressivement au fil de l'enregistrement.
- [ ] Performance : l'extraction et l'affichage des photos ne ralentissent pas significativement l'enregistrement

**Technical Considerations**:
- **Extraction de frames** :
  - Utiliser `HTMLVideoElement.captureStream()` ou `Canvas API` pour capturer des frames du flux vidéo
  - Extraire des frames à intervalles réguliers
  - Stocker les frames en mémoire ou dans `IndexedDB` pour un accès rapide
  - Considérer la compression des images pour optimiser la mémoire
  
- **Affichage** :
  - Créer un nouveau conteneur HTML pour la règle de photos (similaire à `timelineContainer`)
  - Utiliser des éléments `<img>` ou `<canvas>` pour afficher les miniatures
  - Positionner le bord gauche des miniatures proportionnellement à leur timestamp
  - Gérer le scroll horizontal si nécessaire pour les longs enregistrements
  
- **Navigation** :
  - Réutiliser la fonction `calculateTargetTimeFromClick()` ou similaire pour calculer le timestamp
  - Utiliser `seekFlashback()` pour naviguer vers le moment sélectionné
  - Synchroniser avec la timeline existante et la waveform
  
- **Performance** :
  - Charger les frames de manière asynchrone pour ne pas bloquer l'UI
  - Considérer le lazy loading des miniatures
  
- **Intégration** :
  - S'assurer que la règle fonctionne avec tous les états (recording, flashback, stopped, paused)

**Dependencies**:
- Accès au flux vidéo de l'enregistrement
- Canvas API ou HTMLVideoElement pour l'extraction de frames
- IndexedDB ou mémoire pour le stockage des frames (optionnel)
- Fonctionnalités existantes : `seekFlashback()`, `calculateTargetTimeFromClick()`

**Recommended Approach**:
1. Créer la structure HTML/CSS pour la nouvelle règle de photos
2. Implémenter une fonction `extractFrameFromVideo(timestamp)` pour extraire une frame à un moment donné
3. Créer une fonction `updatePhotoTimeline()` qui extrait et affiche les frames à intervalles réguliers
4. Implémenter le clic sur la règle pour naviguer vers le timestamp correspondant
5. Ajouter un toggle pour afficher/masquer la règle
6. Optimiser les performances (décimation, lazy loading, compression)
7. Tester avec différents types d'enregistrements (courts, longs, haute résolution)

Note : Factorise au maximum avec les fonctionnalités déjà existantes, notamment pour déterminer la largeur temporelle de cette règle, qui doit être identique aux autres règles ; pour le mode de calcul du timestamp du flashback lorsqu'on clique sur cette règle ; les fréquences de mise à jour d'affichage...

---


## Technical Constraints

### Browser Compatibility
- **Primary**: Firefox (MacBook Pro 2020)
- **WebRTC**: Required for camera/microphone access
- **MediaRecorder**: Required for recording functionality
- **IndexedDB**: Required for session storage

### Performance Requirements
- **Recording Quality**: 720p @ 30fps (optimal for 13-inch display)
- **Audio Quality**: 44.1kHz, 16-bit
- **Memory Usage**: Optimized for long recording sessions
- **Response Time**: <100ms for back button press response

### Security & Privacy
- **Local Storage**: All data stays on user's device
- **HTTPS Required**: For camera/microphone access
- **No Cloud Upload**: Privacy-focused design
- **User Control**: Full control over recorded content
 

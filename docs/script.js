// Set to true to show the debug (Buffer Analysis) panel
const SHOW_DEBUG_PANEL = false;

/**
 * AudioKeepAlive - Prevents audio devices from going to sleep
 * Uses two approaches in parallel:
 * - Approach 1: Generates an inaudible periodic signal
 * - Approach 2: Maintains AudioContext active with a silent GainNode
 */
class AudioKeepAlive {
    constructor() {
        this.audioContext = null;
        // Approach 1: Periodic signal
        this.oscillator = null;
        this.gainNode = null;
        this.keepAliveInterval = null;
        // Approach 2: Active context maintenance
        this.silentGainNode = null; // Permanent silent GainNode
        this.checkInterval = null; // State check interval
        this.isActive = false;
        // Approach 1 settings
        this.intervalDuration = 10000; // 10 seconds
        this.signalDuration = 1000; // 1 second
        this.frequency = 100; // 100 Hz (audible, debug)
        this.gain = 0.5; // Audible amplitude (debug)
        // Approach 2 settings
        this.checkIntervalDuration = 5000; // 5 seconds
        // Output routing: MediaStream → <audio> element with setSinkId
        this.streamDestination = null;
        this.audioEl = null;
    }

    start(outputDeviceId = 'default') {
        if (this.isActive) {
            return;
        }

        try {
            // Create AudioContext
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Resume context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(err => {
                    console.warn('AudioKeepAlive: Failed to resume audio context', err);
                });
            }

            // Route output via MediaStream → <audio> element so setSinkId can target the
            // correct device (AudioContext.destination always follows the OS default, not the
            // device selected via setSinkId on the flashback <video>).
            this.streamDestination = this.audioContext.createMediaStreamDestination();
            this.audioEl = new Audio();
            this.audioEl.srcObject = this.streamDestination.stream;
            this.audioEl.play().catch(() => {});
            if (typeof this.audioEl.setSinkId === 'function') {
                const sinkId = (outputDeviceId === 'default') ? '' : outputDeviceId;
                this.audioEl.setSinkId(sinkId).catch(err => {
                    console.warn('AudioKeepAlive: setSinkId failed', err);
                });
            }

            // APPROACH 1: Create periodic keep-alive signal
            this.keepAliveInterval = setInterval(() => {
                this.playKeepAliveSignal();
            }, this.intervalDuration);

            // Play initial signal immediately
            this.playKeepAliveSignal();

            // APPROACH 2: Create silent GainNode permanently connected
            this.silentGainNode = this.audioContext.createGain();
            this.silentGainNode.gain.value = 0; // Completely silent
            this.silentGainNode.connect(this.streamDestination);

            // APPROACH 2: Start periodic state check
            this.checkInterval = setInterval(() => {
                this.checkAndResume();
            }, this.checkIntervalDuration);

            // Initial state check
            this.checkAndResume();

            this.isActive = true;
            console.log(`AudioKeepAlive: Started → device "${outputDeviceId}" (Approach 1 + Approach 2)`);
        } catch (error) {
            console.warn('AudioKeepAlive: Not available', error);
            // Silently fail - keep-alive is optional
        }
    }

    updateSinkId(deviceId) {
        if (this.audioEl && typeof this.audioEl.setSinkId === 'function') {
            const sinkId = (deviceId === 'default') ? '' : deviceId;
            this.audioEl.setSinkId(sinkId).catch(err => {
                console.warn('AudioKeepAlive: updateSinkId failed', err);
            });
        }
    }

    playKeepAliveSignal() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            return;
        }

        try {
            // Resume context if suspended
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(() => {
                    // Ignore resume errors
                });
            }

            // Create oscillator for inaudible signal
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.value = this.frequency;

            // Triangular envelope: 0.5s fade-in, 0.5s fade-out
            const now = this.audioContext.currentTime;
            const duration = this.signalDuration / 1000;
            gainNode.gain.setValueAtTime(0, now);
            gainNode.gain.linearRampToValueAtTime(this.gain, now + 0.5);
            gainNode.gain.linearRampToValueAtTime(0, now + duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.streamDestination);

            oscillator.start(now);
            oscillator.stop(now + duration);

            // Clean up after signal completes
            oscillator.onended = () => {
                try {
                    oscillator.disconnect();
                    gainNode.disconnect();
                } catch (e) {
                    // Ignore cleanup errors
                }
            };

        } catch (error) {
            // Silently handle errors (device may not be available)
            console.debug('AudioKeepAlive: Signal playback error', error);
        }
    }

    checkAndResume() {
        if (!this.audioContext || this.audioContext.state === 'closed') {
            return;
        }
        
        // APPROACH 2: Check if context is suspended and resume if needed
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(err => {
                console.debug('AudioKeepAlive: Failed to resume context (Approach 2)', err);
            });
        }
    }

    stop() {
        if (!this.isActive) {
            return;
        }
        
        // APPROACH 1: Clear periodic signal interval
        if (this.keepAliveInterval) {
            clearInterval(this.keepAliveInterval);
            this.keepAliveInterval = null;
        }
        
        // Stop oscillator if active
        if (this.oscillator) {
            try {
                this.oscillator.stop();
                this.oscillator.disconnect();
            } catch (e) {
                // Ignore errors
            }
            this.oscillator = null;
        }
        
        // Disconnect gain node
        if (this.gainNode) {
            try {
                this.gainNode.disconnect();
            } catch (e) {
                // Ignore errors
            }
            this.gainNode = null;
        }
        
        // APPROACH 2: Clear state check interval
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        
        // APPROACH 2: Disconnect silent GainNode
        if (this.silentGainNode) {
            try {
                this.silentGainNode.disconnect();
            } catch (e) {
                // Ignore errors
            }
            this.silentGainNode = null;
        }

        // Output routing cleanup
        if (this.audioEl) {
            this.audioEl.pause();
            this.audioEl.srcObject = null;
            this.audioEl = null;
        }
        this.streamDestination = null;

        // Close audio context
        if (this.audioContext) {
            try {
                this.audioContext.close();
            } catch (e) {
                // Ignore errors
            }
            this.audioContext = null;
        }
        
        this.isActive = false;
        console.log('AudioKeepAlive: Stopped');
    }
}

/**
 * AudioOutputMonitor - Monitors audio output devices and handles automatic failover
 * Detects when the current audio output device becomes unavailable and automatically
 * switches to the system default output device.
 */
class AudioOutputMonitor {
    constructor(flashbackRecorder) {
        this.flashbackRecorder = flashbackRecorder; // Reference to FlashbackRecorder for callbacks
        this.monitoringInterval = null;
        this.deviceChangeListener = null;
        this.isActive = false;
        this.previousDevices = new Set(); // Set of previously detected device IDs
        this.currentDeviceId = null; // Currently used device ID (if setSinkId is used)
        this.checkIntervalDuration = 2000; // Check every 2 seconds
        this.noDeviceAlertId = null; // ID of the "no device" alert (for permanent display)
    }

    start() {
        if (this.isActive) {
            return;
        }

        try {
            // Initial device enumeration
            this.checkDevices();

            // Set up devicechange event listener (more efficient)
            if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
                this.deviceChangeListener = () => {
                    this.checkDevices();
                };
                navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeListener);
            }

            // Set up periodic polling as fallback
            this.monitoringInterval = setInterval(() => {
                this.checkDevices();
            }, this.checkIntervalDuration);

            this.isActive = true;
            console.log('AudioOutputMonitor: Started');
        } catch (error) {
            console.warn('AudioOutputMonitor: Failed to start', error);
        }
    }

    async checkDevices() {
        try {
            // Request permissions if needed (required for device labels)
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');
            
            const currentDeviceIds = new Set(audioOutputDevices.map(d => d.deviceId));

            // Check if no devices are available
            if (audioOutputDevices.length === 0) {
                this.handleNoDevicesAvailable();
                return;
            }

            // Remove "no device" alert if devices are now available
            if (this.noDeviceAlertId) {
                this.flashbackRecorder.removeAlert(this.noDeviceAlertId);
                this.noDeviceAlertId = null;
            }

            // Check if current device (if set) is still available
            if (this.currentDeviceId && !currentDeviceIds.has(this.currentDeviceId)) {
                console.log('AudioOutputMonitor: Current device no longer available, switching to default');
                await this.switchToDefaultDevice();
            }

            // Update previous devices list
            this.previousDevices = currentDeviceIds;
        } catch (error) {
            console.warn('AudioOutputMonitor: Error checking devices', error);
        }
    }

    handleNoDevicesAvailable() {
        // Only show alert if not already showing
        if (!this.noDeviceAlertId) {
            this.noDeviceAlertId = this.flashbackRecorder.addAlert(
                'Aucun périphérique audio disponible. Veuillez connecter un périphérique audio.',
                'error'
            );
            // Make it permanent by clearing the timeout
            if (this.noDeviceAlertId) {
                const alertData = this.flashbackRecorder.activeAlerts.get(this.noDeviceAlertId);
                if (alertData && alertData.timeoutId) {
                    clearTimeout(alertData.timeoutId);
                    alertData.timeoutId = null; // Mark as permanent
                }
            }
        }
    }

    async switchToDefaultDevice() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');
            
            if (audioOutputDevices.length === 0) {
                this.handleNoDevicesAvailable();
                return;
            }

            // Get default device (first in list, or empty string for system default)
            const defaultDeviceId = audioOutputDevices[0]?.deviceId || '';

            // Switch to default device
            if (this.flashbackRecorder && typeof this.flashbackRecorder.setAudioOutputDevice === 'function') {
                await this.flashbackRecorder.setAudioOutputDevice(defaultDeviceId || '');
            } else if (this.flashbackRecorder && this.flashbackRecorder.flashbackVideo) {
                // Fallback: use setSinkId directly if available
                const video = this.flashbackRecorder.flashbackVideo;
                if (typeof video.setSinkId === 'function') {
                    try {
                        await video.setSinkId(defaultDeviceId || '');
                        console.log('AudioOutputMonitor: Switched to default device via setSinkId');
                    } catch (err) {
                        console.warn('AudioOutputMonitor: Failed to set sink ID', err);
                    }
                } else {
                    // Force playback resume to trigger browser's automatic routing
                    if (this.flashbackRecorder.state === 'flashback' && video.paused) {
                        video.play().catch(() => {});
                    } else if (!video.paused) {
                        // Pause and resume to trigger re-routing
                        const wasPlaying = !video.paused;
                        video.pause();
                        setTimeout(() => {
                            if (wasPlaying) {
                                video.play().catch(() => {});
                            }
                        }, 100);
                    }
                }
            }

            // Update current device ID
            this.currentDeviceId = defaultDeviceId || null;

            // Notify user of switch
            this.flashbackRecorder.addAlert(
                'Sortie audio basculée vers le périphérique par défaut',
                'info'
            );
        } catch (error) {
            console.warn('AudioOutputMonitor: Error switching to default device', error);
        }
    }

    setCurrentDevice(deviceId) {
        // Called when user explicitly sets a device (e.g., via setAudioOutputDevice)
        this.currentDeviceId = deviceId;
    }

    stop() {
        if (!this.isActive) {
            return;
        }

        // Remove devicechange listener
        if (this.deviceChangeListener && navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeListener);
            this.deviceChangeListener = null;
        }

        // Clear monitoring interval
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }

        // Remove "no device" alert if present
        if (this.noDeviceAlertId) {
            this.flashbackRecorder.removeAlert(this.noDeviceAlertId);
            this.noDeviceAlertId = null;
        }

        this.isActive = false;
        console.log('AudioOutputMonitor: Stopped');
    }
}

class FlashbackRecorder {
    constructor() {
        // DOM Elements
        this.videoPreview = document.getElementById('videoPreview');
        this.shiftBtn = document.getElementById('shiftBtn');
        this.flashbackBtn = document.getElementById('flashbackBtn');
        this.waveformCanvas = document.getElementById('waveformCanvas');
        this.waveformContainer = document.getElementById('waveformContainer');
        this.photoTimelineContainer = document.getElementById('photoTimelineContainer');
        this.photoTimelineScroll = document.getElementById('photoTimelineScroll');
        this.photoTimelinePosition = document.getElementById('photoTimelinePosition');
        
        // Debug: Check if waveform elements exist
        if (!this.waveformContainer) {
            console.error('waveformContainer element not found in DOM');
        }
        if (!this.waveformCanvas) {
            console.error('waveformCanvas element not found in DOM');
        }
        if (!this.photoTimelineContainer) {
            console.error('photoTimelineContainer element not found in DOM');
        }
        if (!this.photoTimelineScroll) {
            console.error('photoTimelineScroll element not found in DOM');
        }
        
        this.forwardBtn = document.getElementById('forwardBtn');
        this.videoOverlay = document.getElementById('videoOverlay');
        this.alertsContainer = document.getElementById('alertsContainer');
        this.timeOffsetOverlay = document.getElementById('timeOffsetOverlay');
        this.stateIndicatorDot = document.getElementById('stateIndicatorDot');
        this.stateIndicatorLabel = document.getElementById('stateIndicatorLabel');
        this.timelineContainer = document.getElementById('timelineContainer');
        this.timelineBar = document.getElementById('timelineBar');
        this.timelineProgress = document.getElementById('timelineProgress');
        this.timelinePosition = document.getElementById('timelinePosition');
        this.timelineMarkerLayer = document.getElementById('timelineMarkerLayer');
        this.timeStart = document.getElementById('timeStart');
        this.timeCurrent = document.getElementById('timeCurrent');
        this.timeEnd = document.getElementById('timeEnd');
        this.timeLifetime = document.getElementById('timeLifetime');
        this.timelineLegend = document.getElementById('timelineLegend');
        this.durationRange = document.getElementById('durationRange');
        this.durationValue = document.getElementById('durationValue');
        this.durationDisplay = document.getElementById('durationDisplay');
        this.addMarkerBtn = document.getElementById('addMarkerBtn');
        this.prevMarkerBtn = document.getElementById('prevMarkerBtn');
        this.nextMarkerBtn = document.getElementById('nextMarkerBtn');
        this.debugPanel = document.getElementById('debugPanel');
        this.debugPanelToggle = document.getElementById('debugPanelToggle');
        this.configPanel = document.getElementById('configPanel');
        this.configPanelToggle = document.getElementById('configPanelToggle');
        this.configPanelClose = document.getElementById('configPanelClose');
        this.configAudioOutputContent = document.getElementById('configAudioOutputContent');
        this.configMicSelect = document.getElementById('configMicSelect');
        this.configCameraSelect = document.getElementById('configCameraSelect');
        this.configVuMeter = document.getElementById('configVuMeter');
        this.configCameraPreview = document.getElementById('configCameraPreview');
        this.configMirrorToggle = document.getElementById('configMirrorToggle');
        this.debugSegmentsList = document.getElementById('debugSegmentsList');
        this.debugTotalDuration = document.getElementById('debugTotalDuration');
        this.debugSegmentCount = document.getElementById('debugSegmentCount');
        this.debugChunksList = document.getElementById('debugChunksList');
        this.debugChunkCount = document.getElementById('debugChunkCount');
        this.debugBufferDuration = document.getElementById('debugBufferDuration');
        this.pendingSessionId = null;
        this.pendingSessionChunks = [];

        // State
        this.stream = null;
        this.mediaRecorder = null;
        this.state = 'recording'; // 'recording' | 'flashback' | 'recordingStopped' | 'flashbackPaused' | 'transitioning'
        this.recordedSessions = [];
        this.chunkBuffer = []; // rolling buffer of individual chunks { blob, duration, mimeType, timestamp, sessionId, sequence }
        this.currentSessionChunks = []; // chunks collected during the current session (before save)
        this.currentSessionIdCounter = 0; // auto-incremented identifier for logical sessions
        this.currentChunkSequence = 0; // auto-incremented identifier for each chunk
        this.currentSessionId = null; // logical session currently being recorded
        this._bufferedDuration = 0; // total cumulative duration of chunks present in the buffer
        this._lastChunkTimestamp = null; // timestamp of the last received chunk (ms)
        this.currentSessionHeaderBlob = null; // Blob header preserved if the first chunk is purged
        this.sessionMap = new Map(); // direct access to sessions by identifier
        this.currentFlashbackIndex = 0;
        this.flashbackVideo = null;
        this.allSessions = [];
        this._mse = null; // MediaSource context stitching the retained segments into one gapless timeline during flashback
        this.currentReferencePosition = null;
        this.backPressCount = 0;
        this.forwardPressCount = 0;
        this.backResetTimer = null;
        this.forwardResetTimer = null;
        this.previousAbsoluteTime = null; // Store previous position for offset calculation
        this.timeOffsetOverlayTimeout = null; // Timeout for fade out
        this.markerUpPressCount = 0;           // Counter for rapid ArrowUp presses
        this.markerUpResetTimer = null;        // Timer to reset the counter
        this.lastMarkerUpPressTime = 0;        // Timestamp of last ArrowUp press
        this.markerUpFastPressThreshold = 500; // 0.5 seconds in milliseconds
        this.recordingStartTime = 0;
        this.totalRecordedTime = 0;
        this.maxDuration = 600; // seconds
        this.bufferMarginSeconds = 20; // extra margin to ensure an earlier keyframe (>= segment length so whole-segment eviction never bisects)
        this.segmentDurationSeconds = 15; // rotate the recorder this often so each segment is a self-contained, decodable WebM
        this._segmentRotationTimer = null; // interval that triggers periodic recorder rotation
        this._rotating = false; // true while a rotation is in progress (suppresses the onstop auto-save)
        this.lifetimeRecordedDuration = 0; // total duration recorded since launch (monotonic)
        this.sessionBoundaries = [];
        this._pendingRevokes = [];
        this.activeMimeType = null; // MimeType used for blobs
        this._flashbackId = 0; // unique identifier for each flashback (invalidates obsolete handlers)
        this._flashbackTimeout = null;
        this._flashbackInterval = null;
        this._timeupdateHandler = null;
        this._timeupdateGuardTimeout = null;
        this._onEndedHandler = null;
        this._onErrorHandler = null;
        this._metadataTimeout = null;
        
        // Audio keep-alive to prevent speaker/headphone sleep
        this.audioKeepAlive = new AudioKeepAlive();
        
        // Audio output monitor for device failure detection and automatic failover
        this.audioOutputMonitor = new AudioOutputMonitor(this);
        
        this._finalizeFlashback = null;
        this.visibleWindowStart = 0;
        this.visibleWindowEnd = 0;
        this.visibleWindowDuration = 0;
        this.lateChunkThresholdSeconds = 1.0;
        this.lastFinalizedSessionId = null;
        this.flashbackMarkers = [];
        this.flashbackMarkerIdCounter = 0;
        this.markerNavigationEpsilon = 0.05; // 50ms tolerance when comparing marker positions

        // Waveform visualization
        // Note: waveformCanvas and waveformContainer are already set above in DOM Elements section
        this.waveformCtx = null; // Will be set in initWaveformCanvas
        this.waveformData = []; // Cache des données de forme d'onde (haute résolution)
        this.audioContext = null; // AudioContext pour l'analyse
        this.audioAnalyser = null; // AnalyserNode pour l'analyse en temps réel
        this.audioSource = null; // MediaStreamAudioSourceNode
        this.waveformAnalysisInterval = null; // Interval pour l'analyse en temps réel
        this.showWaveform = true; // Flag pour afficher/masquer la forme d'onde (chargé depuis localStorage)
        this.waveformResolution = 20; // Résolution en millisecondes entre chaque point (ex: 20ms = 50 points/seconde)
        this.maxAmplitude = 0; // Amplitude maximale pour normalisation
        this.lastWaveformAnalysisTime = 0; // Timestamp de la dernière analyse
        this.lastWaveformRenderTime = 0; // Timestamp du dernier rendu
        this.waveformRecordingStartTime = 0; // Timestamp de début d'enregistrement pour calcul précis
        this.waveformRecordingStartDuration = 0; // Durée totale au début de l'enregistrement
        this.waveformRenderInterval = 100; // Intervalle de rendu en millisecondes (100ms = 10 FPS)

        // Photo timeline visualization
        this.photoFrames = []; // Array of {timestamp, imageData, thumbnail}
        this.showPhotoTimeline = true; // Flag pour afficher/masquer la photo timeline (chargé depuis localStorage)
        this.photoExtractionInterval = null; // Intervalle d'extraction de frames
        this.lastPhotoExtractionTime = 0; // Timestamp de la dernière extraction
        this.photoTimelineHeight = 36; // Hauteur fixe de la règle en pixels (réduite de 40%)
        this.photoThumbnailWidth = 80; // Largeur cible d'une miniature en pixels (deprecated, kept for compatibility)
        this.photoExtractionActive = false; // Flag pour contrôler si l'extraction est active
        this.photoTimelineRefreshInterval = null; // Intervalle de rafraîchissement de l'affichage
        this.isReExtracting = false; // Flag pour éviter les ré-extractions simultanées
        this.timelineResizeDebounce = null; // Debounce pour les événements window resize
        this.playbackPositionUpdateInterval = null; // Intervalle de mise à jour des traits rouges (100ms)
        this.videoWidth = null; // Largeur de la vidéo en pixels
        this.videoHeight = null; // Hauteur de la vidéo en pixels
        this.photoTimelineResizeObserver = null; // ResizeObserver pour détecter les changements de dimensions
        this.photoTimelineResizeDebounce = null; // Debounce timer pour les événements de redimensionnement
        this.currentPhotoExtractionInterval = null; // Périodicité actuelle d'extraction (en secondes)

        // Mirror mode
        this.mirrorMode = true; // default on (matches CSS scaleX(-1))

        // Config panel / vumeter
        this.vuMeterAnimId = null;
        this.vuMeterAudioCtx = null;
        this.vuMeterAnalyser = null;
        this.vuMeterSource = null;

        // Audio device management (BUG-020)
        this.currentAudioInputDeviceId = null; // ID du périphérique d'entrée actuellement utilisé
        this.currentAudioOutputDeviceId = null; // ID du périphérique de sortie actuellement utilisé
        this.deviceChangePollingInterval = null; // Intervalle de polling pour détecter les changements (500ms)
        this.deviceChangeHandler = null; // Handler pour l'événement devicechange
        this.lastKnownDevices = []; // Liste des périphériques connus pour détecter les changements

        // Multiple alerts management
        this.activeAlerts = new Map(); // Map<alertId, {element, timeoutId, createdAt}>
        this.alertIdCounter = 0; // Compteur pour IDs uniques d'alertes
        this.maxAlerts = 5; // Nombre maximum d'alertes simultanées

        // Inactivity monitoring (BUG-021)
        this.inactivityTimeout = null; // Timer pour détecter l'inactivité
        this.lastActivityTime = Date.now(); // Timestamp de la dernière activité
        this.inactivityWarningShown = false; // Éviter multiples alertes pendant une session
        this.inactivityEventListeners = []; // Stocker les listeners pour cleanup

        // Onboarding and tooltips (UX-003)
        this.onboardingCurrentStep = 0; // Current step in onboarding (0-3)
        this.onboardingModal = null; // Reference to onboarding modal
        this.tooltipElements = new Map(); // Map of element -> tooltip div

        // Expose the global instance for easier debugging
        window.flashbackRecorder = this;

        // Bind methods
        this.handleBackKey = this.handleBackKey.bind(this);
        this.handleForwardKey = this.handleForwardKey.bind(this);
        this.handleEscapeKey = this.handleEscapeKey.bind(this);
        this.handleShiftKey = this.handleShiftKey.bind(this);
        this.handleArrowUpKey = this.handleArrowUpKey.bind(this);
        this.handleArrowDownKey = this.handleArrowDownKey.bind(this);
        this.handleTimelineClick = this.handleTimelineClick.bind(this);

        // Create focus overlay (shown when window loses focus)
        this.focusOverlay = document.createElement('div');
        this.focusOverlay.id = 'focusOverlay';
        this.focusOverlay.innerHTML = `
            <div style="
                position: absolute;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0, 0, 0, 0.85);
                color: white;
                padding: 12px 24px;
                border-radius: 8px;
                font-size: 14px;
                font-weight: 500;
                text-align: center;
                box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                z-index: 10001;
                pointer-events: none;
            ">
                <div>⚠️ Click to activate keyboard shortcuts</div>
            </div>
        `;
        this.focusOverlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.75);
            backdrop-filter: blur(6px);
            z-index: 10000;
            display: none;
            opacity: 0;
            pointer-events: auto;
            transition: opacity 0.3s ease, backdrop-filter 0.3s ease;
        `;
        document.body.appendChild(this.focusOverlay);

        // Initialize
        this.loadSettings();
        this.initEventListeners();
        this.updateDurationDisplay();
        this.updateDebugPanel(); // Initialize debug panel display
        this.initAudioContext();
        this.updateWaveformVisibility(); // Show container first
        this.initWaveformCanvas(); // Then initialize canvas (after container is visible)
        this.updatePhotoTimelineVisibility(); // Show/hide photo timeline container
        this.initPhotoTimeline(); // Initialize photo timeline
        this.initAudioDeviceManagement(); // Initialize audio device change detection (BUG-020)
        this.initConfigPanel();
        // audioOutputMonitor.start() is called in startRecording(), after getUserMedia,
        // so enumerateDevices() has permissions and returns real device labels (BUG-022).
        
        this.setState('recording');
        this.startRecording(); // Auto-start as per US-001
        
        // Show onboarding tutorial on first launch (UX-003)
        this.showOnboardingIfFirstTime();
        
        // Initialize contextual tooltips (UX-003)
        this.initContextualTooltips();
    }

    setState(newState) {
        const validStates = ['recording', 'flashback', 'recordingStopped', 'flashbackPaused', 'transitioning'];
        if (!validStates.includes(newState)) {
            return;
        }
        const oldState = this.state;
        this.state = newState;
        this.updateMarkerControls();
        
        // Show first flashback overlay (UX-003)
        if (newState === 'flashback' && oldState !== 'flashback') {
            this.showFirstFlashbackOverlay();
        }
    }

    initEventListeners() {
        if (this.shiftBtn) {
            this.shiftBtn.addEventListener('click', () => this.handleShiftKey());
        }
        this.flashbackBtn.addEventListener('click', () => this.handleBack());
        this.forwardBtn.addEventListener('click', () => this.handleForward());
        if (this.addMarkerBtn) {
            this.addMarkerBtn.addEventListener('click', () => this.handleAddFlashbackMarker());
        }
        if (this.prevMarkerBtn) {
            this.prevMarkerBtn.addEventListener('click', () => {
                this.incrementMarkerUpCounter();
                const skipCount = this.markerUpPressCount;
                this.handleNavigateFlashbackMarker(-1, skipCount);
            });
        }
        if (this.nextMarkerBtn) {
            this.nextMarkerBtn.addEventListener('click', () => this.handleNavigateFlashbackMarker(1));
        }

        this.durationRange.addEventListener('input', () => this.updateDurationFromRange());
        this.durationValue.addEventListener('change', () => this.updateDurationFromInput());

        // Debug panel toggle — controlled by SHOW_DEBUG_PANEL flag
        if (SHOW_DEBUG_PANEL) {
            if (this.debugPanel) this.debugPanel.style.display = 'flex';
            if (this.debugPanelToggle) {
                this.debugPanelToggle.style.display = 'flex';
                this.debugPanelToggle.addEventListener('click', () => this.toggleDebugPanel());
            }
        }

        // Config panel
        if (this.configPanelToggle) {
            this.configPanelToggle.addEventListener('click', () => {
                if (this.configPanel.classList.contains('open')) {
                    this.closeConfigPanel();
                } else {
                    this.openConfigPanel();
                }
            });
        }
        if (this.configPanelClose) {
            this.configPanelClose.addEventListener('click', () => this.closeConfigPanel());
        }
        // Close config panel when clicking outside it
        document.addEventListener('click', (e) => {
            if (this.configPanel && this.configPanel.classList.contains('open') &&
                !this.configPanel.contains(e.target) &&
                e.target !== this.configPanelToggle) {
                this.closeConfigPanel();
            }
        });

        document.addEventListener('keydown', (e) => {
            const active = document.activeElement;
            const isTyping = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isTyping) {
                return;
            }
            switch (e.key) {
                case 'Shift':
                    // Shift now adds a marker (inverted from previous Space behavior)
                    e.preventDefault();
                    this.handleAddFlashbackMarker();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.handleBackKey();
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.handleForwardKey();
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.handleArrowUpKey();
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.handleArrowDownKey();
                    break;
                case 'Escape':
                    if (this.configPanel && this.configPanel.classList.contains('open')) {
                        this.closeConfigPanel();
                    } else {
                        this.handleEscapeKey();
                    }
                    break;
                default:
                    if (e.code === 'Space') {
                        // Space now acts as the unified main control (inverted from previous Shift behavior)
                        e.preventDefault();
                        this.handleShiftKey();
                    }
                    break;
            }
        });

        this.timelineBar.addEventListener('click', (e) => this.handleTimelineClick(e));

        // Focus overlay event listeners
        // Show overlay when window loses focus
        window.addEventListener('blur', () => {
            if (this.focusOverlay) {
                this.focusOverlay.style.display = 'block';
                // Force reflow to trigger animation
                this.focusOverlay.offsetHeight;
                this.focusOverlay.style.opacity = '1';
            }
        });

        // Hide overlay when window regains focus
        window.addEventListener('focus', () => {
            if (this.focusOverlay) {
                this.focusOverlay.style.opacity = '0';
                setTimeout(() => {
                    if (this.focusOverlay) {
                        this.focusOverlay.style.display = 'none';
                    }
                }, 300);
            }
        });

        // Click anywhere on overlay to activate window
        this.focusOverlay.addEventListener('click', () => {
            window.focus();
            // Overlay will hide automatically via 'focus' event
        });

        // Photo timeline click event
        if (this.photoTimelineScroll) {
            console.log('[DEBUG] Attaching click listener to photoTimelineScroll', {
                element: this.photoTimelineScroll,
                id: this.photoTimelineScroll.id,
                className: this.photoTimelineScroll.className,
                offsetWidth: this.photoTimelineScroll.offsetWidth,
                offsetHeight: this.photoTimelineScroll.offsetHeight,
                pointerEvents: window.getComputedStyle(this.photoTimelineScroll).pointerEvents,
                zIndex: window.getComputedStyle(this.photoTimelineScroll).zIndex,
                position: window.getComputedStyle(this.photoTimelineScroll).position
            });
            this.photoTimelineScroll.addEventListener('click', (e) => {
                console.log('[DEBUG] Click event fired on photoTimelineScroll!', {
                    target: e.target,
                    currentTarget: e.currentTarget,
                    clientX: e.clientX,
                    clientY: e.clientY
                });
                this.handlePhotoTimelineClick(e);
            });
            // Also try mousedown to see if it's a click-specific issue
            this.photoTimelineScroll.addEventListener('mousedown', (e) => {
                console.log('[DEBUG] Mousedown event fired on photoTimelineScroll!', {
                    target: e.target,
                    currentTarget: e.currentTarget
                });
            });
        } else {
            console.warn('[DEBUG] photoTimelineScroll is null in initEventListeners()');
        }
    }

    loadSettings() {
        const saved = localStorage.getItem('flashbackMaxDuration');
        if (saved) {
            this.maxDuration = parseInt(saved, 10);
            this.durationRange.value = this.maxDuration;
            this.durationValue.value = this.maxDuration;
        }
        const savedOutput = localStorage.getItem('preferredAudioOutputDeviceId');
        if (savedOutput) this.currentAudioOutputDeviceId = savedOutput;

        const savedMirror = localStorage.getItem('flashbackMirrorMode');
        this.mirrorMode = savedMirror !== null ? savedMirror === 'true' : true;
        // Load waveform visibility setting
        const savedWaveform = localStorage.getItem('flashbackShowWaveform');
        if (savedWaveform !== null) {
            this.showWaveform = savedWaveform === 'true';
        } else {
            // Default to true if not set
            this.showWaveform = true;
        }
        console.log('Waveform visibility loaded:', this.showWaveform);

        // Load photo timeline visibility setting
        const savedPhotoTimeline = localStorage.getItem('flashbackShowPhotoTimeline');
        if (savedPhotoTimeline !== null) {
            this.showPhotoTimeline = savedPhotoTimeline === 'true';
        } else {
            // Default to true if not set
            this.showPhotoTimeline = true;
        }
        console.log('Photo timeline visibility loaded:', this.showPhotoTimeline);
    }

    saveSettings() {
        localStorage.setItem('flashbackMaxDuration', this.maxDuration.toString());
        localStorage.setItem('flashbackShowWaveform', this.showWaveform.toString());
        localStorage.setItem('flashbackShowPhotoTimeline', this.showPhotoTimeline.toString());
        localStorage.setItem('flashbackMirrorMode', this.mirrorMode.toString());
    }

    // ===== WAVEFORM VISUALIZATION METHODS =====

    initWaveformCanvas() {
        // Try to get element again if not found
        if (!this.waveformCanvas) {
            this.waveformCanvas = document.getElementById('waveformCanvas');
        }
        
        if (!this.waveformCanvas) {
            console.warn('Waveform canvas not found, retrying...');
            // Retry after a short delay
            setTimeout(() => {
                this.waveformCanvas = document.getElementById('waveformCanvas');
                if (this.waveformCanvas) {
                    this.initWaveformCanvas();
                } else {
                    console.error('Waveform canvas still not found after retry');
                }
            }, 100);
            return;
        }
        
        this.waveformCtx = this.waveformCanvas.getContext('2d');
        if (!this.waveformCtx) {
            console.warn('Could not get 2D context for waveform canvas');
            return;
        }

        // Wait a bit for container to be visible, then set canvas size
        setTimeout(() => {
            this.resizeWaveformCanvas();
        }, 100);

        // Add event listeners
        this.waveformCanvas.addEventListener('click', (e) => this.handleWaveformClick(e));
        this.waveformCanvas.addEventListener('mousemove', (e) => this.handleWaveformHover(e));
        this.waveformCanvas.addEventListener('mouseleave', () => {
            this.waveformCanvas.style.cursor = 'pointer';
        });

        // Handle window resize - use unified handler with debounce
        const waveformResizeHandler = () => {
            // Clear previous debounce
            if (this.timelineResizeDebounce) {
                clearTimeout(this.timelineResizeDebounce);
            }
            // Debounce resize events to avoid too frequent recalculations
            this.timelineResizeDebounce = setTimeout(() => {
                this.handleTimelineResize();
            }, 400); // 400ms debounce to wait for resize to complete
        };
        window.addEventListener('resize', waveformResizeHandler);
        // Store handler for potential cleanup
        this.waveformWindowResizeHandler = waveformResizeHandler;
    }

    getContainerWidth(element) {
        /**
         * Get container width with forced layout recalculation for accurate measurement.
         * Factorized function used by both waveform and photo timeline.
         */
        if (!element) return 800; // Default fallback
        
        // Force layout reflow to get accurate width after resize
        void element.offsetWidth; // This forces reflow
        
        // Use getBoundingClientRect for sub-pixel accuracy
        const rect = element.getBoundingClientRect();
        return rect.width > 0 ? rect.width : 800;
    }

    resizeWaveformCanvas() {
        if (!this.waveformCanvas || !this.waveformContainer) return;
        
        // Use factorized function to get accurate container width
        const width = this.getContainerWidth(this.waveformContainer);
        const height = 40; // From CSS: height: 40px
        
        const dpr = window.devicePixelRatio || 1;
        
        // Set internal canvas size (in pixels) - this is the actual pixel resolution
        this.waveformCanvas.width = width * dpr;
        this.waveformCanvas.height = height * dpr;
        
        // Keep CSS size (logical size for display)
        this.waveformCanvas.style.width = `${width}px`;
        this.waveformCanvas.style.height = `${height}px`;
        
        if (this.waveformCtx) {
            // Reset transform and scale for high DPI
            this.waveformCtx.setTransform(1, 0, 0, 1, 0, 0);
            this.waveformCtx.scale(dpr, dpr);
            // Force a complete refresh of the waveform
            this.renderWaveform();
        }
    }

    initAudioContext() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('AudioContext not supported:', e);
            this.audioContext = null;
        }
    }

    updateWaveformVisibility() {
        // Try to get element again if not found
        if (!this.waveformContainer) {
            this.waveformContainer = document.getElementById('waveformContainer');
        }
        
        if (!this.waveformContainer) {
            console.warn('Waveform container not found, retrying...');
            // Retry after a short delay
            setTimeout(() => {
                this.waveformContainer = document.getElementById('waveformContainer');
                if (this.waveformContainer) {
                    this.updateWaveformVisibility();
                } else {
                    console.error('Waveform container still not found after retry');
                }
            }, 100);
            return;
        }
        
        if (this.showWaveform) {
            this.waveformContainer.classList.add('show');
            console.log('Waveform container shown');
        } else {
            this.waveformContainer.classList.remove('show');
            console.log('Waveform container hidden');
        }
    }

    toggleWaveform() {
        this.showWaveform = !this.showWaveform;
        this.updateWaveformVisibility();
        this.saveSettings();
    }

    async extractAudioData(chunkBlob) {
        if (!this.audioContext || !chunkBlob) {
            return null;
        }

        try {
            // WebM chunks contain video+audio, so we can't directly decode as audio
            // Use OfflineAudioContext to render audio from media element
            const audio = new Audio();
            const url = URL.createObjectURL(chunkBlob);
            
            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    URL.revokeObjectURL(url);
                    resolve(null);
                }, 5000); // 5 second timeout
                
                audio.onloadedmetadata = async () => {
                    try {
                        const duration = audio.duration;
                        if (!duration || duration === 0 || !isFinite(duration)) {
                            clearTimeout(timeout);
                            URL.revokeObjectURL(url);
                            resolve(null);
                            return;
                        }

                        // Create OfflineAudioContext to render audio
                        const sampleRate = this.audioContext.sampleRate;
                        const offlineContext = new OfflineAudioContext(
                            1, // mono channel
                            Math.ceil(sampleRate * duration),
                            sampleRate
                        );
                        
                        const offlineSource = offlineContext.createMediaElementSource(audio);
                        offlineSource.connect(offlineContext.destination);
                        
                        // Start rendering
                        audio.play().catch(() => {});
                        const renderedBuffer = await offlineContext.startRendering();
                        audio.pause();
                        audio.currentTime = 0;
                        
                        clearTimeout(timeout);
                        URL.revokeObjectURL(url);
                        resolve(renderedBuffer);
                    } catch (e) {
                        clearTimeout(timeout);
                        URL.revokeObjectURL(url);
                        resolve(null);
                    }
                };
                
                audio.onerror = () => {
                    clearTimeout(timeout);
                    URL.revokeObjectURL(url);
                    resolve(null);
                };
                
                audio.src = url;
                audio.load();
            });
        } catch (e) {
            // WebM chunks contain video+audio, decodeAudioData may fail
            // This is expected for video chunks - we'll skip them silently
            return null;
        }
    }

    calculateAmplitudes(audioBuffer, startTime, resolution) {
        if (!audioBuffer) return [];

        const channelData = audioBuffer.getChannelData(0); // Use first channel
        const sampleRate = audioBuffer.sampleRate;
        const duration = audioBuffer.duration;
        const samplesPerPoint = Math.floor((sampleRate * resolution) / 1000); // Samples per resolution ms
        const amplitudes = [];

        for (let i = 0; i < channelData.length; i += samplesPerPoint) {
            const segment = channelData.slice(i, Math.min(i + samplesPerPoint, channelData.length));
            
            // Calculate RMS (Root Mean Square) amplitude
            let sumSquares = 0;
            for (let j = 0; j < segment.length; j++) {
                sumSquares += segment[j] * segment[j];
            }
            const rms = Math.sqrt(sumSquares / segment.length);
            
            const timestamp = startTime + (i / sampleRate);
            amplitudes.push({
                timestamp: timestamp * 1000, // Convert to milliseconds
                amplitude: rms
            });
        }

        return amplitudes;
    }

    startWaveformAnalysis() {
        if (!this.showWaveform || !this.stream) return;

        // Stop any existing analysis first
        this.stopWaveformAnalysis();

        // Ensure audioContext is initialized
        if (!this.audioContext) {
            this.initAudioContext();
        }

        if (!this.audioContext) {
            console.warn('AudioContext not available for waveform analysis');
            return;
        }

        try {
            // Create analyser node
            this.audioAnalyser = this.audioContext.createAnalyser();
            this.audioAnalyser.fftSize = 2048;
            this.audioAnalyser.smoothingTimeConstant = 0.3;

            // Create source from stream
            this.audioSource = this.audioContext.createMediaStreamSource(this.stream);
            this.audioSource.connect(this.audioAnalyser);

            // Store recording start time for accurate timestamps
            this.waveformRecordingStartTime = Date.now();
            this.waveformRecordingStartDuration = this.lifetimeRecordedDuration || 0;

            // Start analyzing audio in real-time
            this.lastWaveformAnalysisTime = Date.now();
            this.lastWaveformRenderTime = Date.now();
            this.analyzeAudioWaveform();
        } catch (e) {
            console.warn('Error starting waveform analysis:', e);
        }
    }

    stopWaveformAnalysis() {
        if (this.waveformAnalysisInterval) {
            clearInterval(this.waveformAnalysisInterval);
            this.waveformAnalysisInterval = null;
        }
        if (this.audioSource) {
            try {
                this.audioSource.disconnect();
            } catch (e) {}
            this.audioSource = null;
        }
        this.audioAnalyser = null;
    }

    analyzeAudioWaveform() {
        if (!this.audioAnalyser || !this.showWaveform || this.state !== 'recording') {
            return;
        }

        const now = Date.now();
        const timeSinceLastAnalysis = now - this.lastWaveformAnalysisTime;
        
        // Analyze at the specified resolution (default 20ms)
        if (timeSinceLastAnalysis >= this.waveformResolution) {
            const bufferLength = this.audioAnalyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);
            this.audioAnalyser.getByteTimeDomainData(dataArray);

            // Calculate RMS amplitude from time domain data
            let sumSquares = 0;
            for (let i = 0; i < dataArray.length; i++) {
                // Convert from 0-255 to -1.0 to 1.0
                const normalized = (dataArray[i] - 128) / 128.0;
                sumSquares += normalized * normalized;
            }
            const rms = Math.sqrt(sumSquares / dataArray.length);

            // Calculate accurate timestamp: base duration + elapsed time since recording start
            const elapsedSinceRecordingStart = (now - this.waveformRecordingStartTime) / 1000; // in seconds
            const currentTime = (this.waveformRecordingStartDuration || 0) + elapsedSinceRecordingStart;

            // Add data point
            const dataPoint = {
                timestamp: currentTime * 1000, // Convert to milliseconds
                amplitude: rms
            };

            this.waveformData.push(dataPoint);

            // Update max amplitude for normalization
            if (rms > this.maxAmplitude) {
                this.maxAmplitude = rms;
            }

            this.lastWaveformAnalysisTime = now;

            // Render waveform at fixed interval (100ms = 10 FPS) for smooth real-time feedback
            const timeSinceLastRender = now - this.lastWaveformRenderTime;
            if (timeSinceLastRender >= this.waveformRenderInterval) {
                this.renderWaveform();
                this.lastWaveformRenderTime = now;
            }
        }

        // Continue analyzing
        requestAnimationFrame(() => this.analyzeAudioWaveform());
    }

    calculateVisibleWindow() {
        /**
         * Calculate visible window bounds using the same logic as updateTimeline()
         * This ensures waveform and timeline are synchronized
         */
        const lifetimeDuration = this.lifetimeRecordedDuration;
        const isRecording = this.state === 'recording';
        const isFlashbackPaused = this.state === 'flashbackPaused';

        let windowStart;
        let windowEnd;

        if (isRecording || isFlashbackPaused) {
            // During recording: use same logic as windowEndDisplay in updateTimeline()
            // windowEndDisplay = Math.max(this.maxDuration, lifetimeDuration)
            windowEnd = Math.max(this.maxDuration, lifetimeDuration);
            // windowStartDisplay = Math.max(0, lifetimeDuration - this.maxDuration)
            windowStart = Math.max(0, lifetimeDuration - this.maxDuration);
        } else {
            // During flashback or stopped: use same logic as windowEndDisplay in updateTimeline()
            // windowEndDisplay = (this.lifetimeRecordedDuration <= this.maxDuration ? this.maxDuration : lifetimeDuration)
            if (this.lifetimeRecordedDuration <= this.maxDuration) {
                windowEnd = this.maxDuration;
            } else {
                windowEnd = this.lifetimeRecordedDuration;
            }
            // windowStartDisplay uses stored windowStart when not recording
            windowStart = this.visibleWindowStart ?? 0;
        }

        const windowDuration = Math.max(windowEnd - windowStart, 0);

        return { windowStart, windowEnd, windowDuration };
    }

    // Width the green timeline bar should occupy, as a percentage of the track.
    // The waveform and photo timeline always stretch the display window [windowStart, windowEnd]
    // (windowEnd = max(maxDuration, recorded duration)) across their whole width. The green bar must
    // fill exactly the fraction of that window covered by recorded content, so its right edge lines
    // up with the end of the recorded content in the waveform, and its cursor/markers share the same
    // time→pixel scale. This yields: a proportional bar (recorded / maxDuration) before the buffer is
    // full, and a full bar once recording has reached/exceeded maxDuration.
    getEffectiveBarWidthPercent() {
        const { windowStart, windowDuration } = this.calculateVisibleWindow();
        if (!(windowDuration > 0)) {
            return 100;
        }
        const recordedEnd = (this.state === 'recording')
            ? this.lifetimeRecordedDuration
            : (this.visibleWindowEnd ?? this.lifetimeRecordedDuration);
        const frac = (recordedEnd - windowStart) / windowDuration;
        return Math.min(Math.max(frac * 100, 0), 100);
    }

    renderWaveform() {
        if (!this.waveformCtx || !this.waveformCanvas || !this.showWaveform) return;
        
        // Draw empty state if no data
        if (this.waveformData.length === 0) {
            requestAnimationFrame(() => {
                const canvas = this.waveformCanvas;
                const ctx = this.waveformCtx;
                // Use canvas internal dimensions (already scaled by DPR)
                const dpr = window.devicePixelRatio || 1;
                const width = (canvas.width / dpr) || canvas.offsetWidth || 800;
                const height = (canvas.height / dpr) || canvas.offsetHeight || 40;

                // Clear canvas
                ctx.clearRect(0, 0, width, height);

                // Draw placeholder text (positioned at bottom)
                ctx.fillStyle = '#9CA3AF';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Enregistrement en cours...', width / 2, height - 10);
            });
            return;
        }

        // Use requestAnimationFrame for smooth rendering
        requestAnimationFrame(() => {
            const canvas = this.waveformCanvas;
            const ctx = this.waveformCtx;
            // Use canvas internal dimensions (already scaled by DPR)
            const dpr = window.devicePixelRatio || 1;
            const width = (canvas.width / dpr) || canvas.offsetWidth || 800;
            const height = (canvas.height / dpr) || canvas.offsetHeight || 40;

            // Clear canvas
            ctx.clearRect(0, 0, width, height);

            // Calculate visible time range using same logic as timeline
            const { windowStart, windowEnd, windowDuration } = this.calculateVisibleWindow();
            const visibleStart = windowStart;
            const visibleEnd = windowEnd;

            // Filter data points in visible range
            const visibleData = this.waveformData.filter(point => {
                const timeInSeconds = point.timestamp / 1000;
                return timeInSeconds >= visibleStart && timeInSeconds <= visibleEnd;
            });

            // Use windowDuration for scaling (not totalDuration which might be smaller)
            const totalDuration = windowDuration;

            if (visibleData.length === 0) return;

            // Visual decimation: calculate optimal number of bars to display
            // For performance, limit to ~2000 bars max
            const maxBars = Math.min(2000, width);
            const decimationFactor = Math.max(1, Math.floor(visibleData.length / maxBars));
            
            // Calculate bar width
            const barWidth = Math.max(0.5, width / maxBars);

            // Draw waveform bars with decimation
            const maxAmp = this.maxAmplitude || 1;
            let lastX = -1;

            for (let i = 0; i < visibleData.length; i += decimationFactor) {
                const point = visibleData[i];
                const timeInSeconds = point.timestamp / 1000;
                
                // Calculate x position
                const progress = (timeInSeconds - visibleStart) / totalDuration;
                const x = progress * width;

                // Skip if too close to previous bar (for performance)
                if (x - lastX < 0.5) continue;
                lastX = x;

                // Calculate bar height (normalized amplitude) - using full height from bottom
                const normalizedAmplitude = point.amplitude / maxAmp;
                const barHeight = Math.max(1, normalizedAmplitude * (height - 4));

                // Choose color based on amplitude
                let color;
                if (normalizedAmplitude > 0.8) {
                    color = '#EF4444'; // Red for high amplitude
                } else if (normalizedAmplitude > 0.5) {
                    color = '#F59E0B'; // Orange for medium-high
                } else if (normalizedAmplitude > 0.2) {
                    color = '#10B981'; // Green for medium
                } else {
                    color = '#6B7280'; // Gray for low
                }

                // Draw bar (starting from bottom, going up)
                ctx.fillStyle = color;
                ctx.fillRect(x - barWidth / 2, height - barHeight, barWidth, barHeight);
            }
        });
    }

    drawPlaybackPosition(currentTime) {
        if (!this.waveformCtx || !this.waveformCanvas || !this.showWaveform) return;

        // Use requestAnimationFrame for smooth updates
        requestAnimationFrame(() => {
            const canvas = this.waveformCanvas;
            const ctx = this.waveformCtx;
            const rect = canvas.getBoundingClientRect();
            const width = rect.width;
            const height = rect.height;

            // Get visible time range using same logic as timeline
            const { windowStart, windowEnd, windowDuration } = this.calculateVisibleWindow();

            // Calculate x position
            const progress = windowDuration > 0 ? (currentTime - windowStart) / windowDuration : 0;
            const x = progress * width;

            // Only redraw if position changed significantly (performance optimization)
            if (this._lastPlaybackX !== undefined && Math.abs(this._lastPlaybackX - x) < 1) {
                return; // Skip if position hasn't changed much
            }
            this._lastPlaybackX = x;

            // Redraw waveform to clear old position indicator
            this.renderWaveform();

            // Draw position indicator line after waveform is rendered
            requestAnimationFrame(() => {
                if (x >= 0 && x <= width) {
                    ctx.strokeStyle = '#EF4444';
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.moveTo(x, 0);
                    ctx.lineTo(x, height);
                    ctx.stroke();

                    // Draw circle at top
                    ctx.fillStyle = '#EF4444';
                    ctx.beginPath();
                    ctx.arc(x, 0, 4, 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        });
    }

    updatePhotoTimelinePlaybackPosition(currentTime) {
        if (!this.photoTimelinePosition || !this.photoTimelineScroll || !this.showPhotoTimeline) return;

        // Get visible time range using same logic as timeline
        const { windowStart, windowEnd, windowDuration } = this.calculateVisibleWindow();

        if (windowDuration <= 0) {
            this.photoTimelinePosition.style.display = 'none';
            return;
        }

        const containerWidth = this.photoTimelineScroll.offsetWidth || 800;

        // Calculate position
        const progress = windowDuration > 0 ? (currentTime - windowStart) / windowDuration : 0;
        const clamped = Math.max(0, Math.min(1, progress));
        const left = clamped * containerWidth;

        // Show/hide based on state
        const shouldShow = (this.state === 'recording' || this.state === 'flashback' || this.state === 'flashbackPaused');
        this.photoTimelinePosition.style.display = shouldShow ? 'block' : 'none';
        this.photoTimelinePosition.style.left = `${left}px`;
    }

    updateAllPlaybackPositions() {
        // Get current absolute time
        const currentTime = this.getCurrentAbsoluteTime();
        
        if (currentTime === null || currentTime < 0) {
            return;
        }

        // Update waveform playback position
        if (this.showWaveform) {
            this.drawPlaybackPosition(currentTime);
        }

        // Update photo timeline playback position
        if (this.showPhotoTimeline) {
            this.updatePhotoTimelinePlaybackPosition(currentTime);
        }

        // Timeline position is already updated in updateTimeline() which is called at 100ms
        // No need to update it here to avoid duplicate updates
    }

    handleWaveformClick(e) {
        if (!this.waveformCanvas || !this.showWaveform) return;
        if (this.state === 'transitioning') return;

        const rect = this.waveformCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Use unified calculation function
        const targetTime = this.calculateTargetTimeFromClick(x, rect, false);

        // Use existing seekFlashback method
        this.seekFlashback(targetTime, {
            allowFromRecording: true,
            allowFromRecordingStopped: true,
            allowFromFlashbackPaused: true
        });
    }

    handleWaveformHover(e) {
        if (!this.waveformCanvas || !this.showWaveform) return;

        const rect = this.waveformCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Use unified calculation function (same as click)
        const targetTime = this.calculateTargetTimeFromClick(x, rect, false);

        // Change cursor to indicate clickability
        this.waveformCanvas.style.cursor = 'pointer';

        // Optional: Show tooltip with timestamp (can be enhanced later)
        this.waveformCanvas.title = `${targetTime.toFixed(2)}s`;
    }

    toggleDebugPanel() {
        if (this.debugPanel) {
            this.debugPanel.classList.toggle('open');
        }
    }

    // ===== PHOTO TIMELINE VISUALIZATION METHODS =====

    initPhotoTimeline() {
        if (!this.photoTimelineScroll) {
            console.warn('[DEBUG] Photo timeline scroll container not found in initPhotoTimeline()');
            return;
        }

        console.log('[DEBUG] initPhotoTimeline() called', {
            element: this.photoTimelineScroll,
            hasClickListeners: this.photoTimelineScroll.onclick !== null,
            children: this.photoTimelineScroll.children.length
        });

        // Note: Event listener is already attached in initEventListeners()
        // Don't attach again to avoid duplicates
        // this.photoTimelineScroll.addEventListener('click', (e) => this.handlePhotoTimelineClick(e));
        
        // Initialize ResizeObserver to detect timeline dimension changes
        if (typeof ResizeObserver !== 'undefined') {
            // Stop any existing observer
            if (this.photoTimelineResizeObserver) {
                this.photoTimelineResizeObserver.disconnect();
            }
            
            this.photoTimelineResizeObserver = new ResizeObserver(() => {
                // Debounce resize events to avoid too frequent recalculations
                if (this.photoTimelineResizeDebounce) {
                    clearTimeout(this.photoTimelineResizeDebounce);
                }
                
                this.photoTimelineResizeDebounce = setTimeout(() => {
                    // Recalculate interval and refresh display
                    this.recalculatePhotoExtractionInterval(true);  // Pass true for isFromResize
                    // Also force a refresh of the photo timeline display
                    if (this.showPhotoTimeline) {
                        this.renderPhotoTimeline();
                    }
                }, 2000); // 2000ms debounce
            });
            
            this.photoTimelineResizeObserver.observe(this.photoTimelineScroll);
            console.log('ResizeObserver initialized for photo timeline');
        } else {
            console.warn('ResizeObserver not supported, falling back to window resize listener');
            // Fallback: use window resize event
            const photoTimelineResizeHandler = () => {
                if (this.photoTimelineResizeDebounce) {
                    clearTimeout(this.photoTimelineResizeDebounce);
                }
                this.photoTimelineResizeDebounce = setTimeout(() => {
                    // Recalculate interval and refresh display
                    this.recalculatePhotoExtractionInterval(true);  // Pass true for isFromResize
                    // Also force a refresh of the photo timeline display
                    if (this.showPhotoTimeline) {
                        this.renderPhotoTimeline();
                    }
                }, 2000);
            };
            window.addEventListener('resize', photoTimelineResizeHandler);
            // Store handler for potential cleanup
            this.photoTimelineWindowResizeHandler = photoTimelineResizeHandler;
        }
    }

    updatePhotoTimelineVisibility() {
        if (!this.photoTimelineContainer) {
            this.photoTimelineContainer = document.getElementById('photoTimelineContainer');
        }
        
        if (!this.photoTimelineContainer) {
            console.warn('Photo timeline container not found, retrying...');
            setTimeout(() => {
                this.photoTimelineContainer = document.getElementById('photoTimelineContainer');
                if (this.photoTimelineContainer) {
                    this.updatePhotoTimelineVisibility();
                }
            }, 100);
            return;
        }
        
        if (this.showPhotoTimeline) {
            this.photoTimelineContainer.classList.add('show');
        } else {
            this.photoTimelineContainer.classList.remove('show');
        }
    }

    togglePhotoTimeline() {
        this.showPhotoTimeline = !this.showPhotoTimeline;
        this.updatePhotoTimelineVisibility();
        this.saveSettings();
    }

    calculatePhotoExtractionInterval() {
        /**
         * Calculate photo extraction interval based on:
         * 1. Photo timeline height (pixels)
         * 2. Video dimensions (width/height)
         * 3. Max duration (seconds)
         * 4. Photo timeline width (pixels)
         * 
         * Formula:
         * - Image width (px) = timeline height * video width / video height
         * - Duration (s) = image width (px) * maxDuration / timeline width (px)
         * - Periodicity = Duration
         */
        if (!this.photoTimelineScroll) return 1; // Default 1 second
        
        // Get timeline dimensions
        const timelineHeight = this.photoTimelineScroll.offsetHeight || this.photoTimelineHeight || 36;
        const timelineWidth = this.photoTimelineScroll.offsetWidth || 800;
        
        // Check if video dimensions are available
        if (!this.videoWidth || !this.videoHeight || this.videoWidth <= 0 || this.videoHeight <= 0) {
            // Fallback: use default interval if video dimensions not available
            return 1;
        }
        
        // Check if maxDuration is valid
        if (!this.maxDuration || this.maxDuration <= 0) {
            return 1;
        }
        
        // Step 2: Calculate image width in pixels
        // Formula: imageWidth = timelineHeight * videoWidth / videoHeight
        const imageWidth = timelineHeight * this.videoWidth / this.videoHeight;
        
        // Step 3: Calculate corresponding duration
        // Formula: duration = imageWidth * maxDuration / timelineWidth
        const duration = imageWidth * this.maxDuration / timelineWidth;
        
        // Step 4: Periodicity = duration (in seconds)
        // Ensure minimum value of 0.1 seconds to avoid too frequent extractions
        const interval = Math.max(0.1, duration);
        
        return interval;
    }

    extractFrameFromVideo(timestamp, sourceVideo) {
        if (!sourceVideo || sourceVideo.readyState < 2) {
            return null; // Video not ready
        }

        try {
            // Create a temporary canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set size (proportional for thumbnails)
            canvas.width = 160; // Fixed width for thumbnails
            canvas.height = 90; // Ratio 16:9
            
            // Draw current frame from video
            ctx.drawImage(sourceVideo, 0, 0, canvas.width, canvas.height);
            
            // Convert to blob/DataURL for storage
            return canvas.toDataURL('image/jpeg', 0.7); // Compression 70%
        } catch (e) {
            console.warn('Error extracting frame:', e);
            return null;
        }
    }

    async extractFrameFromChunkAtTimestamp(chunk, relativeTimestamp) {
        /**
         * Extract a frame from a video chunk at a specific relative timestamp.
         * @param {Object} chunk - Chunk object with blob, absoluteStart, absoluteEnd
         * @param {number} relativeTimestamp - Timestamp relative to chunk start (in seconds)
         * @returns {Promise<string|null>} DataURL of extracted frame or null
         */
        return new Promise((resolve) => {
            try {
                const video = document.createElement('video');
                video.muted = true;
                video.playsInline = true;
                
                const blobUrl = URL.createObjectURL(chunk.blob);
                video.src = blobUrl;
                
                const cleanup = () => {
                    URL.revokeObjectURL(blobUrl);
                    video.remove();
                };
                
                video.addEventListener('loadedmetadata', () => {
                    try {
                        // Seek to the relative timestamp within the chunk
                        const seekTime = Math.min(relativeTimestamp, video.duration);
                        video.currentTime = seekTime;
                    } catch (e) {
                        console.warn('Error seeking in chunk video', e);
                        cleanup();
                        resolve(null);
                    }
                }, { once: true });
                
                video.addEventListener('seeked', () => {
                    try {
                        // Extract frame
                        const canvas = document.createElement('canvas');
                        const ctx = canvas.getContext('2d');
                        canvas.width = 160;
                        canvas.height = 90;
                        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                        const imageData = canvas.toDataURL('image/jpeg', 0.7);
                        cleanup();
                        resolve(imageData);
                    } catch (e) {
                        console.warn('Error extracting frame from chunk', e);
                        cleanup();
                        resolve(null);
                    }
                }, { once: true });
                
                video.addEventListener('error', () => {
                    console.warn('Error loading chunk video');
                    cleanup();
                    resolve(null);
                }, { once: true });
                
                video.load();
            } catch (e) {
                console.warn('Error creating video element for chunk', e);
                resolve(null);
            }
        });
    }

    async reExtractPhotoFramesFromStart() {
        /**
         * Re-extract photo frames from the initial timestamp (0:00 or lifetimeRecordedDuration - maxDuration)
         * to the current time with the new periodicity.
         * This is called when periodicity changes.
         * Uses a lock to prevent simultaneous re-extractions.
         */
        if (!this.showPhotoTimeline) {
            return;
        }
        
        // Check if already re-extracting to avoid simultaneous extractions
        if (this.isReExtracting) {
            console.log('reExtractPhotoFramesFromStart: Already re-extracting, skipping...');
            return;
        }
        
        // Set lock
        this.isReExtracting = true;
        
        try {
            // Clear existing frames
            this.photoFrames = [];
            
            // Calculate start timestamp
            const { windowStart, windowEnd } = this.calculateVisibleWindow();
            const startTimestamp = windowStart;
            const endTimestamp = windowEnd;
            const newInterval = this.calculatePhotoExtractionInterval();
            
            console.log('reExtractPhotoFramesFromStart: Starting re-extraction', {
                startTimestamp,
                endTimestamp,
                interval: newInterval
            });
            
            // Collect all chunks that cover the time range from currentSessionChunks and finalized sessions
            let relevantChunks = [];

            // First, check currentSessionChunks
            if (this.currentSessionChunks && this.currentSessionChunks.length > 0) {
                relevantChunks = this.currentSessionChunks.filter(chunk => {
                    return chunk.absoluteEnd > startTimestamp && chunk.absoluteStart < endTimestamp;
                });
            }

            // Then, check finalized sessions in sessionMap
            if (this.sessionMap && this.sessionMap.size > 0) {
                for (const session of this.sessionMap.values()) {
                    if (session.chunks && session.chunks.length > 0) {
                        const sessionChunks = session.chunks.filter(chunk => {
                            return chunk.absoluteEnd > startTimestamp && chunk.absoluteStart < endTimestamp;
                        });
                        relevantChunks = relevantChunks.concat(sessionChunks);
                    }
                }
            }

            if (relevantChunks.length === 0) {
                console.log('reExtractPhotoFramesFromStart: No chunks available for re-extraction', {
                    currentSessionChunksLength: this.currentSessionChunks ? this.currentSessionChunks.length : 0,
                    sessionMapSize: this.sessionMap ? this.sessionMap.size : 0,
                    startTimestamp,
                    endTimestamp
                });
                // If we're recording, frames will be extracted as recording continues
                return;
            }
            
            // Extract frames at regular intervals
            let currentTimestamp = startTimestamp;
            const extractionPromises = [];
            let timestampsGenerated = 0;
            let chunksFound = 0;
            let promisesCreated = 0;
            
            while (currentTimestamp <= endTimestamp) {
                const timestamp = currentTimestamp;
                timestampsGenerated++;
                
                // Find the chunk that contains this timestamp
                const chunk = relevantChunks.find(c => 
                    c.absoluteStart <= timestamp && c.absoluteEnd >= timestamp
                );
                
                if (chunk) {
                    chunksFound++;
                    // Calculate relative timestamp within the chunk
                    const relativeTimestamp = timestamp - chunk.absoluteStart;
                    
                    // Extract frame from chunk
                    const promise = this.extractFrameFromChunkAtTimestamp(chunk, relativeTimestamp)
                        .then(imageData => {
                            if (imageData) {
                                this.photoFrames.push({
                                    timestamp: timestamp,
                                    imageData: imageData,
                                    thumbnail: imageData
                                });
                            }
                        });
                    
                    extractionPromises.push(promise);
                    promisesCreated++;
                }
                
                // Move to next timestamp
                currentTimestamp += newInterval;
            }
            
            console.log('reExtractPhotoFramesFromStart: Extraction started', {
                timestampsGenerated,
                chunksFound,
                promisesCreated,
                startTimestamp,
                endTimestamp,
                newInterval
            });
            
            // Wait for all extractions to complete
            await Promise.all(extractionPromises);
            
            const framesAfterExtraction = this.photoFrames.length;
            console.log('reExtractPhotoFramesFromStart: Extraction completed', {
                framesExtracted: framesAfterExtraction,
                expectedFrames: promisesCreated
            });
            
            // If we're recording, also extract the current frame from videoPreview
            if (this.state === 'recording' && this.videoPreview && this.videoPreview.readyState >= 2) {
                const currentTime = this.lifetimeRecordedDuration;
                if (currentTime >= startTimestamp && currentTime <= endTimestamp) {
                    const imageData = this.extractFrameFromVideo(currentTime, this.videoPreview);
                    if (imageData) {
                        // Check if frame already exists (might have been extracted from chunk)
                        const epsilon = 0.1;
                        const existingFrame = this.photoFrames.find(frame => 
                            Math.abs(frame.timestamp - currentTime) < epsilon
                        );
                        if (!existingFrame) {
                            this.photoFrames.push({
                                timestamp: currentTime,
                                imageData: imageData,
                                thumbnail: imageData
                            });
                        }
                    }
                }
            }
            
            // Sort frames by timestamp to ensure proper ordering
            this.photoFrames.sort((a, b) => a.timestamp - b.timestamp);
            
            const framesAfterSort = this.photoFrames.length;
            const frameTimestamps = this.photoFrames.map(f => f.timestamp);
            console.log('reExtractPhotoFramesFromStart: Frames sorted', {
                totalFrames: framesAfterSort,
                timestamps: frameTimestamps,
                timestampRange: frameTimestamps.length > 0 ? {
                    min: Math.min(...frameTimestamps),
                    max: Math.max(...frameTimestamps)
                } : null
            });
            
            // Force a complete refresh of the display after all frames are extracted
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                this.renderPhotoTimeline();
            });
        } finally {
            // Release lock
            this.isReExtracting = false;
        }
    }

    hasAvailableChunks() {
        /**
         * Check if chunks are available for re-extraction.
         * Checks currentSessionChunks and finalized sessions in sessionMap.
         * This is consistent with reExtractPhotoFramesFromStart() which uses these sources.
         */
        const hasCurrentSessionChunks = this.currentSessionChunks && this.currentSessionChunks.length > 0;
        
        // Check if any finalized session has chunks
        let hasFinalizedSessions = false;
        if (this.sessionMap && this.sessionMap.size > 0) {
            for (const session of this.sessionMap.values()) {
                if (session.chunks && session.chunks.length > 0) {
                    hasFinalizedSessions = true;
                    break;
                }
            }
        }
        
        return hasCurrentSessionChunks || hasFinalizedSessions;
    }

    async recalculatePhotoExtractionInterval(isFromResize = false) {
        console.log('recalculatePhotoExtractionInterval: Buffer states', {
            chunkBufferLength: this.chunkBuffer ? this.chunkBuffer.length : 0,
            currentSessionChunksLength: this.currentSessionChunks ? this.currentSessionChunks.length : 0
        });
        /**
         * Recalculate photo extraction interval and handle re-extraction if needed.
         * Called when timeline dimensions or maxDuration change.
         * Works even if photoExtractionActive is false, as long as chunks are available.
         */
        if (!this.showPhotoTimeline) {
            return; // Timeline not visible, no need to recalculate
        }
        
        const oldInterval = this.currentPhotoExtractionInterval;
        const newInterval = this.calculatePhotoExtractionInterval();
        
        console.log('recalculatePhotoExtractionInterval: Called', {
            oldInterval,
            newInterval,
            hasChunks: this.hasAvailableChunks(),
            hasExistingFrames: this.photoFrames.length > 0,
            currentSessionChunksCount: this.currentSessionChunks ? this.currentSessionChunks.length : 0,
            finalizedSessionsCount: this.sessionMap ? this.sessionMap.size : 0,
            photoFramesLength: this.photoFrames.length,
            photoExtractionActive: this.photoExtractionActive
        });
        
        if (newInterval === null) {
            console.warn('recalculatePhotoExtractionInterval: Invalid new interval, aborting');
            return;
        }
        
        const difference = Math.abs(newInterval - (oldInterval || 0));
        const differencePercent = oldInterval ? (difference / oldInterval * 100).toFixed(2) + '%' : 'N/A';
        
        console.log('recalculatePhotoExtractionInterval: Checking difference', { difference, differencePercent });
        
        this.currentPhotoExtractionInterval = newInterval;
        
        const hasChunks = this.hasAvailableChunks();
        
        if (difference > 0 || isFromResize) {  // Force re-extraction on resize
            if (hasChunks) {
                console.log('recalculatePhotoExtractionInterval: Interval changed or resize detected, re-extracting frames', { differencePercent, newInterval });
                this.photoFrames = [];  // Clear existing frames
                await this.reExtractPhotoFramesFromStart();
            } else if (this.photoFrames.length > 0) {
                console.log('recalculatePhotoExtractionInterval: Interval changed, but no chunks available - refreshing existing frames');
                this.renderPhotoTimeline();
            } else {
                console.log('recalculatePhotoExtractionInterval: Interval changed, but no chunks or frames available');
            }
        } else {
            console.log('recalculatePhotoExtractionInterval: Interval unchanged, just refreshing display');
            if (this.showPhotoTimeline) {
                this.renderPhotoTimeline();
            }
        }
    }

    startPhotoExtraction() {
        if (!this.showPhotoTimeline) return;

        // Stop any existing extraction
        this.stopPhotoExtraction();

        // Activate extraction flag
        this.photoExtractionActive = true;

        // Calculate extraction interval based on visible window
        const interval = this.calculatePhotoExtractionInterval();
        this.currentPhotoExtractionInterval = interval;
        
        // Store recording start time for accurate timestamps
        this.lastPhotoExtractionTime = Date.now();
        const recordingStartTime = this.lastPhotoExtractionTime;
        const recordingStartDuration = this.lifetimeRecordedDuration || 0;

        // Extract frames periodically
        const extractFrame = () => {
            // Check if extraction is still active
            if (!this.photoExtractionActive || !this.showPhotoTimeline) {
                return; // Stop if disabled or inactive
            }

            // Only extract during recording
            if (this.state !== 'recording' || !this.videoPreview) {
                // Not recording, stop extraction
                return;
            }

            // Determine source video and calculate timestamp
            const sourceVideo = this.videoPreview;
            const now = Date.now();
            const elapsedSinceRecordingStart = (now - recordingStartTime) / 1000;
            const currentTime = recordingStartDuration + elapsedSinceRecordingStart;

            if (!sourceVideo || sourceVideo.readyState < 2) {
                // Video not ready, retry later
                setTimeout(extractFrame, 500);
                return;
            }

            // Extract frame from video
            const imageData = this.extractFrameFromVideo(currentTime, sourceVideo);
            
            if (imageData) {
                // Check if frame already exists at this timestamp (avoid duplicates)
                const epsilon = 0.1; // 100ms tolerance
                const existingFrame = this.photoFrames.find(frame => 
                    Math.abs(frame.timestamp - currentTime) < epsilon
                );

                if (!existingFrame) {
                    // Store frame with timestamp
                    this.photoFrames.push({
                        timestamp: currentTime,
                        imageData: imageData,
                        thumbnail: imageData // For now, use same data for thumbnail
                    });

                    // Sort frames by timestamp
                    this.photoFrames.sort((a, b) => a.timestamp - b.timestamp);

                    // Limit number of frames stored (max 200 for memory management)
                    if (this.photoFrames.length > 200) {
                        // Remove oldest frames outside visible window
                        const { windowStart } = this.calculateVisibleWindow();
                        this.photoFrames = this.photoFrames.filter(frame => 
                            frame.timestamp >= windowStart - 10 // Keep 10s margin
                        );
                    }
                }

                this.lastPhotoExtractionTime = Date.now();
                
                // Update display
                this.renderPhotoTimeline();
            }

            // Schedule next extraction (recalculate interval each time to handle dynamic changes)
            const nextInterval = this.calculatePhotoExtractionInterval();
            this.currentPhotoExtractionInterval = nextInterval;
            setTimeout(extractFrame, nextInterval * 1000);
        };

        // Start extraction
        extractFrame();
    }

    stopPhotoExtraction() {
        // Deactivate extraction flag to stop extraction
        this.photoExtractionActive = false;
        // Don't reset currentPhotoExtractionInterval to null - keep it for comparison during resize
        // It will be updated when recalculatePhotoExtractionInterval() is called
    }

    async handleTimelineResize() {
        /**
         * Unified handler for timeline resize events.
         * Updates both waveform and photo timeline when window is resized.
         * Uses debounce to avoid too frequent recalculations during resize.
         */
        // Resize and refresh waveform
        if (this.showWaveform && this.waveformCanvas) {
            this.resizeWaveformCanvas();
            // renderWaveform() is already called in resizeWaveformCanvas()
        }
        
        // Refresh photo timeline
        if (this.showPhotoTimeline && this.photoTimelineScroll) {
            // Force layout recalculation before rendering to get accurate width
            if (this.photoTimelineContainer) {
                void this.photoTimelineContainer.offsetWidth; // Force reflow
            }
            // Recalculate interval and trigger re-extraction if needed
            // This will handle re-extraction from chunks even if not currently extracting
            // Wait for completion to ensure frames are extracted before rendering
            await this.recalculatePhotoExtractionInterval();
        }
    }

    startPhotoTimelineRefresh() {
        // Stop any existing refresh interval
        this.stopPhotoTimelineRefresh();
        
        // Refresh photo timeline every 100ms for smooth translation
        this.photoTimelineRefreshInterval = setInterval(() => {
            if (this.showPhotoTimeline && this.photoTimelineScroll) {
                this.renderPhotoTimeline();
            }
        }, 100);
    }

    stopPhotoTimelineRefresh() {
        if (this.photoTimelineRefreshInterval) {
            clearInterval(this.photoTimelineRefreshInterval);
            this.photoTimelineRefreshInterval = null;
        }
    }

    renderPhotoTimeline() {
        if (!this.photoTimelineScroll || !this.showPhotoTimeline) return;

        // Force complete refresh: remove all children and reset styles
        while (this.photoTimelineScroll.firstChild) {
            this.photoTimelineScroll.removeChild(this.photoTimelineScroll.firstChild);
        }
        this.photoTimelineScroll.innerHTML = '';

        // Calculate visible time range using same logic as timeline
        const { windowStart, windowEnd, windowDuration } = this.calculateVisibleWindow();
        
        if (windowDuration <= 0) {
            return;
        }

        // Filter frames in visible range
        const totalFramesBeforeFilter = this.photoFrames.length;
        const visibleFrames = this.photoFrames.filter(frame => {
            return frame.timestamp >= windowStart && frame.timestamp <= windowEnd;
        });

        // Calculate interval for positioning
        const interval = this.calculatePhotoExtractionInterval();
        
        // Use factorized function to get accurate container width (same as waveform)
        const containerWidth = this.getContainerWidth(this.photoTimelineContainer);
        
        // Don't force style.width - let CSS (width: 100%) handle automatic resizing

        if (visibleFrames.length === 0) {
            return; // No frames to display
        }
        
        const visibleTimestamps = visibleFrames.map(f => f.timestamp);

        // Create thumbnails for all visible frames
        let thumbnailsCreated = 0;
        visibleFrames.forEach((frame, index) => {
            const thumbnail = document.createElement('div');
            thumbnail.className = 'photo-thumbnail';
            thumbnail.dataset.timestamp = frame.timestamp;
            thumbnail.dataset.interval = interval;

            // Calculate position: left edge of thumbnail (proportional to timestamp)
            const progress = (frame.timestamp - windowStart) / windowDuration;
            const left = progress * containerWidth;
            
            // Calculate width: proportional to interval
            const width = (interval / windowDuration) * containerWidth;

            thumbnail.style.left = `${left}px`;
            thumbnail.style.width = `${Math.max(width, 1)}px`; // Minimum 1px width
            thumbnail.style.backgroundImage = `url(${frame.imageData})`;

            // Add loading state if image not ready
            if (!frame.imageData) {
                thumbnail.classList.add('loading');
            }

            this.photoTimelineScroll.appendChild(thumbnail);
            thumbnailsCreated++;
        });
    }

    handlePhotoTimelineClick(e) {
        if (!this.photoTimelineScroll || !this.showPhotoTimeline) return;
        if (this.state === 'transitioning') return;

        // Check if click is directly on a thumbnail (should not happen with pointer-events: none, but check anyway)
        if (e.target && e.target.classList.contains('photo-thumbnail')) {
            this.showMessage('Photos are transparent to clicks. Click on the timeline, not directly on a photo.', 'error');
            return;
        }

        const rect = this.photoTimelineScroll.getBoundingClientRect();
        const x = e.clientX - rect.left;

        // Use unified calculation function (same as timeline and waveform)
        const targetTime = this.calculateTargetTimeFromClick(x, rect, false);

        // Use existing seekFlashback method
        this.seekFlashback(targetTime, {
            allowFromRecording: true,
            allowFromRecordingStopped: true,
            allowFromFlashbackPaused: true
        });
    }


    // === UPDATE DURATION ON THE RIGHT SIDE OF THE SLIDER ===  

    async updateDurationFromRange() {
    /**
     * Updates the maximum duration from the slider/range input.
     * This function is called when the user moves the slider.
     * It synchronizes the value with the numeric input and updates the display.
     */
        this.maxDuration = parseInt(this.durationRange.value, 10);
        this.durationValue.value = this.maxDuration;
        this.updateDurationDisplay();
        this.saveSettings();
        this.enforceRollingBuffer();
        this.updateDebugPanel();
        
        // Recalculate photo extraction interval if extraction is active
        if (this.photoExtractionActive) {
            await this.recalculatePhotoExtractionInterval();
        } else if (this.showPhotoTimeline) {
            // Even if not extracting, refresh the timeline display
            this.renderPhotoTimeline();
        }
    }

    async updateDurationFromInput() {
    /**
     * Updates the maximum duration from the numeric input.
     * This function is called when the user types a value in the numeric field.
     * It applies constraints (1-3600 seconds) and synchronizes with the slider.
     */
        let val = parseInt(this.durationValue.value, 10);
        if (isNaN(val) || val < 1) val = 1;
        if (val > 3600) val = 3600;
        this.maxDuration = val;
        this.durationRange.value = val;
        this.durationValue.value = val;
        this.updateDurationDisplay();
        this.saveSettings();
        this.enforceRollingBuffer();
        
        // Recalculate photo extraction interval if extraction is active
        if (this.photoExtractionActive) {
            await this.recalculatePhotoExtractionInterval();
        } else if (this.showPhotoTimeline) {
            // Even if not extracting, refresh the timeline display
            this.renderPhotoTimeline();
        }
        this.updateDebugPanel();
    }

    updateDurationDisplay() {
    /**
     * Updates the text display of the maximum duration.
     * Displays the current value of maxDuration with the unit "s" in the durationDisplay element.
     */
        this.durationDisplay.textContent = `${this.maxDuration}s`;
    }

    getMaxBufferedDuration() {
        const margin = Number.isFinite(this.bufferMarginSeconds) ? Math.max(0, this.bufferMarginSeconds) : 0;
        const base = Number.isFinite(this.maxDuration) ? Math.max(0, this.maxDuration) : 0;
        return base + margin;
    }

    formatDuration(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) {
            return '0s';
        }
        if (seconds >= 3600) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return `${hours}h ${minutes}m ${secs}s`;
        }
        if (seconds >= 60) {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}m ${secs}s`;
        }
        if (seconds >= 10) {
            return `${seconds.toFixed(0)}s`;
        }
        return `${seconds.toFixed(1)}s`;
    }

    handleAddFlashbackMarker() {
        if (!(this.state === 'recording' || this.state === 'flashback')) {
            return;
        }
        const marker = this.createFlashbackMarker();
        if (!marker) {
            return;
        }
        this.updateTimeline();
        this.updateMarkerControls();
    }

    createFlashbackMarker() {
        if (!Number.isFinite(this.lifetimeRecordedDuration) || this.lifetimeRecordedDuration <= 0) {
            if (this.chunkBuffer.length === 0 && this.recordedSessions.length === 0) {
                return null;
            }
        }
        const absoluteTime = this.getCurrentAbsoluteTime();
        if (!Number.isFinite(absoluteTime) || absoluteTime < 0) {
            return null;
        }
        const epsilon = this.markerNavigationEpsilon ?? 0;
        const alreadyExists = this.flashbackMarkers.some(marker => {
            const t = marker?.absoluteTime ?? -1;
            return Math.abs(t - absoluteTime) <= epsilon;
        });
        if (alreadyExists) {
            return null;
        }
        const marker = {
            id: ++this.flashbackMarkerIdCounter,
            absoluteTime,
            createdAt: performance.now()
        };
        this.flashbackMarkers.push(marker);
        this.flashbackMarkers.sort((a, b) => a.absoluteTime - b.absoluteTime);
        return marker;
    }

    async handleNavigateFlashbackMarker(direction, skipCount = 1) {
        if (direction !== -1 && direction !== 1) {
            return;
        }
        if (this.state === 'transitioning') {
            return;
        }
        if (this.flashbackMarkers.length === 0 && this.lifetimeRecordedDuration <= 0) {
            return;
        }
        const targetTime = this.getTargetTimeForMarkerNavigation(direction, skipCount);
        if (!Number.isFinite(targetTime) || targetTime < 0) {
            return;
        }
        await this.seekFlashback(targetTime, {
            allowFromRecording: true,
            allowFromRecordingStopped: true,
            allowFromFlashbackPaused: true
        });
    }

    getTargetTimeForMarkerNavigation(direction, skipCount = 1) {
        const sorted = this.flashbackMarkers.slice().sort((a, b) => a.absoluteTime - b.absoluteTime);
        const current = this.getCurrentAbsoluteTime();
        const epsilon = this.markerNavigationEpsilon;
        if (direction === -1) {
            // Find all markers before the current timestamp
            const previousMarkers = [];
            for (let i = sorted.length - 1; i >= 0; i--) {
                if ((sorted[i].absoluteTime || 0) < (current - epsilon)) {
                    previousMarkers.push(sorted[i]);
                }
            }
            
            // If we have enough markers, skip by skipCount
            if (previousMarkers.length >= skipCount) {
                const targetMarker = previousMarkers[skipCount - 1];
                return Math.max(targetMarker.absoluteTime, 0);
            }
            
            // If we don't have enough markers, go to the start of the window
            // or the start of the recording if the window starts at 0
            const windowStart = this.visibleWindowStart ?? 0;
            return Math.max(0, windowStart);
        }
        // Direction === 1 (forward) - no change necessary for now
        for (let i = 0; i < sorted.length; i++) {
            if ((sorted[i].absoluteTime || 0) > (current + epsilon)) {
                return Math.max(sorted[i].absoluteTime, 0);
            }
        }
        const windowEnd = this.visibleWindowEnd ?? this.lifetimeRecordedDuration;
        return Math.max(windowEnd, this.lifetimeRecordedDuration);
    }

    pruneFlashbackMarkers(windowStart, windowEnd) {
        const cutoff = Math.max(0, windowStart ?? 0);
        const upper = Math.max(cutoff, windowEnd ?? this.lifetimeRecordedDuration);
        const before = this.flashbackMarkers.length;
        this.flashbackMarkers = this.flashbackMarkers.filter(marker => {
            const t = marker.absoluteTime;
            if (!Number.isFinite(t)) {
                return false;
            }
            if (t < cutoff - this.markerNavigationEpsilon) {
                return false;
            }
            if (t > this.lifetimeRecordedDuration + this.markerNavigationEpsilon) {
                return false;
            }
            if (upper > cutoff && t > upper + this.markerNavigationEpsilon) {
                return false;
            }
            return true;
        });
        return before !== this.flashbackMarkers.length;
    }

    renderFlashbackMarkers(windowStart, windowEnd, windowDuration, effectiveBarWidthPercent = 100) {
        if (!this.timelineMarkerLayer) {
            return;
        }
        const layer = this.timelineMarkerLayer;
        layer.innerHTML = '';
        if (!Number.isFinite(windowDuration) || windowDuration <= 0) {
            return;
        }
        const start = windowStart ?? 0;
        const end = windowEnd ?? start;
        const visibleMarkers = this.flashbackMarkers.filter(marker => {
            const t = marker.absoluteTime;
            return Number.isFinite(t) && t >= start - this.markerNavigationEpsilon && t <= end + this.markerNavigationEpsilon;
        });
        if (visibleMarkers.length === 0) {
            return;
        }
        const widthPercent = Math.min(Math.max(effectiveBarWidthPercent, 0), 100);
        visibleMarkers.forEach(marker => {
            const t = marker.absoluteTime;
            const relative = (t - start) / windowDuration;
            const clamped = Math.max(0, Math.min(1, relative));
            const markerEl = document.createElement('div');
            markerEl.className = 'timeline-marker';
            markerEl.style.left = `${(clamped * widthPercent).toFixed(3)}%`;
            markerEl.title = this.formatTime(Math.max(0, t));
            layer.appendChild(markerEl);
        });
    }

    updateMarkerControls() {
        const isTransitioning = this.state === 'transitioning';
        const timelineVisible = !!this.timelineContainer;
        const canAdd = !isTransitioning && (this.state === 'recording' || this.state === 'flashback' || this.state === 'flashbackPaused');
        const hasMarkers = this.flashbackMarkers.length > 0;
        const hasData = this.lifetimeRecordedDuration > 0 || this.recordedSessions.length > 0 || this.chunkBuffer.length > 0;
        const canNavigateState = !isTransitioning && (this.state === 'recording' || this.state === 'flashback' || this.state === 'flashbackPaused' || this.state === 'recordingStopped');
        const canNavigate = timelineVisible && canNavigateState && hasMarkers && hasData;

        if (this.addMarkerBtn) {
            this.addMarkerBtn.disabled = !canAdd;
        }
        if (this.prevMarkerBtn) {
            this.prevMarkerBtn.disabled = !canNavigate;
        }
        if (this.nextMarkerBtn) {
            this.nextMarkerBtn.disabled = !canNavigate;
        }
    }

    // === INACTIVITY MONITORING (BUG-021) ===

    startInactivityMonitor() {
        // Réinitialiser le timestamp d'activité sur événements utilisateur
        const updateActivity = () => {
            this.lastActivityTime = Date.now();
            this.inactivityWarningShown = false; // Réinitialiser l'alerte
        };
        
        const mousemoveHandler = updateActivity;
        const keydownHandler = updateActivity;
        const touchstartHandler = updateActivity;
        
        window.addEventListener('mousemove', mousemoveHandler);
        window.addEventListener('keydown', keydownHandler);
        window.addEventListener('touchstart', touchstartHandler);
        
        // Stocker les handlers pour cleanup
        this.inactivityEventListeners = [
            { event: 'mousemove', handler: mousemoveHandler },
            { event: 'keydown', handler: keydownHandler },
            { event: 'touchstart', handler: touchstartHandler }
        ];

        // Checker d'inactivité toutes les 10s
        this.inactivityTimeout = setInterval(() => {
            const inactiveTime = Date.now() - this.lastActivityTime;
            const dontShowAgain = localStorage.getItem('disableInactivityWarning') === 'true';
            if (inactiveTime > 300000 && !this.inactivityWarningShown && !dontShowAgain) { // 5 minutes (300000 ms)
                this.showInactivityWarning();
                this.inactivityWarningShown = true;
            }
        }, 10000); // Vérifier toutes les 10s
    }

    stopInactivityMonitor() {
        if (this.inactivityTimeout) {
            clearInterval(this.inactivityTimeout);
            this.inactivityTimeout = null;
        }
        
        // Retirer les event listeners
        this.inactivityEventListeners.forEach(({ event, handler }) => {
            window.removeEventListener(event, handler);
        });
        this.inactivityEventListeners = [];
    }

    showInactivityWarning() {
        // Créer un modal surimpression
        const modal = document.createElement('div');
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10000';
        modal.id = 'inactivityWarningModal';

        const content = document.createElement('div');
        content.style.background = 'white';
        content.style.color = 'black';
        content.style.padding = '24px';
        content.style.borderRadius = '8px';
        content.style.maxWidth = '500px';
        content.style.textAlign = 'center';
        content.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';

        const message = document.createElement('p');
        message.textContent = 'If your device goes to sleep, it may disrupt the ongoing recording. Check your device settings and disable any sleep or power-saving modes.';
        message.style.marginBottom = '20px';
        message.style.lineHeight = '1.5';
        content.appendChild(message);

        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.marginBottom = '20px';
        checkboxContainer.style.textAlign = 'left';
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';
        checkboxContainer.style.justifyContent = 'center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'dontShowAgain';
        checkbox.style.marginRight = '8px';
        checkboxContainer.appendChild(checkbox);

        const label = document.createElement('label');
        label.htmlFor = 'dontShowAgain';
        label.textContent = 'Do not show this message again';
        label.style.cursor = 'pointer';
        checkboxContainer.appendChild(label);
        content.appendChild(checkboxContainer);

        const okButton = document.createElement('button');
        okButton.textContent = 'OK';
        okButton.style.background = '#007bff';
        okButton.style.color = 'white';
        okButton.style.border = 'none';
        okButton.style.padding = '10px 24px';
        okButton.style.borderRadius = '4px';
        okButton.style.cursor = 'pointer';
        okButton.style.fontSize = '14px';
        okButton.onclick = () => {
            if (checkbox.checked) {
                localStorage.setItem('disableInactivityWarning', 'true');
            }
            document.body.removeChild(modal);
        };
        content.appendChild(okButton);

        modal.appendChild(content);
        document.body.appendChild(modal);
    }

    // === ONBOARDING AND TOOLTIPS (UX-003) ===

    showOnboardingIfFirstTime() {
        const onboardingShown = localStorage.getItem('flashbackOnboardingShown') === 'true';
        if (!onboardingShown) {
            this.onboardingCurrentStep = 0;
            this.showOnboardingModal();
        }
    }

    showOnboardingModal() {
        // Remove existing modal if any
        const existingModal = document.getElementById('onboardingModal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.id = 'onboardingModal';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.7)';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.zIndex = '10001';
        modal.style.opacity = '0';
        modal.style.transition = 'opacity 0.3s ease';

        const steps = [
            "Welcome! Flashback Mirror records continuously to help you easily review yourself and improve (sports, dance, performing arts, public speaking...).",
            "Use ← to go back in time (includes video and audio – be careful if in public! 😉).",
            "Click on the timeline to review a specific moment.",
            "Recording has started automatically. Happy training!"
        ];

        const content = document.createElement('div');
        content.style.background = 'white';
        content.style.color = 'black';
        content.style.padding = '32px';
        content.style.borderRadius = '12px';
        content.style.maxWidth = '500px';
        content.style.textAlign = 'center';
        content.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        content.style.position = 'relative';

        const stepText = document.createElement('p');
        stepText.style.fontSize = '16px';
        stepText.style.lineHeight = '1.6';
        stepText.style.marginBottom = '24px';
        stepText.style.minHeight = '60px';
        stepText.textContent = steps[this.onboardingCurrentStep] + ` (${this.onboardingCurrentStep + 1}/4)`;
        content.appendChild(stepText);

        const checkboxContainer = document.createElement('div');
        checkboxContainer.style.marginBottom = '20px';
        checkboxContainer.style.textAlign = 'left';
        checkboxContainer.style.display = 'flex';
        checkboxContainer.style.alignItems = 'center';
        checkboxContainer.style.justifyContent = 'center';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = 'neverShowOnboarding';
        checkbox.style.marginRight = '8px';
        checkboxContainer.appendChild(checkbox);

        const label = document.createElement('label');
        label.htmlFor = 'neverShowOnboarding';
        label.textContent = 'Never show tutorial again';
        label.style.cursor = 'pointer';
        label.style.fontSize = '14px';
        checkboxContainer.appendChild(label);
        content.appendChild(checkboxContainer);

        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '12px';
        buttonContainer.style.justifyContent = 'center';

        if (this.onboardingCurrentStep < 3) {
            const nextButton = document.createElement('button');
            nextButton.textContent = 'Next';
            nextButton.style.background = '#007bff';
            nextButton.style.color = 'white';
            nextButton.style.border = 'none';
            nextButton.style.padding = '10px 24px';
            nextButton.style.borderRadius = '6px';
            nextButton.style.cursor = 'pointer';
            nextButton.style.fontSize = '14px';
            nextButton.style.fontWeight = '500';
            nextButton.onclick = () => {
                this.onboardingCurrentStep++;
                if (this.onboardingCurrentStep < 4) {
                    modal.remove();
                    this.showOnboardingModal();
                } else {
                    this.closeOnboardingModal(checkbox.checked);
                }
            };
            buttonContainer.appendChild(nextButton);
        } else {
            const okButton = document.createElement('button');
            okButton.textContent = 'OK';
            okButton.style.background = '#007bff';
            okButton.style.color = 'white';
            okButton.style.border = 'none';
            okButton.style.padding = '10px 24px';
            okButton.style.borderRadius = '6px';
            okButton.style.cursor = 'pointer';
            okButton.style.fontSize = '14px';
            okButton.style.fontWeight = '500';
            okButton.onclick = () => {
                this.closeOnboardingModal(checkbox.checked);
            };
            buttonContainer.appendChild(okButton);
        }

        content.appendChild(buttonContainer);
        modal.appendChild(content);

        // Close on outside click
        modal.onclick = (e) => {
            if (e.target === modal) {
                // If clicking outside, don't show remaining steps
                localStorage.setItem('flashbackOnboardingShown', 'true');
                modal.remove();
            }
        };

        document.body.appendChild(modal);
        this.onboardingModal = modal;

        // Fade in
        setTimeout(() => {
            modal.style.opacity = '1';
        }, 10);
    }

    closeOnboardingModal(neverShowAgain) {
        if (this.onboardingModal) {
            this.onboardingModal.style.opacity = '0';
            setTimeout(() => {
                if (this.onboardingModal && this.onboardingModal.parentNode) {
                    this.onboardingModal.remove();
                }
                this.onboardingModal = null;
            }, 300);
        }
        if (neverShowAgain) {
            localStorage.setItem('flashbackOnboardingShown', 'true');
        }
    }

    initContextualTooltips() {
        // Timeline tooltip
        if (this.timelineBar) {
            this.addTooltip(this.timelineBar, 'Click to jump to a specific moment.');
        }
        if (this.photoTimelineScroll) {
            this.addTooltip(this.photoTimelineScroll, 'Click to jump to a specific moment.');
        }
        // Audio timeline (waveform) tooltip
        if (this.waveformCanvas) {
            this.addTooltip(this.waveformCanvas, 'Click to jump to a specific moment.');
        }

        // Navigation buttons tooltips
        if (this.flashbackBtn) {
            this.addTooltip(this.flashbackBtn, 'Go back in time (quick repeated presses increase the distance).');
        }
        if (this.forwardBtn) {
            this.addTooltip(this.forwardBtn, 'Go forward in time (quick repeated presses increase the distance).');
        }

        // Marker buttons tooltips
        if (this.addMarkerBtn) {
            this.addTooltip(this.addMarkerBtn, 'Create a marker. Navigate to previous/next marker with the Up/Down buttons.');
        }
        if (this.prevMarkerBtn) {
            this.addTooltip(this.prevMarkerBtn, 'Navigate to previous marker.');
        }
        if (this.nextMarkerBtn) {
            this.addTooltip(this.nextMarkerBtn, 'Navigate to next marker.');
        }
    }

    addTooltip(element, text) {
        if (!element || !text) return;

        let tooltip = null;

        const showTooltip = (e) => {
            if (tooltip) return; // Already showing

            tooltip = document.createElement('div');
            tooltip.className = 'contextual-tooltip';
            tooltip.textContent = text;
            tooltip.style.position = 'absolute';
            tooltip.style.background = 'rgba(0, 0, 0, 0.85)';
            tooltip.style.color = 'white';
            tooltip.style.padding = '8px 12px';
            tooltip.style.borderRadius = '6px';
            tooltip.style.fontSize = '13px';
            tooltip.style.zIndex = '10000';
            tooltip.style.pointerEvents = 'none';
            tooltip.style.whiteSpace = 'nowrap';
            tooltip.style.maxWidth = '250px';
            tooltip.style.whiteSpace = 'normal';
            tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';

            document.body.appendChild(tooltip);

            // Position tooltip
            const rect = element.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            
            // Position above by default, adjust if needed
            let top = rect.top - tooltipRect.height - 8;
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

            // Adjust if tooltip goes off screen
            if (top < 0) {
                top = rect.bottom + 8; // Show below instead
            }
            if (left < 0) {
                left = 8;
            }
            if (left + tooltipRect.width > window.innerWidth) {
                left = window.innerWidth - tooltipRect.width - 8;
            }

            tooltip.style.top = top + 'px';
            tooltip.style.left = left + 'px';

            // Fade in
            tooltip.style.opacity = '0';
            tooltip.style.transition = 'opacity 0.2s ease';
            setTimeout(() => {
                if (tooltip) tooltip.style.opacity = '1';
            }, 10);
        };

        const hideTooltip = () => {
            if (tooltip) {
                tooltip.style.opacity = '0';
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.remove();
                    }
                    tooltip = null;
                }, 200);
            }
        };

        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
        element.addEventListener('click', hideTooltip);

        this.tooltipElements.set(element, { showTooltip, hideTooltip, tooltip });
    }

    showFirstFlashbackOverlay() {
        const firstFlashbackShown = localStorage.getItem('flashbackFirstTimeShown') === 'true';
        if (firstFlashbackShown) return;

        const overlay = document.createElement('div');
        overlay.id = 'firstFlashbackOverlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '50%';
        overlay.style.left = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.background = 'rgba(0, 0, 0, 0.85)';
        overlay.style.color = 'white';
        overlay.style.padding = '20px 32px';
        overlay.style.borderRadius = '8px';
        overlay.style.fontSize = '16px';
        overlay.style.fontWeight = '500';
        overlay.style.zIndex = '10000';
        overlay.style.textAlign = 'center';
        overlay.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.4)';
        overlay.textContent = 'You are in flashback mode. Use Esc to record again.';

        document.body.appendChild(overlay);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (overlay && overlay.parentNode) {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.3s ease';
                setTimeout(() => {
                    if (overlay && overlay.parentNode) {
                        overlay.remove();
                    }
                }, 300);
            }
        }, 5000);

        // Also allow manual dismissal
        overlay.onclick = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.3s ease';
            setTimeout(() => {
                if (overlay && overlay.parentNode) {
                    overlay.remove();
                }
            }, 300);
        };

        localStorage.setItem('flashbackFirstTimeShown', 'true');
    }

    // === STARTING AND STOPPING RECORDING ===

    async startRecording() {
        try {
            this.finalizePendingSession();
            // Clean up any previous source blob before starting
            if (this.videoPreview) {
                this.videoPreview.src = '';
                // Don't set srcObject to null if we already have a stream - we want to reuse it
                // We'll reattach just after
                if (this.videoPreview.srcObject && this.videoPreview.srcObject !== this.stream) {
                    this.videoPreview.srcObject = null;
                }
            }
            // Don't get a new stream if we already have one active
            if (!this.stream || (this.stream && !this.stream.active)) {
                if (this.stream) {
                    // Stop the old stream before obtaining a new one
                    this.stream.getTracks().forEach(track => track.stop());
                }

                // Preferred devices set by the user in the config panel (FEAT-002)
                const preferredMicId = localStorage.getItem('preferredAudioInputDeviceId');
                const preferredCameraId = localStorage.getItem('preferredVideoDeviceId');

                // Request audio with browser-level processing disabled where possible
                // Additionally, request a basic audio format (44.1 kHz mono) to minimize
                // automatic processing by device hardware (e.g., M1 chip on MacBook) or
                // the electronics handling audio capture. Lower sample rates and mono
                // channels can bypass advanced DSP algorithms (beamforming, spatial
                // noise reduction) that cause unwanted volume pumping/compression.
                const audioConstraints = {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false,
                    sampleRate: 44100,        // 44.1 kHz (CD standard, less "intelligent" processing)
                    channelCount: 1,           // Mono (bypasses stereo beamforming and spatial filtering)
                    ...(preferredMicId ? { deviceId: { ideal: preferredMicId } } : {})
                };
                const videoConstraints = preferredCameraId
                    ? { deviceId: { ideal: preferredCameraId } }
                    : true;

                try {
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        video: videoConstraints,
                        audio: audioConstraints
                    });
                } catch (err) {
                    // Fallback: if format constraints are not supported by the browser/device,
                    // keep at least the filter disabling (echoCancellation, noiseSuppression, autoGainControl)
                    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                        console.warn('Audio format constraints not supported, falling back to basic constraints', err);
                        this.stream = await navigator.mediaDevices.getUserMedia({
                            video: videoConstraints,
                            audio: {
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false,
                                ...(preferredMicId ? { deviceId: { ideal: preferredMicId } } : {})
                            }
                        });
                    } else {
                        throw err; // Re-throw other errors (permissions, etc.)
                    }
                }

                // Debug logging to inspect effective audio settings and verify format compliance
                const audioTracks = this.stream.getAudioTracks ? this.stream.getAudioTracks() : [];
                if (audioTracks.length > 0) {
                    const settings = audioTracks[0].getSettings ? audioTracks[0].getSettings() : {};
                    console.log('FlashbackRecorder audio settings', {
                        requestedAudioConstraints: audioConstraints,
                        effectiveAudioSettings: settings,
                        // Verify if the requested format was respected:
                        formatMatch: {
                            sampleRate: settings.sampleRate === 44100 ? '✓' : `✗ (got ${settings.sampleRate})`,
                            channelCount: settings.channelCount === 1 ? '✓' : `✗ (got ${settings.channelCount})`
                        }
                    });
                    
                    // Store the current audio input device ID (BUG-020)
                    if (settings.deviceId) {
                        this.currentAudioInputDeviceId = settings.deviceId;
                    }
                }
            }
            // Always reattach the stream to ensure it's active
            this.videoPreview.srcObject = this.stream;
            // Mute audio during recording (we still record it, but don't play it)
            this.videoPreview.muted = true;
            // Apply mirror mode and refresh device labels now that gUM has granted permissions
            this.applyMirrorMode();
            this.refreshConfigPanelDevices();
            // Start audio output monitoring now that getUserMedia has granted permissions,
            // so enumerateDevices() returns real device labels (BUG-022)
            this.audioOutputMonitor.start();
            // Restore preferred output device: verify it's still available, fall back to 'default'
            if (this.currentAudioOutputDeviceId && this.currentAudioOutputDeviceId !== 'default') {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const available = devices.some(d => d.kind === 'audiooutput' && d.deviceId === this.currentAudioOutputDeviceId);
                if (available) {
                    await this.updateFlashbackVideoAudioOutput(this.currentAudioOutputDeviceId);
                } else {
                    this.currentAudioOutputDeviceId = 'default';
                    localStorage.removeItem('preferredAudioOutputDeviceId');
                }
            }
            if (this.videoOverlay) {
                this.videoOverlay.style.display = 'flex';
            }
            
            // Capture video dimensions when video is ready
            const captureVideoDimensions = () => {
                if (this.videoPreview && this.videoPreview.readyState >= 2) {
                    // Video metadata is loaded
                    this.videoWidth = this.videoPreview.videoWidth;
                    this.videoHeight = this.videoPreview.videoHeight;
                    console.log('Video dimensions captured:', {
                        width: this.videoWidth,
                        height: this.videoHeight
                    });
                    
                    // Recalculate extraction interval if extraction is active
                    if (this.photoExtractionActive) {
                        this.recalculatePhotoExtractionInterval();
                    }
                } else {
                    // Retry after a short delay
                    setTimeout(captureVideoDimensions, 100);
                }
            };
            
            // Try to capture dimensions immediately if video is already ready
            if (this.videoPreview.readyState >= 2) {
                captureVideoDimensions();
            } else {
                // Wait for loadedmetadata event
                this.videoPreview.addEventListener('loadedmetadata', captureVideoDimensions, { once: true });
            }

            // Set state to 'recording' BEFORE starting waveform analysis
            // This ensures analyzeAudioWaveform() doesn't exit early due to state check
            this.setState('recording');

                    // Start real-time audio analysis for waveform
                    if (this.showWaveform) {
                        this.startWaveformAnalysis();
                    }

                    // Start photo extraction for photo timeline
                    if (this.showPhotoTimeline) {
                        this.startPhotoExtraction();
                        this.startPhotoTimelineRefresh();
                    }

            const options = { mimeType: 'video/webm;codecs=vp9,opus' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options.mimeType = 'video/webm;codecs=vp8,opus';
            }
            this.activeMimeType = options.mimeType;

            // Recreate the MediaRecorder if necessary (it was stopped during flashback)
            if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
            this.mediaRecorder = new MediaRecorder(this.stream, options);
            this.mediaRecorder.ondataavailable = (event) => {
                    this.handleRecordedChunk(event);
            };

            this.mediaRecorder.onstop = () => {
                if (this.state !== 'transitioning' && !this._rotating) {
                    this.saveCurrentSession();
                }
            };
            }

            // Start recording with 1-second chunks
            this.currentSessionId = ++this.currentSessionIdCounter;
            this.currentSessionChunks = [];
            this.currentSessionStartMs = Date.now();
            this._lastChunkTimestamp = this.currentSessionStartMs;
            this.currentSessionHeaderBlob = null;
            this.mediaRecorder.start(1000);
            this.recordingStartTime = this.currentSessionStartMs;

            this.updateUIForRecording();
            this.startTimer(); // Start the timer to regularly update the progress bar
            this.startSegmentRotation(); // Rotate the recorder periodically so each segment is a self-contained WebM

            // Start audio keep-alive to prevent speaker/headphone sleep
            this.audioKeepAlive.start(this.currentAudioOutputDeviceId || 'default');
            
            // Start inactivity monitoring (BUG-021)
            this.startInactivityMonitor();
        } catch (err) {
            this.showMessage('Camera/microphone access denied or unavailable', 'error');
        }
    }

    stopRecording() {
        // Stop the periodic recorder rotation
        this.stopSegmentRotation();

        // Stop waveform analysis
        this.stopWaveformAnalysis();

        // Stop photo extraction
        this.stopPhotoExtraction();
        this.stopPhotoTimelineRefresh();

        // Stop inactivity monitoring (BUG-021)
        this.stopInactivityMonitor();

        if (this.mediaRecorder && this.state === 'recording') {
            this.mediaRecorder.stop();
            this.setState('recordingStopped');
            this.stopTimer();
            this.saveCurrentSession();
            this.updateUIForRecordingStopped();
        }
    }

    resumeRecording() {
        // Check only if we're not already recording and if we have a stream
        // startRecording() handles state transitions and cleanup itself
        if (this.state !== 'recording' && this.stream) {
            this.startRecording();
        } else {
        }
    }

    // === SEGMENT ROTATION ===
    // A single continuous MediaRecorder produces ONE WebM stream whose header lives only in the
    // first chunk; evicting old chunks from the rolling buffer therefore leaves an undecodable,
    // header-less remainder. To avoid this we periodically stop and restart the recorder so each
    // segment is a small, self-contained WebM (its own header, timecodes starting at 0). The
    // rolling buffer can then drop whole old segments without ever corrupting a kept one.

    startSegmentRotation() {
        this.stopSegmentRotation();
        // Keep the segment shorter than the retained window so rotation stays meaningful.
        const seg = Math.max(2, Math.min(this.segmentDurationSeconds, this.maxDuration || this.segmentDurationSeconds));
        this._segmentRotationTimer = setInterval(() => {
            this.rotateRecorder();
        }, seg * 1000);
    }

    stopSegmentRotation() {
        if (this._segmentRotationTimer) {
            clearInterval(this._segmentRotationTimer);
            this._segmentRotationTimer = null;
        }
    }

    async rotateRecorder() {
        // Only rotate a live recording; never during flashback/transition or a rotation already in flight.
        if (this._rotating) return;
        if (this.state !== 'recording') return;
        if (!this.mediaRecorder || this.mediaRecorder.state !== 'recording') return;

        this._rotating = true;
        try {
            // Close the current segment. Detach its onstop so the (asynchronous) stop event cannot
            // fire late and clobber the next segment; we finalize manually below. Wait for the real
            // 'stop' event, which follows the final 'dataavailable', so the last chunk is attributed
            // to this segment before we finalize it.
            const previousRecorder = this.mediaRecorder;
            previousRecorder.onstop = null;
            const stopped = new Promise((resolve) => {
                previousRecorder.addEventListener('stop', resolve, { once: true });
            });
            try {
                previousRecorder.stop();
                await stopped;
            } catch (e) {
            }
            // Finalize the just-recorded segment as its own self-contained session.
            this.saveCurrentSession();

            // A flashback (or stop) may have started while we awaited the recorder; if so, bail out
            // and let that flow own the recorder instead of resurrecting a live one.
            if (this.state !== 'recording') {
                return;
            }

            // Open a fresh segment with a brand-new header.
            const options = { mimeType: this.activeMimeType || 'video/webm' };
            try {
                this.mediaRecorder = new MediaRecorder(this.stream, options);
            } catch (e) {
                return;
            }
            this.mediaRecorder.ondataavailable = (event) => {
                this.handleRecordedChunk(event);
            };
            this.mediaRecorder.onstop = () => {
                if (this.state !== 'transitioning' && !this._rotating) {
                    this.saveCurrentSession();
                }
            };
            this.currentSessionId = ++this.currentSessionIdCounter;
            this.currentSessionChunks = [];
            this.currentSessionStartMs = Date.now();
            this._lastChunkTimestamp = this.currentSessionStartMs;
            this.currentSessionHeaderBlob = null;
            try {
                this.mediaRecorder.start(1000);
            } catch (e) {
            }
        } finally {
            this._rotating = false;
        }
    }

    // === HANDLING TOUCHES ===
    
    handleBackKey() {
        if (this.state === 'transitioning') {
            return;
        }
        this.handleBack();
    }

    handleForwardKey() {
        if (this.state === 'transitioning') {
            return;
        }
        this.handleForward();
    }

    handleEscapeKey() {
        if (this.state === 'flashback') {
            this.stopFlashbackAndResumeRecording();
        }
    }

    handleShiftKey() {
        if (this.state === 'transitioning') {
            return;
        }
        if (this.state === 'recording') {
            this.stopRecording();
            return;
        }
        if (this.state === 'recordingStopped') {
            this.startRecording();
            return;
        }
        if (this.state === 'flashback') {
            if (this.flashbackVideo) {
                try {
                    this.flashbackVideo.pause();
                } catch (e) {
                }
            }
            this.clearFlashbackMonitors();
            this.stopTimer();
            this.setState('flashbackPaused');
            this.updateUIForFlashbackPaused();
            return;
        }
        if (this.state === 'flashbackPaused') {
            const resumeTime = this.getCurrentAbsoluteTime();
            this.seekFlashback(resumeTime, {
                allowFromRecording: false,
                allowFromRecordingStopped: false,
                allowFromFlashbackPaused: true
            });
        }
    }

    handleArrowUpKey() {
        if (this.state === 'transitioning') {
            return;
        }
        
        // Increment the counter and get the number of markers to skip
        this.incrementMarkerUpCounter();
        const skipCount = this.markerUpPressCount; // 1 for first press, 2+ for rapid presses
        
        // Call navigation with the skip count
        this.handleNavigateFlashbackMarker(-1, skipCount);
    }

    handleArrowDownKey() {
        if (this.state === 'transitioning') {
            return;
        }
        if (this.state !== 'flashback' && this.state !== 'flashbackPaused') {
            return;
        }
        this.handleNavigateFlashbackMarker(1);
    }

    // === HANDLING FLASHBACKS ===

    async handleBack() {
        this.incrementBackCounter();

        const backDuration = this.calculateSeekDuration(this.backPressCount);
        const absoluteNow = this.getCurrentAbsoluteTime();

        // Reset previous position if starting from recording (first flashback)
        if (this.state === 'recording' && this.previousAbsoluteTime === null) {
            this.previousAbsoluteTime = absoluteNow;
        }

        let targetTime;
        if (absoluteNow < backDuration) {
            this.showMessage(`Playing from beginning`, 'success');
            targetTime = 0;
        } else {
            targetTime = Math.max(0, absoluteNow - backDuration);
        }

        // Calculate offset from previous position (negative for backward)
        let offsetSeconds = -backDuration;
        if (this.previousAbsoluteTime !== null) {
            offsetSeconds = targetTime - this.previousAbsoluteTime;
        }

        // Show time offset overlay
        this.showTimeOffsetOverlay(offsetSeconds);

        // Store target position as previous for next navigation
        this.previousAbsoluteTime = targetTime;

        const allowOptions = {
            allowFromRecording: true,
            allowFromRecordingStopped: true
        };
        if (this.state === 'flashbackPaused') {
            allowOptions.allowFromFlashbackPaused = true;
        }
        await this.seekFlashback(targetTime, allowOptions);
    }

    async handleForward() {
        this.incrementForwardCounter();

        if (this.state !== 'flashback' && this.state !== 'flashbackPaused') {
            return;
        }

        const forwardDuration = this.calculateSeekDuration(this.forwardPressCount);
        const absoluteNow = this.getCurrentAbsoluteTime();
        const targetTime = absoluteNow + forwardDuration;

        // Calculate offset from previous position (positive for forward)
        let offsetSeconds = forwardDuration;
        if (this.previousAbsoluteTime !== null) {
            offsetSeconds = targetTime - this.previousAbsoluteTime;
        }

        // Show time offset overlay
        this.showTimeOffsetOverlay(offsetSeconds);

        if (targetTime >= this.lifetimeRecordedDuration) {
            this.showMessage('End of recording reached - resuming live recording', 'success');
            this.resumeRecordingAfterFlashback();
            return;
        }

        // Store target position as previous for next navigation
        this.previousAbsoluteTime = targetTime;

        const allowOptions = {
            allowFromRecording: false,
            allowFromRecordingStopped: false
        };
        if (this.state === 'flashbackPaused') {
            allowOptions.allowFromFlashbackPaused = true;
        }
        await this.seekFlashback(targetTime, allowOptions);
    }

    calculateSeekDuration(pressCount) {
    /**
     * Calculates the incremental duration delta for a flashback/advance based on the number of consecutive presses.
     * Uses exponential progression (1, 1, 2, 4, 8, 16... seconds as incremental deltas).
     *
     * Formula:
     * - 1st press (pressCount=1): delta = 1 second
     * - n-th press (pressCount≥2): delta = 2^(pressCount-2) seconds
     * 
     * This ensures cumulative progression: 1s, 2s, 4s, 8s, 16s...
     * - 1st press: delta = 1s → total = 1s
     * - 2nd press: delta = 2^(2-2) = 1s → total = 2s
     * - 3rd press: delta = 2^(3-2) = 2s → total = 4s
     * - 4th press: delta = 2^(4-2) = 4s → total = 8s
     */
        if (pressCount === 1) {
            return 1;
        }
        return Math.pow(2, pressCount - 2);
    }

    async seekFlashback(targetTime, options = {}) {
        console.log('[DEBUG] seekFlashback called', {
            targetTime,
            options,
            currentState: this.state
        });

        const {
            allowFromRecording = false,
            allowFromRecordingStopped = false,
            allowFromFlashbackPaused = false
        } = options;

        // Explicit state check as per plan
        if (this.state === 'recording' && allowFromRecording) {
            console.log('[DEBUG] seekFlashback: Allowed from recording');
        } else if (this.state === 'recordingStopped' && allowFromRecordingStopped) {
            console.log('[DEBUG] seekFlashback: Allowed from recordingStopped');
        } else if (this.state === 'flashbackPaused' && allowFromFlashbackPaused) {
            console.log('[DEBUG] seekFlashback: Allowed from flashbackPaused');
        } else if (this.state === 'flashback') {
            console.log('[DEBUG] seekFlashback: Allowed from flashback');
        } else if (this.state === 'transitioning') {
            console.log('[DEBUG] seekFlashback: Allowed during transitioning');
        } else {
            console.log('[DEBUG] seekFlashback early return: Invalid state');
            return;
        }

        // Check available data
        if (this.recordedSessions.length === 0 && this.currentSessionChunks.length === 0) {
            console.log('[DEBUG] seekFlashback early return: No data available');
            this.showMessage('No recording data available for flashback', 'error');
            return;
        }

        // Stop recording if necessary and allowed
        if (this.state === 'recording' && allowFromRecording) {
            this.stopSegmentRotation();
            this.setState('transitioning');
            try {
                this.mediaRecorder.stop();
            } catch (e) {
            }
            this.stopTimer();
            await this.waitForRecorderStop();
            // Manual save necessary because onstop doesn't happen in 'transitioning' state
            this.saveCurrentSession();

        }

        if (this.state === 'flashbackPaused' && allowFromFlashbackPaused) {
            this.stopTimer();
            this.setState('transitioning');
        }

        // Increment the flashback identifier to invalidate all handlers of the previous flashback
        // This must be done BEFORE recreating allSessions to avoid race conditions
        this._flashbackId++;

        // Synchronize allSessions with recordedSessions (contains the saved session if we were recording)
        this.allSessions = [...this.recordedSessions];

        const clampedTarget = Math.max(0, Math.min(targetTime, this.lifetimeRecordedDuration));
        this.currentReferencePosition = clampedTarget;

        // Reset previous position tracking when starting a new flashback sequence
        // (will be set by handleBack/handleForward when navigation occurs)
        if (this.state === 'recording' || this.state === 'recordingStopped') {
            this.previousAbsoluteTime = clampedTarget;
        }

        // Start flashback
        await this.playFlashbackFromTimestamp(clampedTarget);
    }

    calculateTargetTimeFromClick(x, rect, isTimeline = true) {
        /**
         * Calculates the target timestamp based on the position of a click.
         * Uses calculateVisibleWindow() for up-to-date bounds.
         * 
         * @param {number} x - Click position in pixels (e.clientX - rect.left)
         * @param {DOMRect} rect - Bounding rectangle of the clicked element
         * @param {boolean} isTimeline - true for timeline (green bar), false for waveform (full window)
         * @returns {number} Target timestamp in seconds
         */
        
        // Get up-to-date visible window bounds
        const { windowStart, windowEnd, windowDuration } = this.calculateVisibleWindow();
        
        if (windowDuration <= 0) {
            return windowStart;
        }

        // Both the green timeline bar and the waveform now share the same time→pixel scale (the
        // display window stretched across the full width), so a click maps the same way on either:
        // the fraction of the full width is the fraction of the display window. A click in the gray
        // area beyond the recorded content maps past the recording and is clamped by the caller.
        let percent = rect.width > 0 ? x / rect.width : 0;
        percent = Math.max(0, Math.min(1, percent)); // Clamp to [0, 1]

        // Calculate target time within the visible window
        const targetTime = windowStart + (percent * windowDuration);
        return targetTime;
    }

    incrementBackCounter() {
        this.backPressCount++;
        this.updateCounterDisplay();
        clearTimeout(this.backResetTimer);
        this.backResetTimer = setTimeout(() => {
            this.backPressCount = 0;
            this.updateCounterDisplay();
        }, 500);
    }

    incrementForwardCounter() {
        this.forwardPressCount++;
        clearTimeout(this.forwardResetTimer);
        this.forwardResetTimer = setTimeout(() => {
            this.forwardPressCount = 0;
        }, 500);
    }

    incrementMarkerUpCounter() {
        const now = Date.now();
        const timeSinceLastPress = now - this.lastMarkerUpPressTime;
        
        if (timeSinceLastPress < this.markerUpFastPressThreshold && this.lastMarkerUpPressTime > 0) {
            // Rapid press: increment the counter
            this.markerUpPressCount++;
        } else {
            // Press after delay: reset the counter
            this.markerUpPressCount = 1;
        }
        
        this.lastMarkerUpPressTime = now;
        
        // Reset the counter after the delay
        if (this.markerUpResetTimer) {
            clearTimeout(this.markerUpResetTimer);
        }
        this.markerUpResetTimer = setTimeout(() => {
            this.markerUpPressCount = 0;
            this.markerUpResetTimer = null;
        }, this.markerUpFastPressThreshold);
    }

    updateCounterDisplay() {
        if (!this.counterDisplay) {
            return;
        }
        // Calculate cumulative total duration: 1s, 2s, 4s, 8s, 16s...
        // Formula: 2^(backPressCount - 1) for backPressCount >= 1
        const totalDuration = this.backPressCount === 0 ? 0 : Math.pow(2, this.backPressCount - 1);
        this.counterDisplay.textContent = `← ${this.backPressCount} press${this.backPressCount !== 1 ? 'es' : ''} = ${totalDuration}s back`;
    }

    showTimeOffsetOverlay(offsetSeconds) {
        if (!this.timeOffsetOverlay) {
            return;
        }

        // Clear existing timeout
        if (this.timeOffsetOverlayTimeout) {
            clearTimeout(this.timeOffsetOverlayTimeout);
            this.timeOffsetOverlayTimeout = null;
        }

        // Format offset: negative for backward, positive for forward (but not for 0)
        const roundedOffset = Math.round(offsetSeconds);
        let formattedOffset;
        if (roundedOffset === 0) {
            formattedOffset = '0s';
        } else {
            const sign = offsetSeconds >= 0 ? '+' : '';
            formattedOffset = `${sign}${roundedOffset}s`;
        }

        // Update overlay text
        this.timeOffsetOverlay.textContent = formattedOffset;

        // Show overlay with fade-in
        this.timeOffsetOverlay.style.display = 'block';
        // Force reflow to ensure transition works
        void this.timeOffsetOverlay.offsetWidth;
        this.timeOffsetOverlay.classList.add('show');

        // Hide after 1 second with fade-out
        this.timeOffsetOverlayTimeout = setTimeout(() => {
            this.timeOffsetOverlay.classList.remove('show');
            // Hide completely after fade-out transition
            setTimeout(() => {
                if (this.timeOffsetOverlay) {
                    this.timeOffsetOverlay.style.display = 'none';
                }
            }, 200); // Match CSS transition duration
        }, 1000);
    }

    updateDebugPanel() {
        if (!this.debugSegmentsList) return;

        const sessionIndexById = new Map();
        this.recordedSessions.forEach((session, index) => {
            if (session && typeof session.id !== 'undefined') {
                sessionIndexById.set(session.id, index);
            }
        });

        // === Sessions ===
        this.debugSegmentsList.innerHTML = '';

        if (this.recordedSessions.length === 0) {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = 'debug-empty';
            emptyMsg.textContent = 'No segments recorded';
            this.debugSegmentsList.appendChild(emptyMsg);
        } else {
            this.recordedSessions.forEach((session, index) => {
                const segmentItem = document.createElement('div');
                segmentItem.className = 'segment-item';

                if (this.state === 'flashback' && this.currentFlashbackIndex === index) {
                    segmentItem.classList.add('playing');
                }

                const header = document.createElement('div');
                header.className = 'segment-item-header';

                const segmentNumber = document.createElement('span');
                segmentNumber.className = 'segment-number';
                segmentNumber.textContent = `Segment ${index + 1}`;

                const segmentDuration = document.createElement('span');
                segmentDuration.className = 'segment-duration';
                segmentDuration.textContent = `${(session.duration || 0).toFixed(1)}s`;

                header.appendChild(segmentNumber);
                header.appendChild(segmentDuration);

                const cumulative = document.createElement('div');
                cumulative.className = 'segment-cumulative';
                cumulative.textContent = `Cumulative: ${session.endTime.toFixed(1)}s`;

                segmentItem.appendChild(header);
                segmentItem.appendChild(cumulative);
                this.debugSegmentsList.appendChild(segmentItem);
            });
        }

        // === Chunks ===
        if (this.debugChunksList) {
            this.debugChunksList.innerHTML = '';
            if (this.chunkBuffer.length === 0) {
                const emptyChunks = document.createElement('div');
                emptyChunks.className = 'debug-empty';
                emptyChunks.textContent = 'No chunks';
                this.debugChunksList.appendChild(emptyChunks);
            } else {
                const MAX_CHUNKS_DISPLAY = 60;
                const startIndex = Math.max(0, this.chunkBuffer.length - MAX_CHUNKS_DISPLAY);
                const displayedChunks = this.chunkBuffer.slice(startIndex);

                if (startIndex > 0) {
                    const info = document.createElement('div');
                    info.className = 'chunk-info';
                    info.textContent = `… ${startIndex} hidden chunk${startIndex > 1 ? 's' : ''}`;
                    this.debugChunksList.appendChild(info);
                }

                const currentFlashbackSession = (this.state === 'flashback' && this.currentFlashbackIndex < this.allSessions.length)
                    ? this.allSessions[this.currentFlashbackIndex]?.id
                    : null;

                displayedChunks.forEach(chunk => {
                    const chunkItem = document.createElement('div');
                    chunkItem.className = 'chunk-item';

                    const isFlashbackChunk = currentFlashbackSession !== null && chunk.sessionId === currentFlashbackSession;
                    const isLiveChunk = this.state === 'recording' && chunk.sessionId === this.currentSessionId;
                    if (isFlashbackChunk || isLiveChunk) {
                        chunkItem.classList.add('session-current');
                    }

                    const header = document.createElement('div');
                    header.className = 'chunk-header';

                    const title = document.createElement('span');
                    title.textContent = `Chunk ${chunk.id}`;

                    const duration = document.createElement('span');
                    duration.textContent = `${(chunk.duration || 0).toFixed(1)}s`;

                    header.appendChild(title);
                    header.appendChild(duration);

                    const meta = document.createElement('div');
                    meta.className = 'chunk-meta';

                    let sessionLabel = '—';
                    if (sessionIndexById.has(chunk.sessionId)) {
                        sessionLabel = `S${sessionIndexById.get(chunk.sessionId) + 1}`;
                    } else if (chunk.sessionId && chunk.sessionId === this.currentSessionId) {
                        sessionLabel = 'Live';
                    } else if (chunk.sessionId) {
                        sessionLabel = `#${chunk.sessionId}`;
                    }

                    meta.textContent = `Session: ${sessionLabel} • ${this.formatClockTime(chunk.createdAt)}`;

                    chunkItem.appendChild(header);
                    chunkItem.appendChild(meta);
                    this.debugChunksList.appendChild(chunkItem);
                });
            }
        }

        // === Summary ===
        if (this.debugTotalDuration) {
            this.debugTotalDuration.textContent = `${this.totalRecordedTime.toFixed(1)}s`;
        }
        if (this.debugSegmentCount) {
            this.debugSegmentCount.textContent = this.recordedSessions.length.toString();
        }
        if (this.debugChunkCount) {
            this.debugChunkCount.textContent = this.chunkBuffer.length.toString();
        }
        if (this.debugBufferDuration) {
            this.debugBufferDuration.textContent = `${this._bufferedDuration.toFixed(1)}s`;
        }
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            this.updateTimeline();
        }, 100);
        
        // Start unified playback position updates at 100ms (highest frequency)
        this.startPlaybackPositionUpdates();
    }

    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        // Stop playback position updates
        this.stopPlaybackPositionUpdates();
    }

    startPlaybackPositionUpdates() {
        this.stopPlaybackPositionUpdates(); // Stop any existing interval
        // Update all playback positions at 100ms (highest frequency)
        this.playbackPositionUpdateInterval = setInterval(() => {
            this.updateAllPlaybackPositions();
        }, 100);
    }

    stopPlaybackPositionUpdates() {
        if (this.playbackPositionUpdateInterval) {
            clearInterval(this.playbackPositionUpdateInterval);
            this.playbackPositionUpdateInterval = null;
        }
    }

    // === AUDIO DEVICE MANAGEMENT (BUG-020) ===

    async initAudioDeviceManagement() {
        /**
         * Initialize audio device change detection and management
         * Sets up event listeners and polling to detect changes in default audio devices
         */
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
            console.warn('Audio device management not supported in this browser');
            return;
        }

        // Get initial device list
        await this.updateDeviceList();

        // Set up devicechange event listener (preferred method)
        if (navigator.mediaDevices.addEventListener) {
            this.deviceChangeHandler = () => {
                this.handleDeviceChange();
            };
            navigator.mediaDevices.addEventListener('devicechange', this.deviceChangeHandler);
        }

        // Set up polling as fallback (every 500ms as per backlog)
        this.deviceChangePollingInterval = setInterval(() => {
            this.checkDeviceChanges();
        }, 500);
    }

    async updateDeviceList() {
        /**
         * Update the list of known devices
         * Returns the list of devices
         */
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.lastKnownDevices = devices.map(d => ({
                deviceId: d.deviceId,
                kind: d.kind,
                label: d.label
            }));
            return devices;
        } catch (err) {
            console.warn('Error enumerating devices:', err);
            return [];
        }
    }

    async handleDeviceChange() {
        /**
         * Handle device change event
         * Called when devicechange event fires
         */
        await this.updateDeviceList();
        await this.checkDeviceChanges();
        this.refreshConfigPanelDevices();
    }

    async checkDeviceChanges() {
        /**
         * Check for changes in default audio devices and update accordingly
         * This is called periodically (polling) and on devicechange events
         * Note: The first device in the list is typically the system default
         */
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            // Get default input device (first audioinput device, or null if none)
            // The first device is typically the system default
            const audioInputDevices = devices.filter(d => d.kind === 'audioinput');
            const defaultInputDevice = audioInputDevices.length > 0 ? audioInputDevices[0] : null;
            const defaultInputDeviceId = defaultInputDevice ? defaultInputDevice.deviceId : null;

            // Get default output device (first audiooutput device, or null if none)
            // The first device is typically the system default
            const audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');
            const defaultOutputDevice = audioOutputDevices.length > 0 ? audioOutputDevices[0] : null;
            const defaultOutputDeviceId = defaultOutputDevice ? defaultOutputDevice.deviceId : null;

            // Initialize output device on first run — always use 'default' so Chrome/Firefox
            // follows the OS output device automatically, including Bluetooth speakers.
            if (!this.currentAudioOutputDeviceId) {
                this.currentAudioOutputDeviceId = 'default';
                await this.updateFlashbackVideoAudioOutput('default');
                if (this.audioOutputMonitor) {
                    this.audioOutputMonitor.setCurrentDevice('default');
                }
            } else if (this.currentAudioOutputDeviceId === 'default') {
                // Re-apply on every devicechange so routing stays current after BT connect/disconnect.
                await this.updateFlashbackVideoAudioOutput('default');
            }

            // Check for input device changes
            // Only check if we have a current device ID (to avoid false positives on first run)
            if (defaultInputDeviceId && this.currentAudioInputDeviceId && 
                defaultInputDeviceId !== this.currentAudioInputDeviceId) {
                await this.handleAudioInputDeviceChange(defaultInputDeviceId, defaultInputDevice);
            }
        } catch (err) {
            console.warn('Error checking device changes:', err);
        }
    }

    async setAudioOutputDevice(deviceId) {
        /**
         * Set audio output device (public API for AudioOutputMonitor)
         * Wrapper around updateAudioOutputDevice that also notifies the monitor
         */
        await this.updateAudioOutputDevice(deviceId);
        
        // Notify audio output monitor of the device change
        if (this.audioOutputMonitor) {
            this.audioOutputMonitor.setCurrentDevice(deviceId);
        }
    }

    async updateAudioOutputDevice(deviceId) {
        /**
         * Update audio output device for playback
         * Uses setSinkId() if available, otherwise relies on browser's automatic routing
         */
        if (!deviceId) return;

        // Get device label for display
        const deviceLabel = this.getDeviceLabel(deviceId);

        // Update stored device ID
        this.currentAudioOutputDeviceId = deviceId;

        // Update flashback video if it exists
        await this.updateFlashbackVideoAudioOutput(deviceId);

        // Show overlay message
        this.showDeviceChangeOverlay(deviceLabel || 'Unknown device', 'output');
    }

    async updateFlashbackVideoAudioOutput(deviceId = 'default') {
        /**
         * Update audio output device for flashback video.
         * Uses setSinkId() when available (Chrome/Edge/Firefox).
         * Passing 'default' follows the OS default output device automatically.
         * On Safari (no setSinkId), the browser routes to OS default without action.
         */
        if (!this.flashbackVideo) return;

        if (typeof this.flashbackVideo.setSinkId === 'function') {
            // '' (empty string) = browser default (follows OS), per the Web Audio Output Devices spec.
            // 'default' is Chrome's virtual device ID and may not follow the OS default reliably.
            const sinkId = (deviceId === 'default') ? '' : deviceId;
            try {
                await this.flashbackVideo.setSinkId(sinkId);
                console.log('Audio output device updated via setSinkId:', sinkId || '(browser default)');
            } catch (err) {
                console.warn('Error setting audio output device via setSinkId:', err);
            }
        }
        // On Safari / browsers without setSinkId: audio follows OS default automatically.
    }

    async handleAudioInputDeviceChange(newDeviceId, newDevice) {
        /**
         * Handle change in default audio input device
         * Option A: Detect and notify user, allowing them to continue or switch
         */
        if (!newDeviceId || newDeviceId === this.currentAudioInputDeviceId) {
            return; // No change or already using this device
        }

        const oldDeviceId = this.currentAudioInputDeviceId;
        const oldDeviceLabel = this.getDeviceLabel(oldDeviceId);
        const newDeviceLabel = newDevice ? newDevice.label : 'Unknown device';

        // Update stored device ID
        this.currentAudioInputDeviceId = newDeviceId;

        // Always show overlay notification for input device change
        this.showDeviceChangeOverlay(newDeviceLabel, 'input');

        // If we're currently recording, show additional detailed message
        if (this.state === 'recording' && this.stream) {
            const currentAudioTrack = this.stream.getAudioTracks()[0];
            if (currentAudioTrack) {
                const currentSettings = currentAudioTrack.getSettings();
                const currentDeviceId = currentSettings.deviceId;

                // Only show detailed message if we're actually using a different device
                if (currentDeviceId && currentDeviceId !== newDeviceId) {
                    // Show detailed message in the overlay after a short delay to show both messages
                    setTimeout(() => {
                        this.showMessage(
                            `New audio input device detected: ${newDeviceLabel}. ` +
                            `Recording continues with the current device. ` +
                            `The new device will be used on the next recording.`,
                            'info'
                        );
                    }, 3500); // Show after device change overlay disappears (3s + 0.5s)
                }
            }
        }
    }

    getDeviceLabel(deviceId) {
        /**
         * Get the label for a device ID from the known devices list
         */
        if (!deviceId) return null;
        const device = this.lastKnownDevices.find(d => d.deviceId === deviceId);
        return device ? device.label : null;
    }

    removeAlert(alertId) {
        /**
         * Remove a specific alert by its ID
         * @param {number} alertId - ID of the alert to remove
         */
        const alertData = this.activeAlerts.get(alertId);
        if (!alertData) return;

        // Clear timeout if exists
        if (alertData.timeoutId) {
            clearTimeout(alertData.timeoutId);
        }

        // Fade out and remove
        if (alertData.element) {
            alertData.element.classList.remove('show');
            setTimeout(() => {
                if (alertData.element && alertData.element.parentNode) {
                    alertData.element.parentNode.removeChild(alertData.element);
                }
                this.activeAlerts.delete(alertId);
            }, 300); // Match CSS transition duration
        } else {
            this.activeAlerts.delete(alertId);
        }
    }

    removeOldestAlert() {
        /**
         * Remove the oldest alert when limit is reached
         */
        if (this.activeAlerts.size === 0) return;

        // Find the oldest alert by createdAt timestamp
        let oldestId = null;
        let oldestTime = Infinity;

        for (const [alertId, alertData] of this.activeAlerts.entries()) {
            if (alertData.createdAt < oldestTime) {
                oldestTime = alertData.createdAt;
                oldestId = alertId;
            }
        }

        if (oldestId !== null) {
            this.removeAlert(oldestId);
        }
    }

    addAlert(text, type = 'info') {
        /**
         * Add a new alert to the alerts container
         * @param {string} text - Message text to display
         * @param {string} type - Type of message: 'error', 'success', 'info', 'device-change'
         * @returns {number} - Alert ID
         */
        if (!this.alertsContainer) return null;

        // Enforce limit: remove oldest if at max
        if (this.activeAlerts.size >= this.maxAlerts) {
            this.removeOldestAlert();
        }

        // Generate unique ID
        const alertId = ++this.alertIdCounter;
        const createdAt = Date.now();

        // Create alert element
        const alertElement = document.createElement('div');
        alertElement.className = 'alert-item';
        alertElement.textContent = text;

        // Add type class
        const validTypes = ['error', 'success', 'info', 'device-change'];
        if (validTypes.includes(type)) {
            alertElement.classList.add(type);
        } else {
            alertElement.classList.add('info'); // Default
        }

        // Add to container
        this.alertsContainer.appendChild(alertElement);

        // Show with fade-in animation
        requestAnimationFrame(() => {
            alertElement.classList.add('show');
        });

        // Set up auto-removal after 3 seconds
        const timeoutId = setTimeout(() => {
            this.removeAlert(alertId);
        }, 3000);

        // Store alert data
        this.activeAlerts.set(alertId, {
            element: alertElement,
            timeoutId: timeoutId,
            createdAt: createdAt,
            type: type,
            text: text
        });

        return alertId;
    }

    showOverlayMessage(text, type = 'info') {
        /**
         * Display a unified overlay message in the bottom of the video
         * @param {string} text - Message text to display
         * @param {string} type - Type of message: 'error', 'success', 'info', 'device-change'
         */
        this.addAlert(text, type);
    }

    showDeviceChangeOverlay(deviceName, deviceType) {
        /**
         * Display an overlay message indicating a device change
         * @param {string} deviceName - Name of the new device
         * @param {string} deviceType - Type of device ('input' or 'output')
         */
        const deviceTypeLabel = deviceType === 'input' ? 'Input' : 'Output';
        const displayName = deviceName || 'Unknown device';
        const message = `${deviceTypeLabel} device changed: ${displayName}`;
        this.showOverlayMessage(message, 'device-change');
    }

    cleanupAudioDeviceManagement() {
        /**
         * Clean up audio device management listeners and intervals
         */
        if (this.deviceChangeHandler && navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
            navigator.mediaDevices.removeEventListener('devicechange', this.deviceChangeHandler);
            this.deviceChangeHandler = null;
        }

        if (this.deviceChangePollingInterval) {
            clearInterval(this.deviceChangePollingInterval);
            this.deviceChangePollingInterval = null;
        }
    }

    clearFlashbackMonitors() {
        if (this._flashbackTimeout) {
            clearTimeout(this._flashbackTimeout);
            this._flashbackTimeout = null;
        }
        if (this._flashbackInterval) {
            clearInterval(this._flashbackInterval);
            this._flashbackInterval = null;
        }
        if (this._timeupdateGuardTimeout) {
            clearTimeout(this._timeupdateGuardTimeout);
            this._timeupdateGuardTimeout = null;
        }
        if (this._metadataTimeout) {
            clearTimeout(this._metadataTimeout);
            this._metadataTimeout = null;
        }
    }

    handleRecordedChunk(event) {

        if (!event || !event.data || event.data.size === 0) {
            return;
        }

        const now = Date.now();
        let duration = 1;
        if (this._lastChunkTimestamp !== null) {
            duration = Math.max(0.1, (now - this._lastChunkTimestamp) / 1000);
        }
        this._lastChunkTimestamp = now;

        const absoluteStart = this.lifetimeRecordedDuration;
        const absoluteEnd = absoluteStart + duration;
        
        // Extract first frame from first chunk at the start of a new recording (timestamp = 0)
        const isStartOfNewRecording = absoluteStart === 0 || (absoluteStart < 0.1 && this.photoFrames.length === 0);
        if (isStartOfNewRecording && this.showPhotoTimeline && this.videoPreview && this.videoPreview.readyState >= 2) {
            const firstFrameImageData = this.extractFrameFromVideo(0, this.videoPreview);
            if (firstFrameImageData) {
                // Check if frame already exists at timestamp 0 (avoid duplicates)
                const epsilon = 0.1; // 100ms tolerance
                const existingFrame = this.photoFrames.find(frame => 
                    Math.abs(frame.timestamp - 0) < epsilon
                );
                if (!existingFrame) {
                    this.photoFrames.push({
                        timestamp: 0,
                        imageData: firstFrameImageData,
                        thumbnail: firstFrameImageData
                    });
                    this.photoFrames.sort((a, b) => a.timestamp - b.timestamp);
                    this.renderPhotoTimeline();
                }
            }
        }
        
        this.lifetimeRecordedDuration = absoluteEnd;

        let targetSessionId = this.currentSessionId;
        let isCurrentSession = true;
        if (targetSessionId === null && this.pendingSessionId !== null) {
            targetSessionId = this.pendingSessionId;
            isCurrentSession = false;
        }

        let attachedToLastSession = false;
        let lastSessionForAttachment = null;
        if (targetSessionId === null && this.lastFinalizedSessionId !== null) {
            const lastSession = this.sessionMap.get(this.lastFinalizedSessionId);
            if (lastSession) {
                const lastVisibleEnd = lastSession.visibleEndAbs ?? lastSession.absoluteEnd ?? lastSession.absoluteStart ?? 0;
                const gap = absoluteStart - lastVisibleEnd;
                if (gap >= 0 && gap <= this.lateChunkThresholdSeconds) {
                    targetSessionId = lastSession.id;
                    isCurrentSession = false;
                    attachedToLastSession = true;
                    lastSessionForAttachment = lastSession;
                }
            }
        }

        const isFirstChunkOfCurrentSession = isCurrentSession && this.currentSessionChunks.length === 0;

        const chunk = {
            id: ++this.currentChunkSequence,
            blob: event.data,
            duration,
            mimeType: event.data.type || this.activeMimeType || 'video/webm',
            sessionId: targetSessionId,
            createdAt: now,
            isSessionHeader: isFirstChunkOfCurrentSession,
            isPreRoll: false,
            absoluteStart,
            absoluteEnd
        };

        if (isFirstChunkOfCurrentSession && event.data) {
            this.currentSessionHeaderBlob = event.data;
        }

        this.chunkBuffer.push(chunk);
        this._bufferedDuration += duration;

        let sessionUpdated = false;

        if (attachedToLastSession && lastSessionForAttachment) {
            chunk.sessionId = lastSessionForAttachment.id;
            lastSessionForAttachment.chunks.push(chunk);
            this.refreshSessionBounds(lastSessionForAttachment);
            lastSessionForAttachment.playableDuration = lastSessionForAttachment.duration;
            sessionUpdated = true;
        } else if (isCurrentSession && this.currentSessionId !== null) {
            this.currentSessionChunks.push(chunk);
        } else if (!isCurrentSession && this.pendingSessionId !== null) {
            this.pendingSessionChunks.push(chunk);
            const pendingSession = this.sessionMap.get(this.pendingSessionId);
            if (pendingSession) {
                pendingSession.chunks.push(chunk);
                sessionUpdated = true;
            }
            if (this.state !== 'recording' && (!this.mediaRecorder || this.mediaRecorder.state !== 'recording')) {
                this.finalizePendingSession();
                sessionUpdated = false;
            }
        }

        this.enforceRollingBuffer();

        if (sessionUpdated) {
            this.recomputeSessionBoundaries();
        }

        if (this.state === 'recording') {
            this.updateTimeline();
        }
        
        // Waveform is now analyzed in real-time from the stream, not from chunks
        // No need to process chunks for waveform
        
        this.updateDebugPanel();
    }

    removeChunksFromBuffer(chunks) {
        if (!Array.isArray(chunks) || chunks.length === 0) {
            return;
        }
        const idsToRemove = new Set(chunks.map(chunk => chunk.id));
        if (this.currentSessionChunks.length > 0) {
            this.currentSessionChunks = this.currentSessionChunks.filter(chunk => !idsToRemove.has(chunk.id));
        }
        this.chunkBuffer = this.chunkBuffer.filter(chunk => {
            if (idsToRemove.has(chunk.id)) {
                let preservedHeader = false;
                if (chunk.sessionId) {
                    const session = this.sessionMap.get(chunk.sessionId);
                    if (chunk.isSessionHeader && chunk.sessionId === this.currentSessionId && !this.currentSessionHeaderBlob && chunk.blob) {
                        this.currentSessionHeaderBlob = chunk.blob;
                        preservedHeader = true;
                    }
                    if (session && chunk.isSessionHeader && chunk.blob && !session.headerBlob) {
                        session.headerBlob = chunk.blob;
                        preservedHeader = true;
                    }
                }
                this._bufferedDuration = Math.max(0, this._bufferedDuration - (chunk.duration || 0));
                if (!preservedHeader) {
                    chunk.blob = null;
                }
                return false;
            }
            return true;
        });
        if (this.pendingSessionChunks.length > 0) {
            this.pendingSessionChunks = this.pendingSessionChunks.filter(chunk => !idsToRemove.has(chunk.id));
            if (this.pendingSessionChunks.length === 0 && this.pendingSessionId) {
                this.finalizePendingSession();
            }
        }
        this.updateDebugPanel();
    }

    refreshSessionBounds(session) {
        if (!session || !Array.isArray(session.chunks)) {
            return;
        }
        const chunks = session.chunks.filter(Boolean);
        if (chunks.length === 0) {
            session.absoluteStart = session.absoluteStart ?? this.lifetimeRecordedDuration;
            session.absoluteEnd = session.absoluteStart;
            session.visibleStartAbs = session.absoluteEnd;
            session.visibleEndAbs = session.absoluteEnd;
            session.duration = 0;
            session.preRollDuration = 0;
            session.chunkCount = 0;
            return;
        }
        chunks.sort((a, b) => (a.absoluteStart || 0) - (b.absoluteStart || 0));
        session.absoluteStart = chunks[0].absoluteStart ?? session.absoluteStart ?? 0;
        session.absoluteEnd = chunks[chunks.length - 1].absoluteEnd ?? session.absoluteEnd ?? session.absoluteStart;

        let visibleStartAbs = null;
        let visibleEndAbs = null;
        let visibleDuration = 0;
        let preRollDuration = 0;
        let visibleChunkCount = 0;

        chunks.forEach(chunk => {
            const chunkDuration = chunk.duration || 0;
            const chunkEnd = chunk.absoluteEnd ?? ((chunk.absoluteStart || 0) + chunkDuration);
            if (chunk.isPreRoll) {
                preRollDuration += chunkDuration;
            } else {
                visibleDuration += chunkDuration;
                visibleChunkCount += 1;
                if (visibleStartAbs === null) {
                    visibleStartAbs = chunk.absoluteStart ?? session.absoluteStart;
                }
                visibleEndAbs = chunkEnd;
            }
        });

        session.preRollDuration = preRollDuration;
        session.duration = visibleDuration;
        session.chunkCount = visibleChunkCount;
        session.visibleStartAbs = visibleStartAbs ?? session.absoluteEnd;
        session.visibleEndAbs = visibleEndAbs ?? session.visibleStartAbs;
    }

    updateShiftButton(label, variant = 'secondary', disabled = false) {
        if (!this.shiftBtn) {
            return;
        }
        const variantClass = variant === 'primary'
            ? 'btn-primary'
            : variant === 'danger'
                ? 'btn-danger'
                : 'btn-secondary';
        this.shiftBtn.classList.remove('btn-primary', 'btn-danger', 'btn-secondary');
        this.shiftBtn.classList.add('btn');
        this.shiftBtn.classList.add(variantClass);
        this.shiftBtn.textContent = label;
        this.shiftBtn.disabled = !!disabled;
    }

    updateStateIndicator(state) {
        if (!this.stateIndicatorDot || !this.stateIndicatorLabel) {
            return;
        }
        if (this.videoOverlay) {
            this.videoOverlay.style.display = 'flex';
        }
        let color = '#6B7280';
        let text = 'READY';
        if (state === 'recording') {
            color = '#EF4444';
            text = 'REC';
        } else if (state === 'flashback') {
            color = '#2563EB';
            text = 'FLASHBACK';
        } else if (state === 'flashbackPaused') {
            color = '#F59E0B';
            text = 'PAUSE';
        } else if (state === 'recordingStopped') {
            color = '#6B7280';
            text = 'READY';
        }
        this.stateIndicatorDot.style.backgroundColor = color;
        this.stateIndicatorLabel.textContent = text;
    }

    updateUIForRecording() {
        this.updateShiftButton('Stop', 'danger');
        this.flashbackBtn.disabled = false;
        this.forwardBtn.disabled = true;
        this.timelineContainer.style.display = 'block';
        if (this.timelineLegend) {
            this.timelineLegend.textContent = '';
        }
        this.timelinePosition.style.display = 'block';
        // Mute audio during recording (we still record it, but don't play it)
        if (this.videoPreview) {
            this.videoPreview.muted = true;
        }
        this.updateMarkerControls();
        this.updateStateIndicator('recording');
    }

    updateUIForFlashback() {
        this.updateShiftButton('Pause', 'secondary');
        this.flashbackBtn.disabled = false;
        this.forwardBtn.disabled = false;
        if (this.videoOverlay) {
            this.videoOverlay.style.display = 'flex';
        }
        // Don't reset counters to 0 for continuous flashbacks
        this.timelinePosition.style.display = 'block';
        if (this.timelineLegend) {
            this.timelineLegend.textContent = '';
        }
        // Ensure the timeline is visible in flashback mode
        this.timelineContainer.style.display = 'block';
        this.updateMarkerControls();
        this.updateStateIndicator('flashback');
    }

    updateUIForFlashbackPaused() {
        this.updateShiftButton('Read', 'primary');
        this.flashbackBtn.disabled = false;
        this.forwardBtn.disabled = false;
        if (this.videoOverlay) {
            this.videoOverlay.style.display = 'flex';
        }
        this.timelineContainer.style.display = 'block';
        this.timelinePosition.style.display = 'block';
        if (this.timelineLegend) {
            this.timelineLegend.textContent = '';
        }
        this.updateMarkerControls();
        this.updateStateIndicator('flashbackPaused');
    }

    updateUIForRecordingStopped() {
        this.updateShiftButton('Record', 'primary');
        this.flashbackBtn.disabled = true;
        this.forwardBtn.disabled = true;
        this.timelineContainer.style.display = 'block';
        // Keep the timeline visible even when recording is stopped
        this.timelinePosition.style.display = 'none';
        // Mute audio when recording is stopped (if stream is still attached)
        if (this.videoPreview) {
            this.videoPreview.muted = true;
        }
        if (this.timelineLegend) {
            this.timelineLegend.textContent = '';
        }
        if (this.timelineMarkerLayer) {
            this.timelineMarkerLayer.innerHTML = '';
        }
        this.updateMarkerControls();
        this.updateStateIndicator('recordingStopped');
    }

    saveCurrentSession() {
        this.debugLogState('save:start', {
            currentSessionId: this.currentSessionId,
            currentChunks: this.currentSessionChunks.length
        });
        /**
         * Saves the current recording session by creating a logical session
         * based on the individual chunks stored in the buffer.
         * 
         * This function is called:
         * - When manual stop (stopRecording)
         * - When flashback (startFlashbackFlashback) to save the current session
         */
        this.finalizePendingSession();

        if (this.currentSessionChunks.length === 0) {
            this.currentSessionStartMs = null;
            this.currentSessionId = null;
            this._lastChunkTimestamp = null;
            this.currentSessionHeaderBlob = null;
            return;
        }

        const sessionChunks = [...this.currentSessionChunks];
        const sessionDuration = sessionChunks.reduce((sum, chunk) => sum + (chunk.duration || 0), 0);
        const totalBytes = sessionChunks.reduce((sum, chunk) => sum + ((chunk.blob && chunk.blob.size) || 0), 0);

        const MIN_DURATION = 0.5; // seconds
        const MIN_BLOB_SIZE = 5000; // octets

        if (sessionDuration < MIN_DURATION || totalBytes < MIN_BLOB_SIZE) {
            this.removeChunksFromBuffer(sessionChunks);
            this.currentSessionChunks = [];
            this.currentSessionStartMs = null;
            this.currentSessionId = null;
            this._lastChunkTimestamp = null;
            this.pendingSessionId = null;
            this.pendingSessionChunks = [];
            this.currentSessionHeaderBlob = null;
            return;
        }

        const sessionId = this.currentSessionId ?? ++this.currentSessionIdCounter;

        const session = {
            id: sessionId,
            chunks: sessionChunks,
            chunkCount: sessionChunks.length,
            duration: sessionDuration,
            playableDuration: sessionDuration,
            startTime: 0,
            endTime: 0,
            mimeType: this.activeMimeType || 'video/webm',
            createdAt: Date.now(),
            blobUrl: null,
            headerBlob: null,
            preRollDuration: 0
        };

        const headerChunk = sessionChunks.find(chunk => chunk.isSessionHeader);
        if (headerChunk && headerChunk.blob) {
            session.headerBlob = headerChunk.blob;
        } else if (this.currentSessionHeaderBlob) {
            session.headerBlob = this.currentSessionHeaderBlob;
        }

        sessionChunks.forEach(chunk => {
            chunk.sessionId = sessionId;
        });
        session.absoluteStart = sessionChunks[0]?.absoluteStart ?? this.lifetimeRecordedDuration;
        session.absoluteEnd = sessionChunks[sessionChunks.length - 1]?.absoluteEnd ?? session.absoluteStart;
        session.visibleStartAbs = session.absoluteStart;
        session.visibleEndAbs = session.absoluteEnd;
        this.refreshSessionBounds(session);

        this.recordedSessions.push(session);
        this.sessionMap.set(sessionId, session);

        this.currentSessionChunks = [];
        this.currentSessionStartMs = null;
        this.currentSessionId = null;
        this._lastChunkTimestamp = null;
        this.pendingSessionId = sessionId;
        this.pendingSessionChunks = [];
        this.currentSessionHeaderBlob = null;

        this.recomputeSessionBoundaries();
        this.trimBufferToMaxDuration();
        this.allSessions = [...this.recordedSessions];
        this.enforceRollingBuffer();
        this.lastFinalizedSessionId = sessionId;
        this.updateDebugPanel();
        this.updateTimeline();
        this.debugLogState('save:end', { newSessionId: sessionId });
    }

    // Drop whole finalized segments (oldest first) that fall outside the retained window.
    // Because every segment is a self-contained WebM, removing entire segments keeps each surviving
    // segment decodable — unlike chunk-granular eviction, which strips a segment's header.
    dropOldestSessionsToFit() {
        const keep = Number.isFinite(this.maxDuration) ? Math.max(0, this.maxDuration) : 0;
        if (keep <= 0) {
            return false;
        }
        let changed = false;
        while (this.recordedSessions.length > 0) {
            const oldest = this.recordedSessions[0];
            if (!oldest) {
                break;
            }
            // Never drop the segment currently being recorded.
            if (oldest.id === this.currentSessionId) {
                break;
            }
            const oldestDuration = oldest.duration || 0;
            // Stop once dropping the oldest segment would leave us below the retained window.
            if (this._bufferedDuration - oldestDuration < keep) {
                break;
            }
            this.dropSessionCompletely(oldest);
            changed = true;
        }
        return changed;
    }

    // Remove a whole session and all of its chunks from the rolling buffer.
    dropSessionCompletely(session) {
        if (!session) {
            return;
        }
        const ids = new Set((session.chunks || []).map(chunk => chunk.id));
        if (ids.size > 0) {
            this.chunkBuffer = this.chunkBuffer.filter(chunk => {
                if (ids.has(chunk.id)) {
                    this._bufferedDuration = Math.max(0, this._bufferedDuration - (chunk.duration || 0));
                    chunk.blob = null;
                    return false;
                }
                return true;
            });
        }
        this.sessionMap.delete(session.id);
        this.recordedSessions = this.recordedSessions.filter(s => s !== session);
        if (this.pendingSessionId === session.id) {
            this.pendingSessionId = null;
            this.pendingSessionChunks = [];
        }
        if (session.blobUrl) {
            try { URL.revokeObjectURL(session.blobUrl); } catch (e) { /* noop */ }
            session.blobUrl = null;
        }
        session.headerBlob = null;
    }

    enforceRollingBuffer() {
        const maxBufferedDuration = this.getMaxBufferedDuration();
        if (!Number.isFinite(maxBufferedDuration) || maxBufferedDuration <= 0) {
            return;
        }

        // Primary path: drop whole self-contained segments. This keeps the buffer at or below the
        // retained window so the chunk-granular fallback below stays dormant during normal recording.
        let removedAny = this.dropOldestSessionsToFit();

        while (this._bufferedDuration > maxBufferedDuration && this.chunkBuffer.length > 0) {
            const removed = this.chunkBuffer.shift();
            removedAny = true;
            const duration = removed?.duration || 0;
            this._bufferedDuration = Math.max(0, this._bufferedDuration - duration);

            if (removed && removed.isSessionHeader && removed.sessionId === this.currentSessionId && !this.currentSessionHeaderBlob && removed.blob) {
                this.currentSessionHeaderBlob = removed.blob;
            }

            if (removed && this.currentSessionChunks.length > 0) {
                const before = this.currentSessionChunks.length;
                this.currentSessionChunks = this.currentSessionChunks.filter(chunk => chunk.id !== removed.id);
                if (before !== this.currentSessionChunks.length) {
                    this.debugLogState('enforce:trim-current', { removedChunkId: removed.id });
                }
            }

            let preservedHeader = false;
            if (removed && removed.sessionId) {
                const session = this.sessionMap.get(removed.sessionId);
                const removedBlob = removed.blob;
                if (session && removed.isSessionHeader && removedBlob && !session.headerBlob) {
                    session.headerBlob = removedBlob;
                    preservedHeader = true;
                }
                if (session) {
                    if (session.chunks && session.chunks.length > 0) {
                        if (session.chunks[0].id === removed.id) {
                            session.chunks.shift();
                } else {
                            session.chunks = session.chunks.filter(chunk => chunk.id !== removed.id);
                        }
                    }
                    this.refreshSessionBounds(session);
                    if ((session.duration || 0) <= 0) {
                        session._remove = true;
                        this.sessionMap.delete(session.id);
                    } else {
                        session._dirty = true;
                    }
                }
            }

            if (removed) {
                if (this.pendingSessionChunks.length > 0) {
                    this.pendingSessionChunks = this.pendingSessionChunks.filter(chunk => chunk.id !== removed.id);
                    if (this.pendingSessionChunks.length === 0 && this.pendingSessionId === removed.sessionId) {
                        this.finalizePendingSession();
                    }
                }
                if (!preservedHeader) {
                    removed.blob = null;
                }
            }
        }

        if (removedAny) {
            this.recordedSessions = this.recordedSessions.filter(session => {
                if (session._remove) {
                    if (this.pendingSessionId === session.id) {
                        this.pendingSessionId = null;
                        this.pendingSessionChunks = [];
                    }
                    if (session.blobUrl) {
                        try { URL.revokeObjectURL(session.blobUrl); } catch (e) { /* noop */ }
                        session.blobUrl = null;
                    }
                    session.headerBlob = null;
                    return false;
                }
                if (session._dirty) {
                    this.refreshSessionBounds(session);
                    session.playableDuration = session.duration;
                    delete session._dirty;
                }
                return (session.duration || 0) > 0;
            });

            this.recomputeSessionBoundaries();
            this.allSessions = [...this.recordedSessions];

            if (this.currentFlashbackIndex >= this.recordedSessions.length) {
                this.currentFlashbackIndex = Math.max(0, this.recordedSessions.length - 1);
            }

            this.updateDebugPanel();
            this.updateTimeline();
            if (this.recordedSessions.length > 0) {
                this.lastFinalizedSessionId = this.recordedSessions[this.recordedSessions.length - 1].id;
            } else {
                this.lastFinalizedSessionId = null;
            }
        }
    }

    recomputeSessionBoundaries() {
        this.updatePreRollStateFromBuffer();

        let cumulative = 0;
        const newBoundaries = [];
        const cleanedSessions = [];
        let globalVisibleStart = null;
        let globalVisibleEnd = null;

        for (const session of this.recordedSessions) {
            if (!session.chunks || session.chunks.length === 0) {
                if (this.pendingSessionId === session.id) {
                    this.pendingSessionId = null;
                    this.pendingSessionChunks = [];
                }
                this.sessionMap.delete(session.id);
                continue;
            }

            const visibleDuration = session.duration || 0;
            session.playableDuration = visibleDuration;

            if (visibleDuration <= 0) {
                this.sessionMap.delete(session.id);
                continue;
            }

            session.startTime = cumulative;
            cumulative += visibleDuration;
            session.endTime = cumulative;

            cleanedSessions.push(session);
            newBoundaries.push(cumulative);

            const sessionVisibleStart = session.visibleStartAbs ?? session.absoluteStart ?? 0;
            const sessionVisibleEnd = session.visibleEndAbs ?? sessionVisibleStart;
            if (globalVisibleStart === null || sessionVisibleStart < globalVisibleStart) {
                globalVisibleStart = sessionVisibleStart;
            }
            if (globalVisibleEnd === null || sessionVisibleEnd > globalVisibleEnd) {
                globalVisibleEnd = sessionVisibleEnd;
            }
        }

        this.recordedSessions = cleanedSessions;
        this.sessionBoundaries = newBoundaries;
        this.visibleWindowStart = globalVisibleStart ?? this.lifetimeRecordedDuration;
        this.visibleWindowEnd = globalVisibleEnd ?? this.visibleWindowStart;
        this.visibleWindowDuration = Math.max(0, this.visibleWindowEnd - this.visibleWindowStart);
        this.totalRecordedTime = Math.min(this.visibleWindowDuration, this.maxDuration);
    }

    showMessage(text, type) {
        /**
         * Display a message using the unified overlay system
         * @param {string} text - Message text
         * @param {string} type - Message type: 'error', 'success', 'info'
         */
        // Map 'info' type to overlay (no separate info message zone exists)
        const overlayType = type === 'info' ? 'info' : type;
        this.showOverlayMessage(text, overlayType);
    }

    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    formatClockTime(ms) {
        if (!ms) return '—';
        const date = new Date(ms);
        try {
            return date.toLocaleTimeString('fr-FR', { hour12: false });
        } catch (e) {
            return date.toTimeString().split(' ')[0];
        }
    }

    debugLogState(label, extra = {}) {
        try {
            const sessionsSnapshot = this.recordedSessions.map((s, idx) => ({
                idx,
                id: s.id,
                duration: Number((s.duration || 0).toFixed(2)),
                chunkCount: s.chunkCount,
                start: Number((s.startTime || 0).toFixed(2)),
                end: Number((s.endTime || 0).toFixed(2))
            }));
            console.log(`[debug:${label}]`, {
                buffered: Number(this._bufferedDuration.toFixed(2)),
                maxDuration: this.maxDuration,
                lifetimeRecordedDuration: Number(this.lifetimeRecordedDuration.toFixed(2)),
                chunkBufferLength: this.chunkBuffer.length,
                pendingSessionId: this.pendingSessionId,
                pendingChunks: this.pendingSessionChunks.length,
                totalRecordedTime: Number(this.totalRecordedTime.toFixed(2)),
                sessions: sessionsSnapshot,
                ...extra
            });
        } catch (e) {
            console.warn('[debug:error logging state]', e);
        }
    }

    finalizePendingSession() {
        this.debugLogState('finalize:start');
        if (!this.pendingSessionId) return;
        const pendingId = this.pendingSessionId;
        const session = this.sessionMap.get(pendingId);
        if (session) {
            this.refreshSessionBounds(session);
            session.playableDuration = session.duration;
            this.lastFinalizedSessionId = session.id;
        }
        this.pendingSessionId = null;
        this.pendingSessionChunks = [];
        this.recomputeSessionBoundaries();
        this.trimBufferToMaxDuration();
        this.enforceRollingBuffer();
        this.updateDebugPanel();
        this.updateTimeline();
        this.debugLogState('finalize:end');
    }
    trimBufferToMaxDuration() {
        console.log('trimBufferToMaxDuration: Trimming buffers', {
            beforeCurrentSession: this.currentSessionChunks ? this.currentSessionChunks.length : 0,
            beforeChunkBuffer: this.chunkBuffer ? this.chunkBuffer.length : 0
        });
        let changed = false;
        this.debugLogState('trim:start');
        const maxBufferedDuration = this.getMaxBufferedDuration();
        if (!Number.isFinite(maxBufferedDuration) || maxBufferedDuration <= 0) {
            this.debugLogState('trim:skip-invalid-max', { maxBufferedDuration });
            return;
        }
        // Prefer dropping whole self-contained segments; this keeps the buffer at/under the retained
        // window so the chunk-granular loop below (which would strip a segment header) stays dormant.
        if (this.dropOldestSessionsToFit()) {
            changed = true;
        }
        while (this._bufferedDuration > maxBufferedDuration && this.chunkBuffer.length > 0) {
            const oldest = this.chunkBuffer.shift();
            if (!oldest) {
                break;
            }
            const reduction = oldest.duration || 0;
            if (reduction <= 0) {
                this.debugLogState('trim:skip-zero-duration', { chunkId: oldest.id });
                continue;
            }
            changed = true;
            this._bufferedDuration = Math.max(0, this._bufferedDuration - reduction);

            if (this.currentSessionChunks.length > 0) {
                const before = this.currentSessionChunks.length;
                this.currentSessionChunks = this.currentSessionChunks.filter(chunk => chunk.id !== oldest.id);
                if (before !== this.currentSessionChunks.length) {
                    this.debugLogState('trim:trim-current', { removedChunkId: oldest.id });
                }
            }

            const session = oldest.sessionId ? this.sessionMap.get(oldest.sessionId) : null;
            const chunkBlob = oldest.blob;
            let preservedHeader = false;
            if (oldest.isSessionHeader && oldest.sessionId === this.currentSessionId && !this.currentSessionHeaderBlob && chunkBlob) {
                this.currentSessionHeaderBlob = chunkBlob;
                preservedHeader = true;
            }
            if (session && oldest.isSessionHeader && chunkBlob && !session.headerBlob) {
                session.headerBlob = chunkBlob;
                preservedHeader = true;
            }
            if (session && session.chunks) {
                session.chunks = session.chunks.filter(chunk => chunk.id !== oldest.id);
                this.refreshSessionBounds(session);
                if ((session.duration || 0) <= 0) {
                    session._remove = true;
                } else {
                    session._dirty = true;
                }
            }

            if (this.pendingSessionChunks.length > 0) {
                this.pendingSessionChunks = this.pendingSessionChunks.filter(chunk => chunk.id !== oldest.id);
                if (this.pendingSessionChunks.length === 0 && this.pendingSessionId === oldest.sessionId) {
                    this.pendingSessionId = null;
                }
            }

            if (!preservedHeader) {
                oldest.blob = null;
            }
        }
        if (changed) {
            this.recomputeSessionBoundaries();
            this.allSessions = [...this.recordedSessions];
            this.updateDebugPanel();
            this.updateTimeline();
            this.debugLogState('trim:end:changed');
        } else {
            this.debugLogState('trim:end:unchanged');
        }
    }

    updatePreRollStateFromBuffer() {
        let remainingVisible = this.maxDuration;
        if (!Number.isFinite(remainingVisible) || remainingVisible <= 0) {
            remainingVisible = 0;
        }
        for (let i = this.chunkBuffer.length - 1; i >= 0; i--) {
            const chunk = this.chunkBuffer[i];
            if (!chunk) continue;
            const duration = chunk.duration || 0;
            if (remainingVisible > 0) {
                chunk.isPreRoll = false;
                remainingVisible = Math.max(0, remainingVisible - duration);
            } else {
                chunk.isPreRoll = true;
            }
        }

        for (const session of this.recordedSessions) {
            this.refreshSessionBounds(session);
        }
    }

    updateTimeline() {
        // Note: this function can be called in any state.
        // In 'recordingStopped' or 'transitioning' state, it will simply display the timeline
        // with the available data (total duration recorded, etc.).
        // The timeline remains visible even when recording is stopped.

        // Timestamp for diagnosing update frequency
        const timestamp = new Date().toISOString();

        const lifetimeDuration = this.lifetimeRecordedDuration;
        const isRecording = this.state === 'recording';
        const isFlashback = this.state === 'flashback';
        const isFlashbackPaused = this.state === 'flashbackPaused';

        let windowStart;
        let windowEnd;

        if (isRecording) {
            windowEnd = lifetimeDuration;
            windowStart = Math.max(0, windowEnd - this.maxDuration);
        } else {
            windowStart = this.visibleWindowStart ?? 0;
            windowEnd = this.visibleWindowEnd ?? windowStart;
        }

        const windowDuration = Math.max(windowEnd - windowStart, 0);
        this.visibleWindowStart = windowStart;
        this.visibleWindowEnd = windowEnd;
        this.visibleWindowDuration = windowDuration;
        this.totalRecordedTime = Math.min(windowDuration, this.maxDuration);
        const markersPruned = this.pruneFlashbackMarkers(windowStart, windowEnd);

        const currentAbsolute = this.getCurrentAbsoluteTime();

        // Update the green bar (progress)
        const effectiveBarWidthPercent = this.getEffectiveBarWidthPercent();
        this.timelineProgress.style.width = `${effectiveBarWidthPercent}%`;

        const windowStartDisplay = (isRecording || isFlashbackPaused)
            ? Math.max(0, lifetimeDuration - this.maxDuration)
            : windowStart;
        if (this.timeStart) {
            this.timeStart.textContent = this.formatTime(windowStartDisplay);
        }

        const windowEndDisplay = (isRecording || isFlashbackPaused)
            ? Math.max(this.maxDuration, lifetimeDuration)
            : (this.lifetimeRecordedDuration <= this.maxDuration ? this.maxDuration : lifetimeDuration);
        if (this.timeEnd) {
            this.timeEnd.textContent = this.formatTime(windowEndDisplay);
        }

        const windowWidth = Math.max(windowDuration, 0.0001);

        if (this.timeLifetime) {
            const lifetimeDisplay = Math.max(0, lifetimeDuration);
            if (lifetimeDisplay > this.maxDuration) {
                const totalText = this.formatDuration(lifetimeDisplay);
                const preservedText = this.formatDuration(this.maxDuration);
                this.timeLifetime.textContent = `Total recorded: ${totalText} - only the last ${preservedText} are preserved`;
                this.timeLifetime.style.display = '';
            } else {
                this.timeLifetime.style.display = 'none';
            }
        }

        // timeCurrent (user requirement):
        if (isRecording) {
            this.timeCurrent.style.display = '';
            this.timeCurrent.textContent = this.formatTime(Math.max(0, Math.floor(lifetimeDuration)));
        } else if (isFlashback || isFlashbackPaused) {
            this.timeCurrent.style.display = '';
            this.timeCurrent.textContent = this.formatTime(Math.max(0, Math.floor(currentAbsolute)));
        } else {
            this.timeCurrent.style.display = 'none';
        }

        // Red cursor: position relative to the visible window and bounded by the green width
        const cursorRelative = windowDuration > 0
            ? (currentAbsolute - windowStart) / windowDuration
            : 0;
        const clamped = Math.max(0, Math.min(1, cursorRelative));
        const leftWithinGreen = clamped * effectiveBarWidthPercent;
        this.timelinePosition.style.display = (isRecording || isFlashback || isFlashbackPaused) ? 'block' : 'none';
        this.timelinePosition.style.left = `${leftWithinGreen}%`;

        this.renderFlashbackMarkers(windowStart, windowEnd, windowDuration, effectiveBarWidthPercent);
        if (markersPruned) {
            this.updateMarkerControls();
        }

        // Waveform is now rendered independently at 100ms intervals in analyzeAudioWaveform()
        // No need to render here - it would conflict with the real-time rendering

        // Photo timeline is now rendered independently at 100ms intervals in startPhotoTimelineRefresh()
        // No need to render here - it would conflict with the real-time rendering
    }

    async handleTimelineClick(e) {
    /**
     * Handles clicks on the timeline to trigger flashbacks.
     * Calculates the target timestamp and starts flashback with recording stop handling.
     */
        if (this.state === 'transitioning') {
            return;
        }

        const rect = this.timelineBar.getBoundingClientRect(); // Coordinates of the green bar rectangle
        const x = e.clientX - rect.left;

        // Use unified calculation function
        const targetTime = this.calculateTargetTimeFromClick(x, rect, true);

        // Unified flashback navigation with validation
        await this.seekFlashback(targetTime, {
            allowFromRecording: true,
            allowFromRecordingStopped: true,
            allowFromFlashbackPaused: true
        });
    }

    // === FLASHBACK PLAYBACK (MediaSource) ===
    // The retained segments are self-contained WebM files. Stitching them into a single MediaSource
    // SourceBuffer (mode 'sequence') yields ONE continuous, gapless timeline with a real finite
    // duration — no per-segment reload seams and no reliance on the unknown per-blob duration.
    // A small map converts between absolute recording time and MediaSource time.

    async playFlashbackFromTimestamp(timestamp) {
        if (!Number.isFinite(timestamp)) {
            timestamp = 0;
        }
        // seekFlashback bumped _flashbackId; capture it so async work can detect interruption.
        const fbId = this._flashbackId;
        const sessions = this.recordedSessions || [];
        if (sessions.length === 0) {
            return;
        }
        this.allSessions = [...sessions];

        // (Re)build the windowed MediaSource when there isn't a usable one, the segment set changed,
        // or the requested time falls outside the currently-buffered run. Back/forward presses that
        // stay inside the buffered run reuse it and just re-seek; larger jumps rebuild the window
        // around the new target.
        const needRebuild = !this._mse || !this._mse.ready
            || this._mse.segCount !== sessions.length
            || !this._fbTargetInRun(this._mse, timestamp);
        if (needRebuild) {
            this.clearFlashbackMonitors();
            this._teardownMse();
            // Attach the video element up front: a MediaSource only fires 'sourceopen' once it is
            // bound to a media element, so _buildFlashbackMediaSource needs the element ready.
            this.flashbackVideo = this.videoPreview;
            this.videoPreview.srcObject = null;
            this.videoPreview.muted = false;
            const built = await this._buildFlashbackMediaSource(sessions, timestamp);
            if (this._flashbackId !== fbId) {
                // A newer flashback superseded this one while we were building.
                this._teardownMse(built);
                return;
            }
            if (!built) {
                this.showMessage('Flashback playback error', 'error');
                this._teardownMse();
                this.flashbackVideo = null;
                this.previousAbsoluteTime = null;
                this.setState('recordingStopped');
                this.resumeRecording();
                return;
            }
            this._mse = built;
            this.updateFlashbackVideoAudioOutput(this.currentAudioOutputDeviceId || 'default');
        }

        // Position the single timeline at the requested absolute time.
        const mseTime = this._absToMse(timestamp);
        try {
            this.flashbackVideo.currentTime = mseTime;
        } catch (e) {
            try { this.flashbackVideo.currentTime = 0; } catch (e2) { /* noop */ }
        }
        this._syncFlashbackIndex(timestamp);

        // (Re)wire the handlers for this flashback id, transition state, and play.
        this._attachFlashbackHandlers(fbId);
        this.setState('flashback');
        this.updateUIForFlashback();
        this.updateDebugPanel();
        this.startTimer();
        this.stopPhotoExtraction();
        this.stopPhotoTimelineRefresh();

        // Keep the sliding window fed ahead of / evicted behind the play head for this flashback.
        this._pumpFlashback(fbId);

        const tryPlay = () => this.flashbackVideo && this.flashbackVideo.play();
        Promise.resolve()
            .then(tryPlay)
            .catch(() => {
                // A rejected play() (e.g. transient autoplay/power-save interruption) shouldn't kill
                // the flashback — retry once; if it still fails, stay paused in flashback.
                if (this._flashbackId !== fbId) return;
                return Promise.resolve().then(tryPlay).catch(() => {});
            });
    }

    // Bounds for the on-demand buffered window. Appending every retained segment into one SourceBuffer
    // overruns the browser's SourceBuffer memory quota (~150 MB) once the retained window gets large,
    // which made flashback fail with QuotaExceededError on long sessions. We keep only a bounded run of
    // consecutive segments around the play head instead.
    static get FB_BYTE_BUDGET() { return 96 * 1024 * 1024; } // stay well under the ~150 MB SB quota
    static get FB_PREFETCH_AHEAD() { return 12; } // seconds of lead to keep appended ahead of the head
    static get FB_KEEP_BEHIND() { return 20; }    // seconds to retain behind the head before evicting

    // Lazily build (and cache) the concatenated, self-contained WebM blob for one retained segment.
    _fbEntryBlob(entry) {
        if (!entry.blob) {
            entry.blob = this.buildFlashbackSessionBlob(entry.session);
        }
        return entry.blob;
    }

    // Append the segment at entries[idx], extending the buffered run forward. Returns true on success.
    // A synchronous QuotaExceededError from appendBuffer propagates to the caller (which evicts + retries).
    async _fbAppend(ctx, idx) {
        const entry = ctx.entries[idx];
        const blob = this._fbEntryBlob(entry);
        if (!blob || blob.size === 0) { ctx.hiIdx = idx; return false; }
        const buffer = await blob.arrayBuffer();
        const sb = ctx.sourceBuffer;
        await new Promise((res, rej) => {
            const onOk = () => { cleanup(); res(); };
            const onErr = () => { cleanup(); rej(new Error('append-error')); };
            const cleanup = () => { sb.removeEventListener('updateend', onOk); sb.removeEventListener('error', onErr); };
            sb.addEventListener('updateend', onOk, { once: true });
            sb.addEventListener('error', onErr, { once: true });
            sb.appendBuffer(buffer); // may throw QuotaExceededError synchronously
        });
        const mseStart = ctx.mseCursor;
        const mseEnd = sb.buffered.length ? sb.buffered.end(sb.buffered.length - 1) : mseStart;
        ctx.segMap.push({ idx, absStart: entry.absStart, absEnd: entry.absEnd, mseStart, mseEnd });
        ctx.mseCursor = mseEnd;
        ctx.totalMse = mseEnd;
        ctx.bytesBuffered += blob.size;
        ctx.hiIdx = idx;
        return true;
    }

    // Drop the oldest buffered segment(s) to reclaim memory. Never evicts within FB_KEEP_BEHIND of the
    // play head, and always leaves at least one segment buffered.
    async _fbEvictFront(ctx, playAbs) {
        while (ctx.bytesBuffered > FlashbackRecorder.FB_BYTE_BUDGET
               && ctx.segMap.length > 1
               && ctx.segMap[0].absEnd < playAbs - FlashbackRecorder.FB_KEEP_BEHIND) {
            const seg = ctx.segMap[0];
            const sb = ctx.sourceBuffer;
            try {
                await new Promise((res) => {
                    sb.addEventListener('updateend', res, { once: true });
                    sb.remove(seg.mseStart, seg.mseEnd);
                });
            } catch (e) { break; }
            const entry = ctx.entries[seg.idx];
            ctx.bytesBuffered -= (entry.blob ? entry.blob.size : 0);
            entry.blob = null; // free the concatenated blob
            ctx.loIdx = seg.idx + 1;
            ctx.segMap.shift();
        }
    }

    // Is the absolute time t inside the currently-buffered run?
    _fbTargetInRun(ctx, t) {
        return !!(ctx && ctx.ready && ctx.segMap.length > 0
            && t >= ctx.segMap[0].absStart - 0.05
            && t <= ctx.segMap[ctx.segMap.length - 1].absEnd + 0.05);
    }

    // Maintain the buffered window for the active flashback: prefetch ahead of the play head, evict
    // behind, and finalise the stream once the last segment is buffered. Re-entrancy-guarded and kicked
    // from the timeupdate/waiting handlers; every step is gated on fbId so a superseded flashback stops.
    async _pumpFlashback(fbId) {
        const ctx = this._mse;
        if (!ctx || ctx._pumping || this._flashbackId !== fbId) return;
        ctx._pumping = true;
        try {
            const video = this.flashbackVideo;
            while (this._flashbackId === fbId && ctx.ready) {
                const headMse = video ? (video.currentTime || 0) : 0;
                const playAbs = video ? this._mseToAbs(headMse) : ctx.windowStartAbs;
                await this._fbEvictFront(ctx, playAbs);
                if (this._flashbackId !== fbId) break;
                const needAhead = (ctx.mseCursor - headMse) < FlashbackRecorder.FB_PREFETCH_AHEAD
                                  || ctx.bytesBuffered < FlashbackRecorder.FB_BYTE_BUDGET;
                if (ctx.hiIdx < ctx.lastIdx && needAhead
                    && ctx.bytesBuffered < FlashbackRecorder.FB_BYTE_BUDGET) {
                    try {
                        await this._fbAppend(ctx, ctx.hiIdx + 1);
                    } catch (e) {
                        // Out of SourceBuffer room: drop behind the head and try again next tick.
                        await this._fbEvictFront(ctx, playAbs);
                        break;
                    }
                    continue;
                }
                if (ctx.hiIdx >= ctx.lastIdx && !ctx.endedStream) {
                    try { ctx.mediaSource.endOfStream(); } catch (e) { /* noop */ }
                    ctx.endedStream = true;
                }
                break;
            }
        } finally {
            ctx._pumping = false;
        }
    }

    // Build a MediaSource holding a bounded window of segments around targetAbs: one segment behind
    // (smooth small rewinds) then forward until the byte budget is hit. The pump keeps it fed/evicted
    // as playback proceeds. Returns a context or null if even the minimal window could not be built.
    async _buildFlashbackMediaSource(sessions, targetAbs = 0) {
        const entries = sessions
            .filter(s => s && Array.isArray(s.chunks) && s.chunks.length > 0)
            .map(s => ({
                session: s,
                absStart: s.absoluteStart ?? s.visibleStartAbs ?? 0,
                absEnd: s.absoluteEnd ?? s.visibleEndAbs ?? (s.absoluteStart ?? 0),
                blob: null
            }))
            .sort((a, b) => a.absStart - b.absStart);
        if (entries.length === 0) {
            return null;
        }
        const mime = entries[0].session.mimeType || this.activeMimeType || 'video/webm';
        if (!(window.MediaSource && MediaSource.isTypeSupported(mime))) {
            return null;
        }
        const mediaSource = new MediaSource();
        const objectUrl = URL.createObjectURL(mediaSource);
        const ctx = {
            mediaSource, objectUrl, sourceBuffer: null, mime,
            entries, segCount: sessions.length, lastIdx: entries.length - 1,
            loIdx: 0, hiIdx: -1, segMap: [], mseCursor: 0, bytesBuffered: 0,
            totalMse: 0, endedStream: false, _pumping: false,
            windowStartAbs: entries[0].absStart,
            windowEndAbs: entries[entries.length - 1].absEnd,
            ready: false
        };

        // Bind the MediaSource to the video element so 'sourceopen' fires.
        this.videoPreview.srcObject = null;
        this.videoPreview.src = objectUrl;
        try { this.videoPreview.load(); } catch (e) { /* noop */ }

        const opened = await new Promise((resolve) => {
            const timeout = setTimeout(() => resolve(false), 5000); // give up rather than hang
            mediaSource.addEventListener('sourceopen', () => { clearTimeout(timeout); resolve(true); }, { once: true });
        });
        if (!opened) {
            try { URL.revokeObjectURL(objectUrl); } catch (e) { /* noop */ }
            return null;
        }

        try {
            const sb = mediaSource.addSourceBuffer(mime);
            sb.mode = 'sequence'; // place each segment right after the previous one
            ctx.sourceBuffer = sb;

            let targetIdx = entries.findIndex(e => targetAbs <= e.absEnd + 0.05);
            if (targetIdx < 0) targetIdx = entries.length - 1;
            const startIdx = Math.max(0, targetIdx - 1); // one segment of rewind headroom

            // Mandatory: cover startIdx..targetIdx so the requested position is immediately playable.
            for (let i = startIdx; i <= targetIdx; i++) {
                await this._fbAppend(ctx, i);
            }
            ctx.ready = ctx.segMap.length > 0;
            // Prefetch forward up to the byte budget; the pump extends further during playback.
            let i = targetIdx + 1;
            while (i <= ctx.lastIdx && ctx.bytesBuffered < FlashbackRecorder.FB_BYTE_BUDGET) {
                await this._fbAppend(ctx, i);
                i++;
            }
            ctx.loIdx = ctx.segMap.length ? ctx.segMap[0].idx : 0;
            if (ctx.hiIdx >= ctx.lastIdx) {
                try { mediaSource.endOfStream(); } catch (e) { /* noop */ }
                ctx.endedStream = true;
            }
        } catch (e) {
            // A QuotaExceededError this early means even the minimal window didn't fit — bail out.
        }

        if (!ctx.ready) {
            try { URL.revokeObjectURL(objectUrl); } catch (e) { /* noop */ }
            return null;
        }
        return ctx;
    }

    // Convert an absolute recording timestamp to a position on the MediaSource timeline. Operates on
    // the currently-buffered run; callers ensure the target lies within it before seeking.
    _absToMse(absTime) {
        const ctx = this._mse;
        if (!ctx || ctx.segMap.length === 0) {
            return 0;
        }
        const runStart = ctx.segMap[0].absStart;
        const runEnd = ctx.segMap[ctx.segMap.length - 1].absEnd;
        const clamped = Math.max(runStart, Math.min(absTime, runEnd));
        for (const seg of ctx.segMap) {
            if (clamped <= seg.absEnd) {
                const absSpan = seg.absEnd - seg.absStart;
                const frac = absSpan > 0 ? (clamped - seg.absStart) / absSpan : 0;
                return seg.mseStart + Math.max(0, Math.min(1, frac)) * (seg.mseEnd - seg.mseStart);
            }
        }
        return ctx.mseCursor;
    }

    // Convert a MediaSource timeline position back to an absolute recording timestamp (loaded run).
    _mseToAbs(mseTime) {
        const ctx = this._mse;
        if (!ctx || ctx.segMap.length === 0) {
            return this.visibleWindowEnd ?? this.lifetimeRecordedDuration ?? 0;
        }
        for (const seg of ctx.segMap) {
            if (mseTime <= seg.mseEnd) {
                const mseSpan = seg.mseEnd - seg.mseStart;
                const frac = mseSpan > 0 ? (mseTime - seg.mseStart) / mseSpan : 0;
                return seg.absStart + Math.max(0, Math.min(1, frac)) * (seg.absEnd - seg.absStart);
            }
        }
        return ctx.segMap[ctx.segMap.length - 1].absEnd;
    }

    // Keep currentFlashbackIndex aligned with the played position (debug panel highlight). Indexes the
    // full entry list, not just the buffered run.
    _syncFlashbackIndex(absTime) {
        const ctx = this._mse;
        if (!ctx) return;
        const entries = ctx.entries || [];
        for (let i = 0; i < entries.length; i++) {
            if (absTime <= entries[i].absEnd) { this.currentFlashbackIndex = i; return; }
        }
        this.currentFlashbackIndex = Math.max(0, entries.length - 1);
    }

    // Attach the timeupdate/ended/error handlers for the flashback identified by fbId.
    _attachFlashbackHandlers(fbId) {
        const video = this.flashbackVideo;
        if (!video) return;
        this._detachFlashbackHandlers();

        this._timeupdateHandler = () => {
            if (this._flashbackId !== fbId) { this._detachFlashbackHandlers(); return; }
            this._syncFlashbackIndex(this._mseToAbs(video.currentTime || 0));
            this.updateTimeline();
            this.updateAllPlaybackPositions();
            this._pumpFlashback(fbId); // feed the window ahead / evict behind as playback advances
        };
        this._onEndedHandler = () => {
            if (this._flashbackId !== fbId) return;
            // Reached the live edge of the retained window — hand back to live recording.
            this.resumeRecordingAfterFlashback();
        };
        this._onErrorHandler = () => {
            if (this._flashbackId !== fbId) return;
            this.showMessage('Flashback playback error', 'error');
            this.resumeRecordingAfterFlashback();
        };
        // If playback outruns the buffered window, feed it more rather than stalling.
        this._onWaitingHandler = () => {
            if (this._flashbackId !== fbId) return;
            this._pumpFlashback(fbId);
        };
        video.addEventListener('timeupdate', this._timeupdateHandler);
        video.addEventListener('ended', this._onEndedHandler);
        video.addEventListener('error', this._onErrorHandler);
        video.addEventListener('waiting', this._onWaitingHandler);
    }

    _detachFlashbackHandlers() {
        const video = this.flashbackVideo;
        if (video) {
            if (this._timeupdateHandler) video.removeEventListener('timeupdate', this._timeupdateHandler);
            if (this._onEndedHandler) video.removeEventListener('ended', this._onEndedHandler);
            if (this._onErrorHandler) video.removeEventListener('error', this._onErrorHandler);
            if (this._onWaitingHandler) video.removeEventListener('waiting', this._onWaitingHandler);
        }
        this._timeupdateHandler = null;
        this._onEndedHandler = null;
        this._onErrorHandler = null;
        this._onWaitingHandler = null;
    }

    // Tear down a MediaSource context and release its object URL.
    _teardownMse(ctx = this._mse) {
        if (!ctx) return;
        try {
            if (ctx.mediaSource && ctx.mediaSource.readyState === 'open') {
                ctx.mediaSource.endOfStream();
            }
        } catch (e) { /* noop */ }
        try { URL.revokeObjectURL(ctx.objectUrl); } catch (e) { /* noop */ }
        if (ctx.entries) ctx.entries.forEach(e => { e.blob = null; }); // free windowed segment blobs
        if (ctx === this._mse) {
            this._mse = null;
        }
    }

    waitForRecorderStop() { // Wait for the recorder to stop (it just waits for the recorder to stop)
        return new Promise((resolve) => { 
            if (!this.mediaRecorder) { // If the recorder doesn't exist, resolve immediately
                resolve(); 
                return;
            }
            const state = this.mediaRecorder.state; // Check the recorder state
            if (state !== 'recording') { // If the recorder is not recording, resolve immediately
                resolve();
                return;
            }
            const handler = () => {
                this.mediaRecorder.removeEventListener('stop', handler); // Remove the listener once it's called
                resolve(); // Resolve the promise
            };
            this.mediaRecorder.addEventListener('stop', handler, { once: true }); // Add the listener once to prevent duplicates
        });
    }

    buildFlashbackSessionBlob(session) {
        if (!session || !Array.isArray(session.chunks) || session.chunks.length === 0) {
            this.debugLogState('buildBlob:empty-session', { sessionId: session?.id });
            return null;
        }
        const parts = [];
        const firstChunk = session.chunks[0];
        if (session.headerBlob && (!firstChunk || !firstChunk.isSessionHeader)) {
            parts.push(session.headerBlob);
        }
        session.chunks.forEach(chunk => {
            if (chunk && chunk.blob) {
                parts.push(chunk.blob);
            }
        });
        if (parts.length === 0) {
            this.debugLogState('buildBlob:no-parts', { sessionId: session?.id });
            return null;
        }
        const sizes = parts.map(part => part?.size || 0);
        this.debugLogState('buildBlob:assembled', {
            sessionId: session.id,
            chunkCount: session.chunks.length,
            partCount: parts.length,
            partSizes: sizes,
            totalSize: sizes.reduce((a, b) => a + b, 0),
            hasHeader: !!session.headerBlob,
            preRollDuration: Number((session.preRollDuration || 0).toFixed(2)),
            visibleDuration: Number((session.duration || 0).toFixed(2))
        });
        const mimeType = session.mimeType || this.activeMimeType || 'video/webm';
        return new Blob(parts, { type: mimeType });
    }

    // === INTERRUPTION/END OF PLAYBACK + RESUME RECORDING ===

    stopFlashbackAndResumeRecording() {
        if (this.state === 'flashback') {
            this.setState('recordingStopped');
            this.currentFlashbackIndex = 0;
            this.currentReferencePosition = null;
            this._finalizeFlashback = null;
            this.updateDebugPanel(); // Update panel to remove highlight from segment
            this.clearFlashbackMonitors();
            this._detachFlashbackHandlers();
            this._teardownMse();
            // Completely clean up the video element (flashbackVideo and videoPreview are the same reference)
            if (this.flashbackVideo) {
                this.flashbackVideo.pause();
                this.flashbackVideo.src = '';
                this.flashbackVideo.srcObject = null;
                try {
                    this.flashbackVideo.load(); // Force complete cleanup
                } catch (e) {
                }
            }
            // Clean up videoPreview but keep the stream (will be reattached in startRecording)
            if (this.videoPreview) {
                this.videoPreview.src = '';
                // DON'T set srcObject to null - keep the stream for resuming
            }
            this.flashbackVideo = null; // Reset reference
            this.allSessions.forEach(s => {
                if (s.blobUrl) {
                    try { URL.revokeObjectURL(s.blobUrl); } catch (e) { /* noop */ }
                    s.blobUrl = null;
                }
            });
            // Revoke deferred URLs
            if (this._pendingRevokes && this._pendingRevokes.length > 0) {
                this._pendingRevokes.forEach(url => {
                    try { URL.revokeObjectURL(url); } catch (e) { /* noop */ }
                });
                this._pendingRevokes = [];
            }
            this.allSessions = [];
            this.stopTimer();
            this.updateUIForRecordingStopped();
            // Note: resumeRecording() will call startRecording() which will restart audio keep-alive
            this.resumeRecording();
        }
    }

    // === CONFIG PANEL ===

    initConfigPanel() {
        // Apply saved mirror mode
        this.applyMirrorMode();
        if (this.configMirrorToggle) {
            this.configMirrorToggle.checked = this.mirrorMode;
            this.configMirrorToggle.addEventListener('change', () => {
                this.mirrorMode = this.configMirrorToggle.checked;
                this.applyMirrorMode();
                this.saveSettings();
            });
        }

        // Output device: setSinkId support detection
        const supportsSinkId = typeof HTMLMediaElement.prototype.setSinkId === 'function';
        if (this.configAudioOutputContent) {
            if (supportsSinkId) {
                const sel = document.createElement('select');
                sel.id = 'configAudioOutputSelect';
                sel.className = 'config-select';
                this.configAudioOutputContent.appendChild(sel);
                sel.addEventListener('change', () => {
                    this.handleOutputDeviceChange(sel.value);
                });
            } else {
                const info = document.createElement('p');
                info.className = 'config-audio-info';
                info.textContent = 'La sélection de la sortie audio n\'est pas disponible dans ce navigateur. Le son suit automatiquement la sortie par défaut de votre appareil.';
                this.configAudioOutputContent.appendChild(info);
            }
        }

        // Mic and camera selects
        if (this.configMicSelect) {
            this.configMicSelect.addEventListener('change', () => {
                this.handleMicDeviceChange(this.configMicSelect.value);
            });
        }
        if (this.configCameraSelect) {
            this.configCameraSelect.addEventListener('change', () => {
                this.handleCameraDeviceChange(this.configCameraSelect.value);
            });
        }

        // Populate once permissions are likely granted (after getUserMedia in startRecording)
        // Also attempt immediately in case we already have permission
        this.refreshConfigPanelDevices();
    }

    openConfigPanel() {
        if (!this.configPanel) return;
        this.configPanel.classList.add('open');
        // Refresh device list in case new devices were connected
        this.refreshConfigPanelDevices();
        // Attach camera preview
        if (this.configCameraPreview && this.stream) {
            this.configCameraPreview.srcObject = this.stream;
        }
        // Start vumeter
        this.startVuMeter();
    }

    closeConfigPanel() {
        if (!this.configPanel) return;
        this.configPanel.classList.remove('open');
        this.stopVuMeter();
        if (this.configCameraPreview) {
            this.configCameraPreview.srcObject = null;
        }
    }

    async refreshConfigPanelDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this._populateOutputSelect(devices.filter(d => d.kind === 'audiooutput'));
            this._populateSelect(this.configMicSelect, devices.filter(d => d.kind === 'audioinput'), this.currentAudioInputDeviceId);
            this._populateSelect(this.configCameraSelect, devices.filter(d => d.kind === 'videoinput'), null);
        } catch (err) {
            console.warn('Config panel: error enumerating devices', err);
        }
    }

    _populateOutputSelect(outputDevices) {
        const sel = document.getElementById('configAudioOutputSelect');
        if (!sel) return;
        const current = sel.value || this.currentAudioOutputDeviceId || 'default';
        sel.innerHTML = '';
        // "Default system" is always first
        const defOpt = document.createElement('option');
        defOpt.value = 'default';
        defOpt.textContent = 'Défaut du système';
        sel.appendChild(defOpt);
        for (const d of outputDevices) {
            if (d.deviceId === 'default') continue; // already covered above
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `Sortie ${sel.options.length}`;
            sel.appendChild(opt);
        }
        sel.value = current;
        if (!Array.from(sel.options).some(o => o.value === sel.value)) {
            sel.value = 'default';
        }
    }

    _populateSelect(selectEl, devices, currentId) {
        if (!selectEl) return;
        const prev = selectEl.value || currentId;
        selectEl.innerHTML = '';
        for (const d of devices) {
            const opt = document.createElement('option');
            opt.value = d.deviceId;
            opt.textContent = d.label || `Périphérique ${selectEl.options.length + 1}`;
            selectEl.appendChild(opt);
        }
        if (prev && Array.from(selectEl.options).some(o => o.value === prev)) {
            selectEl.value = prev;
        }
    }

    async handleOutputDeviceChange(deviceId) {
        this.currentAudioOutputDeviceId = deviceId;
        localStorage.setItem('preferredAudioOutputDeviceId', deviceId);
        if (this.audioOutputMonitor) this.audioOutputMonitor.setCurrentDevice(deviceId);
        await this.updateFlashbackVideoAudioOutput(deviceId);
        this.audioKeepAlive.updateSinkId(deviceId);
        const label = document.getElementById('configAudioOutputSelect')
            ?.options[document.getElementById('configAudioOutputSelect').selectedIndex]?.text || deviceId;
        this.showDeviceChangeOverlay(label, 'output');
    }

    async handleMicDeviceChange(deviceId) {
        if (!deviceId || deviceId === this.currentAudioInputDeviceId) return;
        const confirmed = window.confirm(
            'Changer de microphone va redémarrer l\'enregistrement. Le buffer actuel sera perdu. Continuer ?'
        );
        if (!confirmed) {
            // Revert select
            if (this.configMicSelect) this.configMicSelect.value = this.currentAudioInputDeviceId || '';
            return;
        }
        localStorage.setItem('preferredAudioInputDeviceId', deviceId);
        this.stopFlashbackAndResumeRecording();
    }

    async handleCameraDeviceChange(deviceId) {
        if (!deviceId) return;
        const confirmed = window.confirm(
            'Changer de caméra va redémarrer l\'enregistrement. Le buffer actuel sera perdu. Continuer ?'
        );
        if (!confirmed) return;
        localStorage.setItem('preferredVideoDeviceId', deviceId);
        this.stopFlashbackAndResumeRecording();
    }

    applyMirrorMode() {
        if (!this.videoPreview) return;
        this.videoPreview.style.transform = this.mirrorMode ? 'scaleX(-1)' : 'none';
    }

    startVuMeter() {
        if (!this.stream || !this.configVuMeter) return;
        try {
            this.vuMeterAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
            this.vuMeterAnalyser = this.vuMeterAudioCtx.createAnalyser();
            this.vuMeterAnalyser.fftSize = 256;
            this.vuMeterSource = this.vuMeterAudioCtx.createMediaStreamSource(this.stream);
            this.vuMeterSource.connect(this.vuMeterAnalyser);
            const data = new Uint8Array(this.vuMeterAnalyser.frequencyBinCount);
            const canvas = this.configVuMeter;
            const ctx = canvas.getContext('2d');
            const draw = () => {
                if (!this.vuMeterAnalyser) return;
                this.vuMeterAnimId = requestAnimationFrame(draw);
                this.vuMeterAnalyser.getByteFrequencyData(data);
                const avg = data.reduce((a, b) => a + b, 0) / data.length;
                const level = Math.min(avg / 128, 1);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
                grad.addColorStop(0, '#10B981');
                grad.addColorStop(0.7, '#F59E0B');
                grad.addColorStop(1, '#EF4444');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width * level, canvas.height);
            };
            draw();
        } catch (e) {
            console.warn('VuMeter: could not start', e);
        }
    }

    stopVuMeter() {
        if (this.vuMeterAnimId) {
            cancelAnimationFrame(this.vuMeterAnimId);
            this.vuMeterAnimId = null;
        }
        if (this.vuMeterSource) {
            try { this.vuMeterSource.disconnect(); } catch (e) { /* noop */ }
            this.vuMeterSource = null;
        }
        if (this.vuMeterAudioCtx) {
            try { this.vuMeterAudioCtx.close(); } catch (e) { /* noop */ }
            this.vuMeterAudioCtx = null;
        }
        this.vuMeterAnalyser = null;
        if (this.configVuMeter) {
            const ctx = this.configVuMeter.getContext('2d');
            ctx.clearRect(0, 0, this.configVuMeter.width, this.configVuMeter.height);
        }
    }

    resumeRecordingAfterFlashback() {
        // Reset previous position tracking when resuming recording
        this.previousAbsoluteTime = null;
        this.stopFlashbackAndResumeRecording();
    }

    getCurrentAbsoluteTime() {
        if (this.state === 'flashback' || this.state === 'flashbackPaused') {
            // The flashback plays a single stitched MediaSource timeline; map its position back to
            // absolute recording time.
            if (this._mse && this.flashbackVideo) {
                return this._mseToAbs(this.flashbackVideo.currentTime || 0);
            }
            const session = this.allSessions?.[this.currentFlashbackIndex];
            const sessionStartAbs = session?.visibleStartAbs ?? session?.absoluteStart ?? this.visibleWindowStart ?? 0;
            const flashbackOffset = this.flashbackVideo?.currentTime || 0;
            const preRoll = session?.preRollDuration || 0;
            const effectiveOffset = Math.max(0, flashbackOffset - preRoll);
            return sessionStartAbs + effectiveOffset;
        }

        if (this.state === 'recording') {
            return this.lifetimeRecordedDuration;
        }

        return this.visibleWindowEnd ?? this.lifetimeRecordedDuration ?? 0;
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    // Small delay to ensure all DOM elements are ready
    setTimeout(() => {
        new FlashbackRecorder();
    }, 10);
});

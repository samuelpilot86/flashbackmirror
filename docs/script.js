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
        this.intervalDuration = 10000; // 10 seconds (test value)
        this.signalDuration = 1000; // 1 second (test value)
        this.frequency = 20; // 20 Hz (inaudible)
        this.gain = 0.01; // Slightly higher for testing
        // Approach 2 settings
        this.checkIntervalDuration = 5000; // 5 seconds
    }

    start() {
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
            
            // APPROACH 1: Create periodic keep-alive signal
            this.keepAliveInterval = setInterval(() => {
                this.playKeepAliveSignal();
            }, this.intervalDuration);
            
            // Play initial signal immediately
            this.playKeepAliveSignal();
            
            // APPROACH 2: Create silent GainNode permanently connected
            this.silentGainNode = this.audioContext.createGain();
            this.silentGainNode.gain.value = 0; // Completely silent
            this.silentGainNode.connect(this.audioContext.destination);
            
            // APPROACH 2: Start periodic state check
            this.checkInterval = setInterval(() => {
                this.checkAndResume();
            }, this.checkIntervalDuration);
            
            // Initial state check
            this.checkAndResume();
            
            this.isActive = true;
            console.log('AudioKeepAlive: Started (Approach 1 + Approach 2)');
        } catch (error) {
            console.warn('AudioKeepAlive: Not available', error);
            // Silently fail - keep-alive is optional
        }
    }

    playKeepAliveSignal() {
        console.log('TEST: Playing keep-alive signal at', new Date().toISOString());
        
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
            gainNode.gain.value = this.gain;
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Start and stop after short duration
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + this.signalDuration / 1000);
            
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
        this.bufferMarginSeconds = 10; // extra margin to ensure an earlier keyframe
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
        this.onSessionEnded = this.onSessionEnded.bind(this);

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
        
        // Start audio output monitoring for device failure detection (TECH-003)
        this.audioOutputMonitor.start();
        
        this.setState('recording');
        this.startRecording(); // Auto-start as per US-001
    }

    setState(newState) {
        const validStates = ['recording', 'flashback', 'recordingStopped', 'flashbackPaused', 'transitioning'];
        if (!validStates.includes(newState)) {
            return;
        }
        const oldState = this.state;
        this.state = newState;
        this.updateMarkerControls();
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

        if (this.debugPanelToggle) {
            this.debugPanelToggle.addEventListener('click', () => this.toggleDebugPanel());
        }

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
                    this.handleEscapeKey();
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
            finalizedSessionsChunksCount: this.getFinalizedSessionsChunksCount(),
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
            console.log('renderPhotoTimeline: No visible frames to display', {
                totalFrames: totalFramesBeforeFilter,
                windowStart,
                windowEnd,
                windowDuration,
                allFrameTimestamps: this.photoFrames.map(f => f.timestamp)
            });
            return; // No frames to display
        }
        
        const visibleTimestamps = visibleFrames.map(f => f.timestamp);
        console.log('renderPhotoTimeline: Filtering and rendering', {
            totalFrames: totalFramesBeforeFilter,
            visibleFrames: visibleFrames.length,
            windowStart,
            windowEnd,
            windowDuration,
            containerWidth,
            visibleTimestamps
        });

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
        
        console.log('renderPhotoTimeline: Thumbnails created', {
            thumbnailsCreated,
            expectedThumbnails: visibleFrames.length
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
                    channelCount: 1            // Mono (bypasses stereo beamforming and spatial filtering)
                };
                
                try {
                    this.stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: audioConstraints
                    });
                } catch (err) {
                    // Fallback: if format constraints are not supported by the browser/device,
                    // keep at least the filter disabling (echoCancellation, noiseSuppression, autoGainControl)
                    if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
                        console.warn('Audio format constraints not supported, falling back to basic constraints', err);
                        this.stream = await navigator.mediaDevices.getUserMedia({
                            video: true,
                            audio: {
                                echoCancellation: false,
                                noiseSuppression: false,
                                autoGainControl: false
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
                if (this.state !== 'transitioning') {
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
            
            // Start audio keep-alive to prevent speaker/headphone sleep
            this.audioKeepAlive.start();
            
            // Start inactivity monitoring (BUG-021)
            this.startInactivityMonitor();
        } catch (err) {
            this.showMessage('Camera/microphone access denied or unavailable', 'error');
        }
    }

    stopRecording() {
        // Stop waveform analysis
        this.stopWaveformAnalysis();
        
        // Stop photo extraction
        this.stopPhotoExtraction();
        this.stopPhotoTimelineRefresh();
        
        // Stop audio keep-alive
        this.audioKeepAlive.stop();
        
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
            this.setState('transitioning');
            try {
                this.mediaRecorder.stop();
            } catch (e) {
            }
            this.stopTimer();
            await this.waitForRecorderStop();
            // Manual save necessary because onstop doesn't happen in 'transitioning' state
            this.saveCurrentSession();
            
            // Stop audio keep-alive when transitioning to flashback
            this.audioKeepAlive.stop();
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
        this.playFlashbackFromTimestamp(clampedTarget);
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

        let percent;
        
        if (isTimeline) {
            // Timeline: calculate relative to effective green bar width
            // Calculate the effective width of the green bar (same logic as updateTimeline)
            const effectiveBarWidthPercent = this.maxDuration > 0 ? Math.min((windowDuration / this.maxDuration) * 100, 100) : 100;
            const effectiveBarWidthPx = (effectiveBarWidthPercent / 100) * rect.width;

            // Calculate percent relative to the effective width
            if (x <= effectiveBarWidthPx) {
                // Click on the green bar: calculate relative to the green bar
                percent = effectiveBarWidthPx > 0 ? x / effectiveBarWidthPx : 0;
            } else {
                // Click on gray area: treat as 100% of the green bar
                percent = 1.0;
            }
        } else {
            // Waveform: use direct percentage of full width (always shows full window)
            percent = rect.width > 0 ? x / rect.width : 0;
            percent = Math.max(0, Math.min(1, percent)); // Clamp to [0, 1]
        }

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

            // Initialize device IDs if not set (first run)
            if (!this.currentAudioOutputDeviceId && defaultOutputDeviceId) {
                this.currentAudioOutputDeviceId = defaultOutputDeviceId;
                // Set initial output device for flashback video if it exists
                await this.updateFlashbackVideoAudioOutput(defaultOutputDeviceId);
                // Notify audio output monitor of initial device
                if (this.audioOutputMonitor) {
                    this.audioOutputMonitor.setCurrentDevice(defaultOutputDeviceId);
                }
                // Don't show overlay on first initialization
            }

            // Check for output device changes (only if device ID was already set)
            if (defaultOutputDeviceId && this.currentAudioOutputDeviceId && 
                defaultOutputDeviceId !== this.currentAudioOutputDeviceId) {
                await this.updateAudioOutputDevice(defaultOutputDeviceId);
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

    async updateFlashbackVideoAudioOutput(deviceId = null) {
        /**
         * Update audio output device for flashback video
         * Uses setSinkId() if available, otherwise relies on browser's automatic routing
         */
        if (!this.flashbackVideo) return;

        // If deviceId not provided, get default from system
        if (!deviceId) {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                const audioOutputDevices = devices.filter(d => d.kind === 'audiooutput');
                if (audioOutputDevices.length > 0) {
                    deviceId = audioOutputDevices[0].deviceId;
                    this.currentAudioOutputDeviceId = deviceId;
                }
            } catch (err) {
                console.warn('Error getting default audio output device:', err);
                return;
            }
        }

        // Try to use setSinkId() if available (Chrome/Edge)
        if (typeof this.flashbackVideo.setSinkId === 'function') {
            try {
                await this.flashbackVideo.setSinkId(deviceId);
                console.log('Audio output device updated via setSinkId:', deviceId);
            } catch (err) {
                console.warn('Error setting audio output device via setSinkId:', err);
                // Fallback: browser will handle routing automatically
            }
        } else {
            // Browser will automatically route to default device
            // No action needed, but log for debugging
            console.log('Audio output will use default device (setSinkId not available)');
        }
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
        console.log('handleRecordedChunk: New chunk received', {
            dataSize: event.data.size,
            absoluteStart: this.lifetimeRecordedDuration,
            currentSessionChunksLengthBefore: this.currentSessionChunks.length,
            chunkBufferLengthBefore: this.chunkBuffer.length
        });
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

    enforceRollingBuffer() {
        const maxBufferedDuration = this.getMaxBufferedDuration();
        if (!Number.isFinite(maxBufferedDuration) || maxBufferedDuration <= 0) {
            return;
        }

        let removedAny = false;

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

        let progressPercent = this.maxDuration > 0 ? (windowDuration / this.maxDuration) * 100 : 0;
        progressPercent = Math.min(Math.max(progressPercent, 0), 100);

        const currentAbsolute = this.getCurrentAbsoluteTime();

        // Update the green bar (progress)
        const effectiveBarWidthPercent = Math.min(progressPercent, 100);
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

    // === COMMON PLAYBACK FUNCTIONS ===

    async playFromTimestamp(timestamp) {
        // Step 1: Handle stopping recording if necessary
        if (this.state === 'recording') {
            this.setState('transitioning');

            // Stop the recorder
            try {
                this.mediaRecorder.stop();
            } catch (e) {
            }
            this.stopTimer();

            // Wait for finalization and save
            await this.waitForRecorderStop();
            this.saveCurrentSession();

            // Prepare sessions for flashback
            this.allSessions = [...this.recordedSessions];
        }

        // Step 2: Start flashback
        this.playFlashbackFromTimestamp(timestamp);
    }

    playFlashbackFromTimestamp(timestamp) {
        if (!Number.isFinite(timestamp)) {
            timestamp = 0;
        }
        const sessions = this.allSessions || [];
        if (sessions.length === 0) {
            return;
        }

        for (let i = 0; i < sessions.length; i++) {
            const session = sessions[i];
            const sessionStartAbs = session.visibleStartAbs ?? session.absoluteStart ?? 0;
            const sessionEndAbs = session.visibleEndAbs ?? sessionStartAbs;

            if (timestamp < sessionStartAbs) {
                this.currentFlashbackIndex = i;
                this.playCurrentFlashbackSession(0);
                return;
            }

            if (timestamp < sessionEndAbs) {
                this.currentFlashbackIndex = i;
                const seekTime = Math.max(0, timestamp - sessionStartAbs);
                this.playCurrentFlashbackSession(seekTime);
                return;
            }
        }

        const lastIndex = sessions.length - 1;
        const lastSession = sessions[lastIndex];
        const lastStartAbs = lastSession.visibleStartAbs ?? lastSession.absoluteStart ?? 0;
        const lastEndAbs = lastSession.visibleEndAbs ?? lastStartAbs;
        this.currentFlashbackIndex = lastIndex;
        const clamped = Math.max(0, Math.min(timestamp, lastEndAbs) - lastStartAbs);
        this.playCurrentFlashbackSession(clamped);
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

    playFlashbackFromStart(sessions) {
        this.allSessions = sessions;
        this.currentFlashbackIndex = 0;
        this.currentReferencePosition = 0;
        this.playCurrentFlashbackSession(0);
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

    playCurrentFlashbackSession(seekTime = 0) {
        if (this.currentFlashbackIndex >= this.allSessions.length) {
            this.resumeRecordingAfterFlashback();
            return;
        }

        // Capture the current flashback ID for use in error handlers
        const sessionFlashbackId = this._flashbackId;

        // IMMEDIATE CLEANUP: Stop and clean up ALL handlers of the previous flashback
        // This must be done BEFORE changing the video source to avoid race conditions
        if (this.flashbackVideo) {
            this.flashbackVideo.pause();
            // Remove all event listeners
            if (this._timeupdateHandler) {
                this.flashbackVideo.removeEventListener('timeupdate', this._timeupdateHandler);
                this._timeupdateHandler = null;
            }
            if (this._onEndedHandler) {
                this.flashbackVideo.removeEventListener('ended', this._onEndedHandler);
                this._onEndedHandler = null;
            }
            if (this._onErrorHandler) {
                this.flashbackVideo.removeEventListener('error', this._onErrorHandler);
                this._onErrorHandler = null;
            }
            // Remove all remaining listeners by changing the source
            this.videoPreview.srcObject = null;
        }
        // Clear all timers
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
        this._finalizeFlashback = null;
        // Reset flags
        this._endedFired = false;

        const session = this.allSessions[this.currentFlashbackIndex];
        if (!session || !session.chunks || session.chunks.length === 0) {
            this.onSessionEnded(sessionFlashbackId);
            return;
        }
        this.debugLogState('play:start', {
            sessionId: session.id,
            flashbackIndex: this.currentFlashbackIndex,
            chunkCount: session.chunks.length,
            hasHeaderBlob: !!session.headerBlob,
            chunkIds: session.chunks.map(chunk => chunk.id),
            chunkSizes: session.chunks.map(chunk => (chunk && chunk.blob) ? chunk.blob.size : 0),
            chunkDurations: session.chunks.map(chunk => Number((chunk?.duration || 0).toFixed(2))),
            seekTime,
            preRollDuration: Number((session.preRollDuration || 0).toFixed(2)),
            visibleDuration: Number((session.duration || 0).toFixed(2))
        });
        const visibleDuration = session.duration || session.playableDuration || 0;
        const preRollDuration = session.preRollDuration || 0;
        const sessionDuration = visibleDuration; // alias for backward compatibility
        const sessionBlob = this.buildFlashbackSessionBlob(session);
        if (!sessionBlob) {
            this.debugLogState('play:blob-null', { sessionId: session.id, flashbackIndex: this.currentFlashbackIndex });
            this.onSessionEnded(sessionFlashbackId);
            return;
        }
        this.debugLogState('play:blob-ready', {
            sessionId: session.id,
            flashbackIndex: this.currentFlashbackIndex,
            blobSize: sessionBlob.size,
            mimeType: sessionBlob.type,
            preRollDuration: Number(preRollDuration.toFixed(2)),
            visibleDuration: Number(visibleDuration.toFixed(2))
        });
        // Always recreate a fresh blob URL to avoid using a revoked URL
        if (session.blobUrl) {
            try { URL.revokeObjectURL(session.blobUrl); } catch (e) { /* noop */ }
        }
        session.blobUrl = URL.createObjectURL(sessionBlob);

        // Always detach the camera stream before attaching a video source
        this.videoPreview.srcObject = null;
        this.flashbackVideo = this.videoPreview; // Attach the new video element
        this.flashbackVideo.src = session.blobUrl; // Attach the new blob URL
        try { // Load the new video
            this.flashbackVideo.load(); 
        } catch (e) {
        }
        this.flashbackVideo.muted = false; // Enable sound

        // Set audio output device to default (BUG-020)
        this.updateFlashbackVideoAudioOutput();

        // Timeout to detect if loadedmetadata never fires
        const metadataTimeout = setTimeout(() => {
            // Check if this flashback is still active (not interrupted by a new flashback)
            if (this._flashbackId !== sessionFlashbackId) {
                // This flashback has been interrupted, ignore this call
                return;
            }
            this.showMessage('Video loading error', 'error');
            // Move to the next session if we can't load this one
            this.onSessionEnded(sessionFlashbackId);
        }, 5000);
        this._metadataTimeout = metadataTimeout;

        const onLoadedMetadata = () => {
            /**
             * Event handler for loadedmetadata - fires when video metadata is loaded
             *
             * Essential roles:
             * 1. Validate actual duration vs estimated duration at recording
             * 2. Adjust seekTime to avoid exceeding video end
             * 3. Position video cursor at the correct timestamp
             * 4. Transition state to 'flashback' (critical synchronization)
             * 5. Initialize timers and event handlers
             *
             * Important: The metadata (duration, dimensions, codecs) is not immediately available
             * after video.src = blobUrl. We need to wait for this event.
             */
            
            // 0. Initial cleanup: clear timeout and remove event listener
            clearTimeout(metadataTimeout);
            this.flashbackVideo.removeEventListener('loadedmetadata', onLoadedMetadata);
            if (this._metadataTimeout === metadataTimeout) {
                this._metadataTimeout = null;
            }

            // CAPTURE the current flashback ID for verification in all handlers
            // If _flashbackId changes (new flashback), all handlers of this flashback will be invalidated
            const currentFlashbackId = this._flashbackId;
            const finalizeFlashback = (reason) => {
                if (this._flashbackId !== currentFlashbackId) {
                    return;
                }
                if (this._endedFired) {
                    return;
                }
                this._endedFired = true;
                this._finalizeFlashback = null;
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
                if (this.flashbackVideo && this._timeupdateHandler) {
                    this.flashbackVideo.removeEventListener('timeupdate', this._timeupdateHandler);
                    this._timeupdateHandler = null;
                }
                if (this.flashbackVideo && this._onEndedHandler) {
                    this.flashbackVideo.removeEventListener('ended', this._onEndedHandler);
                    this._onEndedHandler = null;
                }
                if (this.flashbackVideo && this._onErrorHandler) {
                    this.flashbackVideo.removeEventListener('error', this._onErrorHandler);
                    this._onErrorHandler = null;
                }
                if (session && session.blobUrl) {
                    try { URL.revokeObjectURL(session.blobUrl); } catch (e) { /* noop */ }
                    session.blobUrl = null;
                }
                this.onSessionEnded(currentFlashbackId);
            };
            this._finalizeFlashback = finalizeFlashback;

            // 1. Validate actual duration vs estimated duration at recording
            const expectedMediaDuration = preRollDuration + visibleDuration;
            const actualVideoDuration = this.flashbackVideo.duration || expectedMediaDuration;
            const durationDiff = actualVideoDuration - expectedMediaDuration; // Difference between actual and expected duration (preRoll + visible)
            // });
            
            // 2. Adjust seekTime to avoid exceeding video end
            const clampedVisibleSeek = Math.min(Math.max(seekTime, 0), Math.max(0, visibleDuration));
            const mediaSeekTime = Math.min(
                Math.max(clampedVisibleSeek + preRollDuration, 0),
                Math.max(actualVideoDuration - 0.05, 0)
            );
            if (mediaSeekTime !== seekTime) {
            }

            // 3. Position video cursor at the correct timestamp
            try {
                this.flashbackVideo.currentTime = mediaSeekTime;
            } catch (e) {
                this.flashbackVideo.currentTime = 0;
            }

            // 4. Transition state to 'flashback' (critical synchronization)
            this.setState('flashback');
            this.updateUIForFlashback();
            this.updateDebugPanel(); // Update panel to highlight the current segment being played
            this.startTimer(); // Start timer for flashback

            // Stop photo extraction during flashback (only extract during recording)
            this.stopPhotoExtraction();
            this.stopPhotoTimelineRefresh();

            // 5. Initialize timers and event handlers
            // Clean up old handlers
            if (this._timeupdateHandler) {
                this.flashbackVideo.removeEventListener('timeupdate', this._timeupdateHandler);
            }
            if (this._flashbackTimeout) {
                clearTimeout(this._flashbackTimeout);
            }
            if (this._flashbackInterval) {
                clearInterval(this._flashbackInterval);
            }
            
            // Handler for ended - store flag and function on this for safety
            this._endedFired = false;
            this._lastCheckTime = Date.now();
            this._lastVideoTime = mediaSeekTime;
            // Separate variable for interval (won't be overwritten by timeupdate)
            let intervalLastVideoTime = mediaSeekTime;
            let intervalLastCheckTime = Date.now();
            
            const onEnded = () => finalizeFlashback('ended');
            this._onEndedHandler = onEnded; // Store for safety
            this.flashbackVideo.addEventListener('ended', onEnded, { once: true });
            
            // Absolute timeout based on estimated duration: force finish after estimatedDuration - seekTime + margin
            const remainingDuration = Math.max(0, visibleDuration - clampedVisibleSeek);
            const timeoutMs = (remainingDuration + 1) * 1000; // +1s margin
            this._flashbackTimeout = setTimeout(() => {
                // Check if this flashback is still active (not interrupted by a new flashback)
                if (this._flashbackId !== currentFlashbackId) {
                    // This flashback has been interrupted, ignore this call
                    return;
                }
                if (!this._endedFired) {
                    //     currentTime: this.flashbackVideo.currentTime,
                    //     duration: this.flashbackVideo.duration,
                    //     estimatedDuration: sessionDuration
                    // });
                    finalizeFlashback('timeout');
                }
            }, timeoutMs);
            
            // Interval for checking if video is blocked or ended
            this._flashbackInterval = setInterval(() => {
                // Check if this flashback is still active (not interrupted by a new flashback)
                if (this._flashbackId !== currentFlashbackId) {
                    // This flashback has been interrupted, clear and exit
                    clearInterval(this._flashbackInterval);
                    this._flashbackInterval = null;
                    return;
                }
                if (this._endedFired) {
                    clearInterval(this._flashbackInterval);
                    this._flashbackInterval = null;
            return;
        }
                const now = Date.now();
                const currentVideoTime = this.flashbackVideo.currentTime || 0;
                const targetEndTime = Math.min(actualVideoDuration, preRollDuration + visibleDuration);
                const videoDuration = this.flashbackVideo.duration || targetEndTime;
                const timeSinceLastIntervalCheck = (now - intervalLastCheckTime) / 1000;
                const videoTimeDiff = Math.abs(currentVideoTime - intervalLastVideoTime);
                
                
                // If video hasn't progressed for more than 1.5s (detected by interval), force finish
                if (timeSinceLastIntervalCheck > 1.5 && videoTimeDiff < 0.1) {
                    clearInterval(this._flashbackInterval);
                    this._flashbackInterval = null;
                    finalizeFlashback('interval-stuck');
                    return;
                }
                
                // If we've reached or exceeded the actual duration of the video, force finish
                if (videoDuration && currentVideoTime >= videoDuration - 0.2) {
                    clearInterval(this._flashbackInterval);
                    this._flashbackInterval = null;
                    finalizeFlashback('interval-duration');
            return;
        }

                // If we've reached or exceeded the estimated duration, force finish (safety)
                if (currentVideoTime >= targetEndTime - 0.1) {
                    clearInterval(this._flashbackInterval);
                    this._flashbackInterval = null;
                    finalizeFlashback('interval-estimate');
                    return;
                }
                
                // Update values for next check (only if video is progressing)
                if (videoTimeDiff >= 0.1) {
                    intervalLastCheckTime = now;
                    intervalLastVideoTime = currentVideoTime;
                }
            }, 500); // Check every 500ms
            
            // timeupdate handler with video end check
            this._timeupdateHandler = () => {
                // Playback positions are now updated via updateAllPlaybackPositions() at 100ms intervals
                // No need to update here to avoid duplicate updates
                
                // Check if this flashback is still active (not interrupted by a new flashback)
                if (this._flashbackId !== currentFlashbackId) {
                    // This flashback has been interrupted, remove this handler and exit
                    if (this.flashbackVideo && this._timeupdateHandler) {
                        this.flashbackVideo.removeEventListener('timeupdate', this._timeupdateHandler);
                    }
                    this._timeupdateHandler = null;
                    return;
                }
                this.updateTimeline();
                const currentTime = this.flashbackVideo.currentTime || 0;
                this._lastVideoTime = currentTime;
                this._lastCheckTime = Date.now();
                
                // Safety: if we're very close to the end and ended hasn't fired
                if (!this._endedFired) {
                    const targetEndTime = Math.min(actualVideoDuration, preRollDuration + visibleDuration);
                    const videoDuration = this.flashbackVideo.duration || targetEndTime;
                    if (currentTime >= videoDuration - 0.2 || currentTime >= targetEndTime - 0.2) {
                        // Force immediately rather than waiting
                        if (this._timeupdateGuardTimeout) {
                            clearTimeout(this._timeupdateGuardTimeout);
                        }
                        this._timeupdateGuardTimeout = setTimeout(() => {
                            // Check again if this flashback is still active
                            if (this._flashbackId !== currentFlashbackId) {
                                return;
                            }
                            this._timeupdateGuardTimeout = null;
                            if (!this._endedFired) {
                                finalizeFlashback('timeupdate-guard');
                            }
                        }, 100);
                    }
                }
            };
            this.flashbackVideo.addEventListener('timeupdate', this._timeupdateHandler);

            this.flashbackVideo.play().catch(err => {
                // Check if this flashback is still active
                if (this._flashbackId !== currentFlashbackId) {
                    return;
                }
                // Retry to 0
                try {
                    this.flashbackVideo.currentTime = 0;
                    this.flashbackVideo.play().catch(err2 => {
                        // Check again if this flashback is still active
                        if (this._flashbackId !== currentFlashbackId) {
                            return;
                        }
                        this.showMessage('Flashback failed', 'error');
                        // If same retry fails, move to the next session
                        finalizeFlashback('flashback-error-retry');
                    });
                } catch (e2) {
                    // Check again if this flashback is still active
                    if (this._flashbackId !== currentFlashbackId) {
                        return;
                    }
                    this.showMessage('Flashback failed', 'error');
                    finalizeFlashback('flashback-error');
                }
            });
        };

        // Also handle loading error
        const onError = (e) => {
            // Check if this flashback is still active
            if (this._flashbackId !== sessionFlashbackId) {
                return;
            }
            this.debugLogState('play:error', {
                sessionId: session.id,
                flashbackIndex: this.currentFlashbackIndex,
                error: e?.message || e?.type || 'unknown',
                readyState: this.flashbackVideo?.readyState,
                networkState: this.flashbackVideo?.networkState
            });
            if (this._finalizeFlashback) {
                this._finalizeFlashback('load-error');
                return;
            }
            clearTimeout(metadataTimeout);
            if (this._metadataTimeout === metadataTimeout) {
                this._metadataTimeout = null;
            }
            if (this.flashbackVideo && this._onErrorHandler) {
                this.flashbackVideo.removeEventListener('error', this._onErrorHandler);
                this._onErrorHandler = null;
            }
            this._finalizeFlashback = null;
            this.showMessage('Video loading error', 'error');
            // Move to the next session
            this.onSessionEnded(sessionFlashbackId);
        };

        this.flashbackVideo.addEventListener('loadedmetadata', onLoadedMetadata, { once: true });
        this.flashbackVideo.addEventListener('error', onError, { once: true });
        this._onErrorHandler = onError;
    }

    // === INTERRUPTION/END OF PLAYBACK + RESUME RECORDING ===

    onSessionEnded(flashbackId = null) { 
        // Check if this flashback is still active (if flashbackId is provided)
        // If flashbackId is provided and doesn't match the current _flashbackId, this flashback has been interrupted
        if (flashbackId !== null && this._flashbackId !== flashbackId) {
            // This flashback has been interrupted by a new flashback, ignore this call
            return;
        }
        // If we're no longer in flashback, ignore it as well (additional safety)
        if (this.state !== 'flashback') {
            return;
        }
        this.currentFlashbackIndex++;
        if (this.currentFlashbackIndex >= this.allSessions.length) {
            try {
                this.resumeRecordingAfterFlashback();
            } catch (e) {
            }
        } else {
            this.playCurrentFlashbackSession(0);
        }
    }

    stopFlashbackAndResumeRecording() {
        if (this.state === 'flashback') {
            this.setState('recordingStopped');
            this.currentFlashbackIndex = 0;
            this.currentReferencePosition = null;
            this._finalizeFlashback = null;
            this.updateDebugPanel(); // Update panel to remove highlight from segment
            // Completely clean up the video element (flashbackVideo and videoPreview are the same reference)
            if (this.flashbackVideo) {
                this.flashbackVideo.pause();
                this.flashbackVideo.removeEventListener('ended', this.onSessionEnded);
                if (this._timeupdateHandler) {
                    this.flashbackVideo.removeEventListener('timeupdate', this._timeupdateHandler);
                    this._timeupdateHandler = null;
                }
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

    resumeRecordingAfterFlashback() {
        // Reset previous position tracking when resuming recording
        this.previousAbsoluteTime = null;
        this.stopFlashbackAndResumeRecording();
    }

    getCurrentAbsoluteTime() {
        if (this.state === 'flashback' || this.state === 'flashbackPaused') {
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

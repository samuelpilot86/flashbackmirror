# Product Backlog - Flashback Application

## Overview
This backlog contains future enhancements and features planned for the Flashback training recorder application. Items are prioritized based on user value and technical feasibility.

## Backlog Items

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

### ⏹️ Stop Recording Button

**Description**:
Add a dedicated "Stop Recording" button that allows users to manually stop the continuous recording process. This provides users with explicit control over when to end their recording sessions, as opposed to the current automatic continuation.

**User Value**:
- **Control Over Sessions**: Users can explicitly end recording sessions when they choose
- **Session Management**: Clear start/stop workflow for better user understanding
- **Resource Management**: Ability to stop recording when not needed to save system resources
- **Workflow Clarity**: Explicit visual feedback about recording state

**Acceptance Criteria**:
- [ ] "Stop Recording" button is clickable only during active recording state 
- [ ] Clicking button immediately stops recording and saves current session, or flashback
- [ ] Button hidden during flashback and stopped states
- [ ] Clear visual feedback when recording is stopped
- [ ] Recording data is properly saved and becomes available for flashbacks
- [ ] Button placement doesn't interfere with other controls
- [ ] Works seamlessly with rolling buffer functionality

**Example Behavior**:
- **During recording**: "Stop Recording" button visible alongside other controls
- **Click stop**: Recording stops immediately, session saved, UI updates to stopped state
- **After stop**: User can start new recording or review previous sessions (flashback). If the recording has been stopped, it does not start again after the flashback
- **Rolling buffer**: Stopped recording respects rolling buffer limits

**Technical Requirements**:
- Button state management (show/hide based on recording state)
- Integration with existing MediaRecorder.stop() functionality
- Session saving and cleanup
- UI state transitions
- Event handling without disrupting other features

**Dependencies**:
- Existing recording system
- Session management
- UI state management
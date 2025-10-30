# Flashback Recorder - Technical Dictionary

## Core Concepts

### Flashback Playback
**Definition**: The core functionality that allows users to replay their recorded video from any point in time by going backwards (flashback) or forwards (advance) through their recording history. Uses exponential time jumps (1s, 2s, 4s, 8s...) for intuitive navigation.

### Rolling Buffer
**Definition**: A memory management system that automatically removes the oldest recorded video sessions when the total recording time exceeds the maximum configured duration. This ensures the app never runs out of memory while maintaining continuous recording.

### Session Boundaries
**Definition**: Timestamps that mark the absolute positions in time where individual recording sessions end. Used to place visual markers on the timeline and calculate navigation positions accurately.

### Sequential Playback
**Definition**: The method of playing back recorded video sessions in order, automatically transitioning from one session to the next during flashback playback. Ensures seamless video continuity across session boundaries.

## Technical Terms

### MediaRecorder API
**Definition**: A Web API that provides functionality to record media streams (audio/video) directly in web browsers. Used to capture camera and microphone input as video chunks.

### getUserMedia
**Definition**: A navigator method that requests access to the user's camera and microphone. Returns a MediaStream object containing the audio/video data from the user's devices.

### Blob
**Definition**: A JavaScript object representing immutable raw data. Used to store video chunks and create downloadable video files. Can be converted to URLs for playback.

### URL.createObjectURL()
**Definition**: A method that creates a DOMString containing a URL representing the object given in the parameter. Used to generate playable URLs from Blob objects for video playback.

### localStorage
**Definition**: A web storage API that stores data with no expiration date. Used to persist user settings like maximum recording duration between browser sessions.

### Event Listeners
**Definition**: JavaScript functions that wait for specific events (like clicks, key presses, or media events) to occur and then execute code in response.

### DOM Manipulation
**Definition**: The process of programmatically changing the structure, style, or content of HTML elements in the Document Object Model using JavaScript.

## User Interface Components

### Timeline Bar
**Definition**: A visual progress bar that represents the total recording time window. Shows the relationship between recorded content, current position, and maximum recording duration.

### Session Markers
**Definition**: Vertical lines displayed on the timeline that indicate where individual recording sessions begin and end, helping users understand the structure of their recordings.

### Position Indicator
**Definition**: A red vertical line on the timeline that shows the current playback position during flashback playback. Moves in real-time as the video plays.

### Progress Bar
**Definition**: The green portion of the timeline bar that represents how much of the available recording time has been used with actual video content.

### Legend Text
**Definition**: Explanatory text below the timeline that describes what the timeline represents and how to interact with it, changing based on the current application state.

## Configuration & Settings

### Max Recording Duration
**Definition**: The maximum amount of time (in seconds) that the application will store in its rolling buffer. Configurable from 2 to 60 seconds via the settings panel.

### Exponential Navigation
**Definition**: The navigation system where consecutive presses of back/forward buttons jump increasingly longer distances (1s → 2s → 4s → 8s...). This allows quick access to recent events while maintaining precision for older content.

### Counter Reset Timer
**Definition**: A 0.7-second countdown timer that resets the exponential navigation counters if no button is pressed. This prevents accidental large jumps when users pause their navigation.

### Chunk Validation
**Definition**: The process of verifying that recorded video chunks are valid before saving them as sessions. Checks for null data, empty chunks, correct MIME types, and minimum file sizes.

## Playback & Navigation

### Reference Position
**Definition**: The timestamp from which future flashback calculations are made. During playback, this represents the current viewing position; during recording, it defaults to the end of all recordings.

### Current Playback Index
**Definition**: The index number of the session currently being played back in the sequential playback sequence. Used to track progress through multiple video sessions.

### Seek Time
**Definition**: The specific timestamp within a video session where playback should begin. Calculated when jumping to a specific moment in the recording history.

## Media & Encoding

### MIME Type
**Definition**: A string that identifies the format of a file. Used to specify video encoding formats like "video/webm" or "video/webm;codecs=vp8,opus".

### Video Codecs
**Definition**: Algorithms used to compress and decompress video data. VP8 and VP9 are common web-compatible video codecs supported by MediaRecorder.

### Audio Codecs
**Definition**: Algorithms for compressing audio data. Opus is a high-quality, low-latency audio codec commonly used for web video recording.

### MediaStream
**Definition**: An object representing a stream of media content (audio/video). Obtained from getUserMedia() and passed to MediaRecorder for recording.

## State Management

### Recording State
**Definition**: The application state when actively capturing video from the camera. MediaRecorder is active, timer is running, and video preview shows live camera feed.

### Playback State
**Definition**: The application state during flashback viewing. Recorded video sessions are played sequentially, timeline shows current position, navigation buttons are active.

### Stopped State
**Definition**: The initial application state before recording begins. No active media streams, all controls are in default positions, ready for new recording.

## Data Structures

### Recorded Sessions Array
**Definition**: An array storing completed recording sessions, each containing video chunks, blob data, timestamps, and metadata. Used for flashback playback.

### Current Session Chunks
**Definition**: An array that accumulates video data chunks during active recording. Converted to a complete session when flashback starts or recording stops.

### Session Boundaries Array
**Definition**: An array of absolute timestamps marking where each recording session ends. Used to position timeline markers and calculate navigation positions.

## Error Handling

### Blob Validation
**Definition**: The process of ensuring video blob objects are properly formed and playable. Includes size checks, URL creation tests, and MIME type verification.

### Race Condition Prevention
**Definition**: Programming techniques to prevent conflicts when multiple asynchronous operations (like recording and playback) interact with shared data structures.

### Graceful Degradation
**Definition**: The app's ability to continue functioning when certain features aren't available (like unsupported codecs) by falling back to alternative approaches.

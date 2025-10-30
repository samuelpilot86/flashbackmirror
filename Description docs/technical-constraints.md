# Technical Constraints: Why 1-Second Chunks

## Core Question
**Why record in 1-second chunks instead of one chunk per recording?**

## Primary Constraint: Browser Memory Limits

### Memory Usage Calculation
- **1-second chunk**: ~5-10MB (depending on resolution)
- **30-minute recording**: Would require ~9-18GB RAM if one chunk
- **Browser limit**: Typically 1-2GB per tab
- **Result**: Browser crash or "out of memory" error

### Real-World Impact
```javascript
// Hypothetical 30-minute recording as one chunk
const thirtyMinuteChunk = new Blob([/* 2-3GB of data */], {type: 'video/webm'});
// Browser: "Nope, too big!" 💥
```

## Secondary Constraints

### 1. Real-Time Functionality Requirement
- **Flashbacks need immediate data access**
- **Cannot wait for recording to complete**
- **Chunks provide progressive availability**

### 2. MediaRecorder API Design
- **API sends `ondataavailable` events at intervals**
- **No option for single chunk until recording ends**
- **Events fire every N milliseconds as specified**

### 3. Error Recovery
- **Recording failure = less data lost with small chunks**
- **Can recover partial recordings**
- **Large chunk = all or nothing**

### 4. Garbage Collection
- **Small chunks allow progressive cleanup**
- **Large chunks stay in memory until end**
- **Memory leaks more likely with big chunks**

### 5. UI Responsiveness
- **Large chunks can cause UI freezing**
- **Small chunks keep interface smooth**
- **Better user experience**

## Alternative Approaches Considered

### Option A: Variable Chunk Sizes
```javascript
// Smaller chunks at start, larger chunks later
if (recordingTime < 60) {
  mediaRecorder.start(500);  // 0.5s chunks
} else {
  mediaRecorder.start(2000); // 2s chunks
}
```

**Pros**: Adaptive sizing
**Cons**: Complex logic, still memory issues

### Option B: Stream to IndexedDB
```javascript
// Save chunks progressively to disk
mediaRecorder.ondataavailable = (event) => {
  saveToIndexedDB(event.data);
};
```

**Pros**: No memory accumulation
**Cons**: Complex async operations, slower

## Why 1-Second Chunks Won

### Optimal Balance
- ✅ **Memory safe**: Small chunks don't overwhelm browser
- ✅ **Real-time capable**: Immediate data availability
- ✅ **API compatible**: Works with MediaRecorder design
- ✅ **Error resilient**: Minimal data loss on failures
- ✅ **Performance good**: UI stays responsive

### Real-World Validation
- **Works on**: MacBook Pro 13" (8-16GB RAM)
- **Handles**: Multi-hour recordings in theory
- **Supports**: Complex flashback algorithms
- **Maintains**: Good user experience

## Conclusion
**1-second chunks are not arbitrary - they're the result of balancing multiple technical constraints while enabling the core flashback functionality.**

Without chunking, the entire concept would be technically infeasible due to browser limitations.

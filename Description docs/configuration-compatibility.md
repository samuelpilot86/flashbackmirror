# Configuration Compatibility File

## User Environment Specifications

### Hardware Configuration
- **Device**: MacBook Pro 2020, 13-inch
- **Display Resolution**: 2560 x 1600 pixels (Retina)
- **Aspect Ratio**: 16:10
- **Screen Size**: 13.3 inches diagonal
- **Camera**: Built-in FaceTime HD camera (720p)
- **Microphone**: Built-in stereo microphone
- **Storage**: SSD (capacity varies by model)

### Software Configuration
- **Operating System**: macOS (version to be specified)
- **Primary Browser**: Firefox
- **Browser Version**: Latest stable release
- **Additional Browsers**: Chrome, Safari (for testing compatibility)

## Compatibility Requirements

### Browser API Support (Firefox)
- **WebRTC**: ✅ Supported (Firefox 17+)
- **MediaRecorder API**: ✅ Supported (Firefox 25+)
- **IndexedDB**: ✅ Supported (Firefox 16+)
- **File System Access API**: ❌ Not supported (Chrome/Edge only)
- **Web Audio API**: ✅ Supported (Firefox 15+)
- **Canvas API**: ✅ Supported (Firefox 2+)
- **Local Storage**: ✅ Supported (Firefox 3.5+)

### Display Compatibility
- **Target Resolution**: 2560 x 1600 (native)
- **Scaled Resolutions**: 1280 x 800, 1440 x 900, 1680 x 1050
- **Design Breakpoint**: Desktop (1440px+)
- **Safe Area**: Account for macOS menu bar and dock

### Performance Considerations
- **Memory**: 8GB or 16GB RAM (depending on model)
- **Processor**: Intel Core i5 or i7 (10th generation)
- **Graphics**: Intel Iris Plus Graphics
- **Video Processing**: Hardware acceleration available
- **Storage Speed**: NVMe SSD for fast file operations

## Prototype Compatibility Guidelines

### Figma Design Specifications
- **Canvas Size**: 1440 x 900px (primary desktop viewport)
- **Alternative Sizes**: 1280 x 800px (scaled), 1680 x 1050px (scaled)
- **Grid System**: 8px base grid (compatible with Retina display)
- **Export Resolution**: 2x for Retina displays
- **Color Profile**: sRGB for web compatibility

### Web Development Compatibility
- **CSS Units**: Use `px` and `rem` for consistent sizing
- **Media Queries**: 
  ```css
  @media (min-width: 1440px) { /* Desktop */ }
  @media (max-width: 1439px) { /* Tablet */ }
  @media (max-width: 767px) { /* Mobile */ }
  ```

### Browser-Specific Considerations
- **Firefox Optimizations**: 
  - Use `-moz-` prefixes for experimental features
  - Test WebRTC permissions flow
  - Verify MediaRecorder codec support
- **Fallback Strategies**:
  - File download instead of File System Access API
  - Local Storage fallback for IndexedDB
  - Canvas fallback for advanced graphics

## Testing Environment Setup

### Local Development
- **Server**: Use HTTPS for WebRTC (required for camera access)
- **Port**: 3000 or 8080 (avoid port conflicts)
- **Hot Reload**: Enable for rapid iteration
- **Console Logging**: Enable for debugging

### Browser Testing Matrix
| Feature | Firefox | Chrome | Safari | Edge |
|---------|---------|--------|--------|------|
| WebRTC | ✅ | ✅ | ✅ | ✅ |
| MediaRecorder | ✅ | ✅ | ✅ | ✅ |
| IndexedDB | ✅ | ✅ | ✅ | ✅ |
| File System Access | ❌ | ✅ | ❌ | ✅ |
| Web Audio | ✅ | ✅ | ✅ | ✅ |

### Performance Benchmarks
- **Video Capture**: 720p @ 30fps (optimal for 13-inch display)
- **Audio Quality**: 44.1kHz, 16-bit (standard web audio)
- **File Size Limits**: 100MB per session (storage consideration)
- **Memory Usage**: Monitor for memory leaks during long recordings

## Development Tools Compatibility

### Recommended Tools
- **Code Editor**: VS Code (compatible with macOS)
- **Version Control**: Git (built-in terminal support)
- **Package Manager**: npm/yarn (Node.js compatible)
- **Build Tools**: Vite or Webpack (cross-platform)

### Browser Extensions (Firefox)
- **Web Developer Tools**: Built-in DevTools
- **Responsive Design**: Built-in responsive mode
- **Performance Profiler**: Built-in performance tools
- **Network Monitor**: Built-in network analysis

## Security & Privacy Considerations

### Camera/Microphone Permissions
- **Firefox Behavior**: Prompts user for permission
- **HTTPS Requirement**: Required for camera access
- **Permission Persistence**: Stored per domain
- **Privacy Indicators**: macOS shows active camera/mic

### Data Storage
- **Local Storage**: Limited to 5-10MB per domain
- **IndexedDB**: No hard limit (uses available disk space)
- **File Downloads**: Saved to Downloads folder by default
- **Privacy**: All data stays on local machine

## Troubleshooting Guide

### Common Issues
1. **Camera Not Working**: Check HTTPS and permissions
2. **Audio Quality Poor**: Verify microphone permissions
3. **Performance Issues**: Monitor memory usage
4. **File Size Limits**: Implement chunked recording

### Debugging Tools
- **Firefox DevTools**: Console, Network, Performance
- **macOS Activity Monitor**: Monitor system resources
- **Browser Console**: Check for JavaScript errors
- **Network Tab**: Monitor API calls and responses

## Future Compatibility Considerations

### macOS Updates
- **Version Compatibility**: Test with latest macOS versions
- **Security Updates**: Ensure HTTPS compliance
- **Feature Deprecations**: Monitor browser API changes

### Hardware Upgrades
- **M1/M2 MacBooks**: Consider Apple Silicon compatibility
- **External Displays**: Test with external monitor setups
- **USB-C Peripherals**: Consider external camera/microphone options

This configuration ensures all prototypes and development work are optimized for your specific MacBook Pro 2020 setup with Firefox as the primary browser.

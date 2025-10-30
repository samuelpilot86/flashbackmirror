# Figma Mockup Design Specification

## Design System Overview

### Color Palette
- **Primary**: #2563EB (Blue) - For main actions and highlights
- **Secondary**: #64748B (Slate) - For secondary elements
- **Success**: #10B981 (Green) - For recording/playback states
- **Warning**: #F59E0B (Amber) - For alerts and notifications
- **Error**: #EF4444 (Red) - For errors and stop actions
- **Background**: #F8FAFC (Light Gray) - Main background
- **Surface**: #FFFFFF (White) - Cards and containers
- **Text Primary**: #1E293B (Dark Gray) - Main text
- **Text Secondary**: #64748B (Medium Gray) - Secondary text

### Typography
- **Primary Font**: Inter or System UI (clean, modern)
- **Headings**: 24px, 20px, 18px, 16px
- **Body Text**: 14px, 12px
- **Weights**: Regular (400), Medium (500), Semibold (600)

### Spacing System
- **Base Unit**: 8px
- **Spacing Scale**: 4px, 8px, 12px, 16px, 24px, 32px, 48px, 64px

## Screen Specifications

### 1. Main Capture Screen (Desktop - 1440x900)

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header (64px height)                                         │
│ [Logo] [App Name]                    [Settings] [Profile]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│                    Main Content Area                        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │            Video Preview Area                       │   │
│  │              (16:9 aspect ratio)                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Control Panel                          │   │
│  │  [● Record] [⏸️ Pause] [⏹️ Stop] [📁 Sessions]      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Components to Design

**Header Component**
- Logo (left): Simple icon + "Flashback" text
- Navigation (center): Current screen indicator
- Actions (right): Settings gear icon, Profile avatar

**Video Preview Area**
- Dimensions: 800x450px (16:9 ratio)
- Background: Dark gray (#1E293B) with subtle pattern
- Overlay elements:
  - Recording indicator (red dot with "REC" text)
  - Timer display (top-right corner)
  - Quality indicator (bottom-right)

**Control Panel**
- Height: 120px
- Background: White with subtle shadow
- Button layout: Horizontal row with equal spacing
- Button styles:
  - Record: Large red button with white icon
  - Pause: Medium gray button
  - Stop: Medium gray button
  - Sessions: Medium blue button

### 2. Recording State Screen

#### Visual Changes During Recording
- **Video Preview**: Live camera feed with recording overlay
- **Record Button**: Changes to "Stop Recording" (red background)
- **Timer**: Shows elapsed time (00:00:00 format)
- **Status Indicator**: "Recording..." text with pulsing animation
- **Additional Controls**: 
  - Mute/Unmute audio toggle
  - Camera switch (if multiple cameras available)

### 3. Session Playback Screen

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header (64px height)                                         │
│ [← Back] [Session Title]                    [⚙️ Settings]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │            Video Player Area                        │   │
│  │              (16:9 aspect ratio)                    │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Playback Controls                       │   │
│  │  [⏮️] [⏸️] [⏭️] [⏱️ 00:00 / 05:30] [🔊] [📤]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Session Details                         │   │
│  │  Date: March 15, 2024  |  Duration: 5:30  |  Size: 45MB │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Components to Design

**Video Player Area**
- Same dimensions as capture screen
- Video element with custom controls overlay
- Progress bar at bottom
- Fullscreen toggle button

**Playback Controls**
- Height: 80px
- Background: White with subtle shadow
- Control layout:
  - Previous/Next: Small buttons
  - Play/Pause: Large center button
  - Progress bar: Full width with time indicators
  - Volume: Slider with icon
  - Export: Button for downloading

**Session Details Panel**
- Height: 60px
- Background: Light gray (#F8FAFC)
- Information layout: Horizontal with separators
- Font: 12px secondary text

### 4. Sessions List Screen

#### Layout Structure
```
┌─────────────────────────────────────────────────────────────┐
│ Header (64px height)                                         │
│ [← Back] [My Sessions]                    [🔍 Search] [+]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Filter Bar                             │   │
│  │  [All] [Music] [Speech] [Sport] [📅 Date] [🏷️ Tags] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Session Card 1                                      │   │
│  │ ┌─────────┐ Title: Piano Practice Session 1         │   │
│  │ │ Thumbnail│ Date: March 15, 2024                   │   │
│  │ │ 16:9    │ Duration: 5:30 | Size: 45MB             │   │
│  │ └─────────┘ [▶️ Play] [📤 Export] [🗑️ Delete]        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Session Card 2                                      │   │
│  │ ┌─────────┐ Title: Presentation Rehearsal           │   │
│  │ │ Thumbnail│ Date: March 14, 2024                   │   │
│  │ │ 16:9    │ Duration: 12:45 | Size: 98MB            │   │
│  │ └─────────┘ [▶️ Play] [📤 Export] [🗑️ Delete]        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

#### Components to Design

**Filter Bar**
- Height: 60px
- Background: White
- Filter buttons: Pill-shaped with active/inactive states
- Search icon: Right-aligned

**Session Card**
- Height: 120px
- Background: White with subtle shadow
- Layout: Horizontal with thumbnail on left
- Thumbnail: 160x90px (16:9 ratio)
- Content: Title, date, duration, file size
- Actions: Three buttons aligned to right

### 5. Mobile Responsive Design (375x812)

#### Key Adaptations
- **Header**: Simplified with hamburger menu
- **Video Preview**: Full width with 16:9 ratio
- **Controls**: Stacked vertically or use bottom sheet
- **Session Cards**: Full width, stacked layout
- **Touch Targets**: Minimum 44px height

## Interactive States to Design

### Button States
- **Default**: Primary color background, white text
- **Hover**: Slightly darker background
- **Active**: Pressed state with shadow
- **Disabled**: Gray background, muted text
- **Loading**: Spinner animation

### Recording States
- **Idle**: Gray record button
- **Recording**: Red button with pulsing animation
- **Paused**: Yellow button
- **Processing**: Loading spinner

### Video Player States
- **Loading**: Skeleton placeholder
- **Playing**: Play button hidden, controls visible
- **Paused**: Play button visible
- **Buffering**: Loading spinner overlay

## Design Guidelines

### Accessibility
- **Color Contrast**: Minimum 4.5:1 ratio for text
- **Touch Targets**: Minimum 44px for mobile
- **Focus States**: Clear visual indicators
- **Text Size**: Minimum 12px for body text

### Animation Principles
- **Duration**: 200-300ms for micro-interactions
- **Easing**: Ease-out for entering, ease-in for exiting
- **Recording Pulse**: 1s duration, infinite loop
- **Button Press**: 100ms scale animation

### Responsive Breakpoints
- **Desktop**: 1440px+ (primary design)
- **Tablet**: 768px - 1439px
- **Mobile**: 320px - 767px

## Implementation Notes

### Figma Setup
1. **Create Components**: Make reusable components for buttons, cards, etc.
2. **Use Auto Layout**: For responsive design
3. **Create Variants**: For different button states
4. **Set Up Grid**: 8px base grid system
5. **Use Styles**: For consistent colors and typography

### Export Specifications
- **Icons**: SVG format, 24x24px
- **Images**: PNG format, 2x resolution
- **Colors**: Export as CSS variables
- **Typography**: Export font specifications

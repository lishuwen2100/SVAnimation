# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Chinese subtitle animation player that uses Remotion to create "Typemonkey/倒鸭子" style animations. Subtitles appear one by one, attach to each other, and rotate 90° left every 3 lines, with automatic centering constraints.

**Tech Stack:** React 19 + Vite 7 + Tailwind CSS 4 + Remotion 4 + TypeScript 5

## Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Architecture & Key Concepts

### Single-File Structure

The entire application logic lives in `src/App.tsx` (~1070 lines). This is intentional for this visualization tool:

- **SubtitleComposition**: Remotion component that renders the animated subtitles
- **App**: Main React component with UI controls and Remotion Player

### Core Animation System

The animation follows a strict geometric algorithm:

1. **Grouping**: Every 3 subtitles form a group (`GROUP_SIZE = 3`)
2. **Attachment**: New subtitles attach their `top-left` to the previous subtitle's `bottom-left`
3. **Rotation**: When a group completes, it rotates -90° around its bounding box's `bottom-left` pivot
4. **Center Constraint**: After placement, subtitles shift to keep their center within the defined center region
5. **Timing Compensation**: Each group rotation adds `ROTATE_DURATION_FRAMES / FPS` seconds of delay

### Key Functions

- `parseSrt()`: Converts SRT text to `SubtitleCue[]` with frame-based timing adjusted for rotation delays
- `buildLayouts()`: Calculates all subtitle positions, group boundaries, and rotation pivots **before** animation starts
- `SubtitleComposition`: Uses Remotion's `useCurrentFrame()` to render the correct state at each frame
- `getCueEnterAnimation()`: Stable random selection from enabled animations using text hash

### Animation Phases

1. **Enter animations**: Latest subtitle uses selected enter animation (`slam-bounce`, `spin-scale`, etc.)
2. **Static phase**: Subtitles remain visible in their attached positions
3. **Rotation phase**: Group rotates over `ROTATE_DURATION_FRAMES` (16 frames)
4. **Fade transition**: Previous rotated group fades out at `ROTATE_FADE_PHASE` (45%) before new rotation starts

### Constants Reference

- `FPS = 30`: All frame calculations use 30fps
- `ROTATE_DURATION_FRAMES = 16`: ~0.53 seconds per rotation
- `SHIFT_DURATION_FRAMES = 12`: ~0.4 seconds for center constraint shift
- `FONT_SIZE = 72`: Base font size for text
- `BOX_HEIGHT = 86`: Subtitle bounding box height
- `ROTATE_FADE_PHASE = 0.45`: Outgoing group fades during first 45% of rotation transition

## Path Aliases

TypeScript paths are configured in `tsconfig.json`:
- `@/*` → `src/*`

Example: `import { cn } from '@/utils/cn'`

## State Management

All state lives in the App component with React hooks:

- `srtText`: Raw SRT content (default: demo Chinese text)
- `audioSrc`: Object URL for uploaded MP3
- `cues`: Parsed subtitle array with frame timing
- `centerRegion`: Normalized (0-1) region boundaries + visibility
- `isDrawMode`: Mouse drag selection mode
- `selectedAnimations`: Array of enabled enter animation IDs
- `resolutionId`: Selected preset resolution

## Resolution System

Five preset resolutions in `resolutionOptions[]`:
- 1920x1080 (Full HD)
- 1280x720 (HD, default)
- 1080x1080 (Square)
- 1080x1920 (Vertical)
- 2560x1440 (2K)

Changes affect:
- Remotion `compositionWidth`/`compositionHeight`
- Player aspect ratio
- Layout calculation coordinate system
- Center region pixel boundaries

## Design Philosophy (from DESIGN.md)

Key constraints when modifying this codebase:

1. **Whole-sentence rendering**: Never split Chinese text into words or characters
2. **Deterministic layout**: Same SRT + resolution = same positions (uses `hashString()` for seeded randomness)
3. **Geometric purity**: Attachment logic never breaks; shifts only move the entire subtitle group
4. **No double rendering**: During rotation transitions, either show static OR rotating version, never both
5. **Fade before rotate**: Previous rotated group must fade to threshold before new rotation begins

## Common Modifications

### Adding a New Enter Animation

1. Add new animation name to `EnterAnimationName` type
2. Add option to `enterAnimationOptions[]` array
3. Implement transform logic in `getEnterTransform()` switch statement
4. Use Remotion's `interpolate()` and `spring()` for smooth easing

### Adjusting Timing

- Change `ROTATE_DURATION_FRAMES` for faster/slower rotations
- Modify `SHIFT_DURATION_FRAMES` for center constraint speed
- Adjust `ROTATE_FADE_PHASE` to change fade/rotate overlap timing
- Update `GROUP_SIZE` to change how many subtitles per rotation (affects entire layout system)

### Layout Algorithm

The `buildLayouts()` function pre-calculates all positions. To modify attachment behavior:
- First group: seeded random position near center
- Same group: `y = prev.y + BOX_HEIGHT` (vertical stack)
- New group: attach to previous group's `rotatedBottomRight` point
- All rotations use `rotateLeft90()` around group's bottom-left pivot

## Styling

Tailwind CSS 4 configured via Vite plugin. Main classes:
- Backgrounds: `bg-neutral-900` (composition), `bg-neutral-950` (UI)
- Subtitles: `text-[72px] font-black text-neutral-100` with dynamic shadow
- Center region: `border-2 border-yellow-300/80` (when visible)

## Remotion Integration

The Player component key includes all dependencies to force re-render on changes:
```typescript
key={`${srtText.length}-${durationInFrames}-${audioSrc ?? "no-audio"}-${resolutionId}-...`}
```

This ensures layout recalculation when SRT, resolution, or center region changes.

## Testing Approach

No automated tests. Manual testing workflow:

1. Load demo subtitles (default)
2. Upload custom SRT file
3. Upload MP3 audio
4. Verify subtitles sync with audio
5. Test different resolutions
6. Enable/disable enter animations
7. Use mouse drag to adjust center region
8. Check that rotations happen every 3 subtitles
9. Verify previous rotated group fades before new rotation

## Known Behaviors

- Audio duration determines final composition length (vs. subtitle duration)
- Subtitle width estimated using CJK vs ASCII character counting (`estimateTextWidth()`)
- Center region normalized to prevent overflow (0.1-0.9 range)
- Mouse drag selection requires `isDrawMode = true`
- Pointer capture ensures smooth drag even when cursor leaves player bounds

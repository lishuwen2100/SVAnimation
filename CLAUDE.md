# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**SVAnimation** is a short video effects assistant toolkit built with Remotion. It provides multiple special effects modules for video creators.

**Tech Stack:** React 19 + Vite 7 + Tailwind CSS 4 + Remotion 4 + TypeScript 5

**Key Documents:**
- `DESIGN.md` - Complete design documentation, UI specs, and technical architecture
- `README.md` - Project overview, setup instructions, and module catalog
- `USAGE.md` - End-user operation guide

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Architecture

**Modular Structure:**
- `src/App.tsx` - Main hub with module navigation
- `src/modules/` - Self-contained effect modules
  - `DuckSubtitle.tsx` - Duck subtitle animation (~1060 lines)

**Navigation Pattern:**
- State: `currentModule` (`"home"` | `"duck-subtitle"` | ...)
- Home shows module selection cards
- Each module has a back button in header

## Path Aliases

```typescript
"@/*" → "src/*"
```

## Critical Rules (Duck Subtitle Module)

### Design Constraints (DO NOT BREAK)

1. **Whole-sentence rendering**: NEVER split Chinese text into words or characters
2. **Deterministic layout**: Same SRT + resolution = same positions (uses `hashString()` for seeded randomness)
3. **Geometric purity**: Attachment logic never breaks; shifts only move the entire subtitle group
4. **No double rendering**: During rotation transitions, show static OR rotating version, never both
5. **Fade before rotate**: Previous rotated group must fade to threshold before new rotation begins

### Core Animation Algorithm

1. **Grouping**: Every 3 subtitles = 1 group (`GROUP_SIZE = 3`)
2. **Attachment**: New subtitle's `top-left` attaches to previous subtitle's `bottom-left`
3. **Rotation**: Group rotates -90° around its bounding box's `bottom-left` pivot
4. **Center Constraint**: Subtitles shift to keep center within defined region
5. **Timing Compensation**: Each rotation adds `ROTATE_DURATION_FRAMES / FPS` seconds

### Key Functions

- `parseSrt()`: Converts SRT → `SubtitleCue[]` with frame timing
- `buildLayouts()`: Pre-calculates ALL positions before animation starts
- `SubtitleComposition`: Renders correct state at each frame via `useCurrentFrame()`
- `getCueEnterAnimation()`: Stable random animation selection using text hash

### Constants Reference

```typescript
FPS = 30                      // All frame calculations
ROTATE_DURATION_FRAMES = 16   // ~0.53 seconds per rotation
SHIFT_DURATION_FRAMES = 12    // ~0.4 seconds for shift
FONT_SIZE = 72                // Base font size
BOX_HEIGHT = 86               // Subtitle box height
ROTATE_FADE_PHASE = 0.45      // Fade starts at 45% of rotation
```

## Common Tasks

### Adding a New Effect Module

1. Create `src/modules/YourModule.tsx` with exported named component
2. Import in `src/App.tsx`
3. Add to `modules[]` array with card config (id, title, description, icon, color)
4. Add `ModuleId` type entry
5. Add navigation case in render logic

See `DESIGN.md` for detailed architecture.

### Duck Subtitle: Adding Enter Animation

1. Add name to `EnterAnimationName` type
2. Add option to `enterAnimationOptions[]`
3. Implement transform in `getEnterTransform()` switch
4. Use Remotion's `interpolate()` and `spring()` for easing

### Duck Subtitle: Adjusting Timing

- `ROTATE_DURATION_FRAMES` - rotation speed
- `SHIFT_DURATION_FRAMES` - center constraint speed
- `ROTATE_FADE_PHASE` - fade/rotate overlap timing
- `GROUP_SIZE` - subtitles per rotation (affects entire layout!)

### Layout Algorithm

`buildLayouts()` pre-calculates everything:
- First group: seeded random near center
- Same group: `y = prev.y + BOX_HEIGHT` (vertical stack)
- New group: attach to `rotatedBottomRight` of previous group
- All rotations use `rotateLeft90()` around `bottom-left` pivot

## Remotion Integration

Player key forces re-render on changes:
```typescript
key={`${srtText.length}-${durationInFrames}-${audioSrc ?? "no-audio"}-${resolutionId}-...`}
```

Layout recalculates when SRT, resolution, or center region changes.

## Testing

Manual testing workflow:
1. Load demo subtitles
2. Upload custom SRT + MP3
3. Verify sync
4. Test resolutions
5. Enable/disable animations
6. Drag center region
7. Check rotation every 3 subtitles
8. Verify fade before rotate

## Known Behaviors

- Audio duration determines final composition length
- Subtitle width estimated via CJK/ASCII counting (`estimateTextWidth()`)
- Center region normalized to 0.1-0.9 range
- Mouse drag requires `isDrawMode = true`
- Pointer capture ensures smooth drag outside bounds
- Center region displays as dashed border with value labels

## Visual Design

See `DESIGN.md` for complete UI specifications. Key patterns:

- Gradient buttons with icons and hover effects
- Card-based layouts with backdrop blur
- Color scheme: purple/pink/amber/yellow/cyan/blue/green
- Selected states: colored border + semi-transparent background
- All major actions have SVG icons

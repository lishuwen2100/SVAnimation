// DuckSubtitle Remotion Composition（纯渲染组件）

import { useMemo } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  type SubtitleCue,
  type Point,
  FPS,
  GROUP_SIZE,
  ROTATE_DURATION_FRAMES,
  SHIFT_DURATION_FRAMES,
  ROTATE_FADE_PHASE,
  buildLayouts,
  getCueEnterAnimation,
} from "./utils";

export type SubtitleCompositionProps = {
  cues: SubtitleCue[];
  audioSrc: string | null;
  compositionSize: {
    width: number;
    height: number;
  };
  centerRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
    show: boolean;
    manualPosition?: Point | null;
  };
};

const cueBaseClass =
  "absolute whitespace-nowrap text-[72px] leading-none font-black tracking-tight text-neutral-100";

/**
 * 获取入场动画的 transform
 */
const getEnterTransform = (
  animation: string,
  progress: number,
  frameSinceStart: number
): string => {
  if (animation === "slam-bounce") {
    const y = interpolate(progress, [0, 0.58, 0.8, 1], [-300, 22, -8, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const x = interpolate(progress, [0, 1], [10, 0]);
    return `translate(${x}px, ${y}px)`;
  }

  if (animation === "spin-scale") {
    const rotate = interpolate(progress, [0, 1], [180, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const scale = interpolate(progress, [0, 0.6, 1], [0.24, 1.14, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return `rotate(${rotate}deg) scale(${scale})`;
  }

  if (animation === "side-skew") {
    const x = interpolate(progress, [0, 1], [-280, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.out(Easing.cubic),
    });
    const skew = interpolate(progress, [0, 0.55, 1], [-30, 12, 0], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const scaleX = interpolate(progress, [0, 0.45, 1], [1.5, 0.76, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    return `translate(${x}px, 0px) skewX(${skew}deg) scaleX(${scaleX})`;
  }

  if (animation === "pop-shake") {
    const scale = interpolate(progress, [0, 0.4, 0.72, 1], [0.1, 1.22, 0.93, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const shake = Math.sin(frameSinceStart * 0.9) * interpolate(progress, [0, 0.55, 1], [20, 7, 0]);
    return `rotate(${shake}deg) scale(${scale})`;
  }

  if (animation === "bounce-sway") {
    const y = Math.sin(frameSinceStart * 0.8) * interpolate(progress, [0, 1], [26, 0]);
    const x = Math.sin(frameSinceStart * 1.1) * interpolate(progress, [0, 1], [32, 0]);
    return `translate(${x}px, ${y}px)`;
  }

  // Default animation
  const x = interpolate(progress, [0, 1], [30, 0]);
  const y = interpolate(progress, [0, 1], [12, 0]);
  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  return `translate(${x}px, ${y}px) scale(${scale})`;
};

/**
 * DuckSubtitle Composition 组件
 */
export const DuckSubtitleComposition = ({
  cues,
  audioSrc,
  compositionSize,
  centerRegion,
}: SubtitleCompositionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerRect = useMemo(
    () => ({
      left: centerRegion.x * compositionSize.width,
      top: centerRegion.y * compositionSize.height,
      width: centerRegion.width * compositionSize.width,
      height: centerRegion.height * compositionSize.height,
    }),
    [
      centerRegion.height,
      centerRegion.width,
      centerRegion.x,
      centerRegion.y,
      compositionSize.height,
      compositionSize.width,
    ]
  );

  const { cueLayouts, groups } = useMemo(
    () => buildLayouts(cues, compositionSize.width, compositionSize.height, centerRegion.manualPosition, centerRect),
    [compositionSize.height, compositionSize.width, cues, centerRegion.manualPosition, centerRect]
  );

  const boundaries = useMemo(
    () =>
      Array.from({ length: Math.max(groups.length - 1, 0) }, (_, index) => {
        const enteringGroup = index + 1;
        const firstCue = cues[enteringGroup * GROUP_SIZE];

        return {
          enteringGroup,
          startFrame: firstCue.startFrame - ROTATE_DURATION_FRAMES,
          endFrame: firstCue.startFrame,
        };
      }),
    [cues, groups.length]
  );

  const shiftSteps = useMemo(() => {
    let cumulativeX = 0;
    let cumulativeY = 0;

    const steps: {
      startFrame: number;
      endFrame: number;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
    }[] = [];

    for (let cueIndex = 0; cueIndex < cues.length; cueIndex += 1) {
      const layout = cueLayouts[cueIndex];

      const currentX = layout.x + cumulativeX;
      const currentY = layout.y + cumulativeY;

      const moveX = layout.targetX - currentX;
      const moveY = layout.targetY - currentY;

      if (Math.abs(moveX) > 0.5 || Math.abs(moveY) > 0.5) {
        steps.push({
          startFrame: cues[cueIndex].startFrame + 10,
          endFrame: cues[cueIndex].startFrame + 10 + SHIFT_DURATION_FRAMES,
          fromX: cumulativeX,
          fromY: cumulativeY,
          toX: cumulativeX + moveX,
          toY: cumulativeY + moveY,
        });

        cumulativeX += moveX;
        cumulativeY += moveY;
      }
    }

    return steps;
  }, [cueLayouts, cues]);

  const globalShift = useMemo(() => {
    let x = 0;
    let y = 0;

    for (const step of shiftSteps) {
      if (frame < step.startFrame) {
        break;
      }

      if (frame >= step.endFrame) {
        x = step.toX;
        y = step.toY;
        continue;
      }

      const progress = interpolate(frame, [step.startFrame, step.endFrame], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: Easing.out(Easing.cubic),
      });
      x = interpolate(progress, [0, 1], [step.fromX, step.toX]);
      y = interpolate(progress, [0, 1], [step.fromY, step.toY]);
      break;
    }

    return { x, y };
  }, [frame, shiftSteps]);

  const transitionBoundary = boundaries.find(
    (boundary) => frame >= boundary.startFrame && frame < boundary.endFrame
  );

  const lastStartedCueIndex = cues.reduce((lastIndex, cue, idx) => {
    if (frame >= cue.startFrame) return idx;
    return lastIndex;
  }, -1);

  const currentGroupIndex = lastStartedCueIndex >= 0 ? Math.floor(lastStartedCueIndex / GROUP_SIZE) : 0;
  const showActiveCues = !transitionBoundary && lastStartedCueIndex >= 0;

  const activeStartCue = currentGroupIndex * GROUP_SIZE;
  const activeCueIndexes = showActiveCues
    ? Array.from({ length: lastStartedCueIndex - activeStartCue + 1 }, (_, idx) => activeStartCue + idx)
    : [];

  const staticRotatedGroupIndex =
    !transitionBoundary && currentGroupIndex > 0 ? currentGroupIndex - 1 : null;
  const rotatingGroupIndex = transitionBoundary ? transitionBoundary.enteringGroup - 1 : null;
  const outgoingRotatedGroupIndex = transitionBoundary ? transitionBoundary.enteringGroup - 2 : null;
  const hasOutgoingRotated = outgoingRotatedGroupIndex !== null && outgoingRotatedGroupIndex >= 0;

  const transitionProgress = transitionBoundary
    ? interpolate(frame, [transitionBoundary.startFrame, transitionBoundary.endFrame], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      })
    : null;

  const rotatingAngle =
    transitionProgress === null
      ? 0
      : hasOutgoingRotated
      ? interpolate(transitionProgress, [ROTATE_FADE_PHASE, 1], [0, -90], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.24, 0.88, 0.32, 1),
        })
      : interpolate(transitionProgress, [0, 1], [0, -90], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
          easing: Easing.bezier(0.24, 0.88, 0.32, 1),
        });

  const outgoingOpacity =
    transitionProgress === null
      ? 1
      : interpolate(transitionProgress, [0, ROTATE_FADE_PHASE], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });

  const renderGroup = (groupIndex: number, rotateDeg: number, opacity = 1) => {
    const group = groups[groupIndex];
    if (!group) return null;

    const groupCueIndexes = Array.from(
      { length: group.endCueIndex - group.startCueIndex + 1 },
      (_, idx) => group.startCueIndex + idx
    );

    return (
      <div
        key={`group-${groupIndex}-${rotateDeg}-${opacity}`}
        className="absolute inset-0"
        style={{
          opacity,
          transformOrigin: `${group.pivot.x}px ${group.pivot.y}px`,
          transform: `rotate(${rotateDeg}deg)`,
        }}
      >
        {groupCueIndexes.map((cueIndex) => {
          const layout = cueLayouts[cueIndex];
          const cue = cues[cueIndex];
          return (
            <div
              key={`rotated-cue-${cueIndex}`}
              className={cueBaseClass}
              style={{
                left: layout.x,
                top: layout.y,
                fontSize: cue.fontSize ? `${cue.fontSize}px` : undefined,
                fontFamily: cue.fontFamily || "'Source Han Sans CN', sans-serif",
                textShadow: "0 4px 0 rgba(0,0,0,0.22)",
              }}
            >
              {cue.text}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <AbsoluteFill className="bg-neutral-900">
      {audioSrc ? <Audio src={audioSrc} /> : null}

      {centerRegion.show ? (
        <div
          className="absolute border-2 border-dashed border-yellow-300/80 pointer-events-none"
          style={{
            left: centerRect.left,
            top: centerRect.top,
            width: centerRect.width,
            height: centerRect.height,
          }}
        >
          <div className="absolute left-2 top-2 rounded bg-yellow-300/20 px-2 py-1 backdrop-blur-sm">
            <div className="text-xs font-bold text-yellow-300">中心区域</div>
            <div className="text-[10px] text-yellow-200/80">
              {Math.round(centerRegion.width * 100)}% × {Math.round(centerRegion.height * 100)}%
            </div>
          </div>
          <div className="absolute right-2 bottom-2 rounded bg-yellow-300/20 px-2 py-1 backdrop-blur-sm">
            <div className="text-[10px] text-yellow-200/80">
              X: {Math.round(centerRegion.x * 100)}% | Y: {Math.round(centerRegion.y * 100)}%
            </div>
          </div>
        </div>
      ) : null}

      {centerRegion.show ? (
        <>
          {cueLayouts.map((layout) => (
            <div
              key={`target-${layout.cueIndex}`}
              className="absolute pointer-events-none"
              style={{
                left: layout.targetX,
                top: layout.targetY,
                width: 8,
                height: 8,
              }}
            >
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <div className="text-[8px] text-red-400 whitespace-nowrap">{layout.cueIndex}</div>
            </div>
          ))}
        </>
      ) : null}

      <div
        className="absolute inset-0"
        style={{ transform: `translate(${globalShift.x}px, ${globalShift.y}px)` }}
      >
        {hasOutgoingRotated && transitionBoundary
          ? renderGroup(outgoingRotatedGroupIndex, -90, outgoingOpacity)
          : null}

        {staticRotatedGroupIndex !== null ? renderGroup(staticRotatedGroupIndex, -90, 1) : null}

        {rotatingGroupIndex !== null && transitionBoundary
          ? renderGroup(rotatingGroupIndex, rotatingAngle)
          : null}

        {!transitionBoundary
          ? activeCueIndexes.map((cueIndex, visualIndex) => {
              const cue = cues[cueIndex];
              const layout = cueLayouts[cueIndex];
              const isLatest = cueIndex === activeCueIndexes[activeCueIndexes.length - 1];
              const frameSinceStart = Math.max(0, frame - cue.startFrame);
              const animation = isLatest ? getCueEnterAnimation(cue) : "default";

              const enter = spring({
                frame: frameSinceStart,
                fps,
                config: {
                  damping: 14,
                  stiffness: 170,
                  mass: 0.7,
                },
              });

              return (
                <div
                  key={`active-cue-${cue.id}`}
                  className={cueBaseClass}
                  style={{
                    left: layout.x,
                    top: layout.y,
                    fontSize: cue.fontSize ? `${cue.fontSize}px` : undefined,
                    fontFamily: cue.fontFamily || "'Source Han Sans CN', sans-serif",
                    opacity:
                      interpolate(enter, [0, 1], [0, 1]) * interpolate(visualIndex, [0, 2], [1, 0.54]),
                    transform: getEnterTransform(animation, enter, frameSinceStart),
                    filter: `blur(${interpolate(enter, [0, 1], [8, 0])}px)`,
                    textShadow: "0 4px 0 rgba(0,0,0,0.22)",
                    color: isLatest ? "#f5f5f5" : "#dadada",
                  }}
                >
                  {cue.text}
                </div>
              );
            })
          : null}
      </div>
    </AbsoluteFill>
  );
};

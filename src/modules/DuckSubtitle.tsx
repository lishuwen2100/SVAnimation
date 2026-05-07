import { Player } from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  Easing,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

type SubtitleCue = {
  id: number;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  text: string;
};

type Point = {
  x: number;
  y: number;
};

type CueLayout = {
  cueIndex: number;
  groupIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type GroupLayout = {
  groupIndex: number;
  startCueIndex: number;
  endCueIndex: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  pivot: Point;
  rotatedBottomRight: Point;
};

type SubtitleCompositionProps = {
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
  };
  selectedAnimations: EnterAnimationName[];
};

type EnterAnimationName =
  | "slam-bounce"
  | "spin-scale"
  | "side-skew"
  | "pop-shake"
  | "bounce-sway";

type EnterAnimationOption = {
  id: EnterAnimationName;
  label: string;
};

type ResolutionOption = {
  id: string;
  label: string;
  width: number;
  height: number;
};

const FPS = 30;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const GROUP_SIZE = 3;
const ROTATE_DURATION_FRAMES = 16;
const SHIFT_DURATION_FRAMES = 12;
const FONT_SIZE = 72;
const BOX_HEIGHT = 86;
const ROTATE_FADE_PHASE = 0.45;

const enterAnimationOptions: EnterAnimationOption[] = [
  { id: "slam-bounce", label: "砸入弹跳" },
  { id: "spin-scale", label: "旋转缩放" },
  { id: "side-skew", label: "侧滑扭曲" },
  { id: "pop-shake", label: "弹出抖动" },
  { id: "bounce-sway", label: "弹跳摇摆" },
];

const resolutionOptions: ResolutionOption[] = [
  { id: "1080p", label: "1920 x 1080 (Full HD)", width: 1920, height: 1080 },
  { id: "720p", label: "1280 x 720 (HD)", width: 1280, height: 720 },
  { id: "square", label: "1080 x 1080 (Square)", width: 1080, height: 1080 },
  { id: "portrait", label: "1080 x 1920 (Vertical)", width: 1080, height: 1920 },
  { id: "2k", label: "2560 x 1440 (2K)", width: 2560, height: 1440 },
];

const demoSrt = `1
00:00:00,000 --> 00:00:01,200
倒鸭子字幕开始了

2
00:00:01,300 --> 00:00:02,400
整条中文一句一句出现

3
00:00:02,500 --> 00:00:03,700
先在中央稳稳站住

4
00:00:04,000 --> 00:00:05,100
前三条先向左旋转九十度

5
00:00:05,300 --> 00:00:06,300
新的字幕贴着它继续往下

6
00:00:06,500 --> 00:00:07,700
再下一轮时旧旋转块消失

7
00:00:08,000 --> 00:00:09,300
动画过渡自然又有冲击感

8
00:00:09,500 --> 00:00:10,800
这就是类似Typemonkey的节奏

9
00:00:11,000 --> 00:00:12,200
你可以直接换成自己的字幕`;

const parseSrtTime = (value: string): number => {
  const match = value.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  const [, hh, mm, ss, ms] = match;
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
};

const parseSrt = (content: string): SubtitleCue[] => {
  const blocks = content
    .replace(/\r/g, "")
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  const rawCues = blocks
    .map((block, index) => {
      const lines = block.split("\n").map((line) => line.trim());
      const timeLine = lines.find((line) => line.includes("-->"));
      if (!timeLine) return null;

      const [start, end] = timeLine.split("-->").map((part) => part.trim());
      const startSec = parseSrtTime(start);
      const endSec = parseSrtTime(end);
      const textStart = lines.findIndex((line) => line.includes("-->")) + 1;
      const text = lines.slice(textStart).join(" ").trim();
      if (!text) return null;

      return {
        id: index,
        startSec,
        endSec,
        text,
      };
    })
    .filter((cue): cue is Omit<SubtitleCue, "startFrame" | "endFrame"> => cue !== null)
    .sort((a, b) => a.startSec - b.startSec);

  return rawCues.map((cue, idx) => {
    const groupDelay = Math.floor(idx / GROUP_SIZE) * (ROTATE_DURATION_FRAMES / FPS);
    const adjustedStart = cue.startSec + groupDelay;
    const adjustedEnd = cue.endSec + groupDelay;
    const startFrame = Math.round(adjustedStart * FPS);
    const endFrame = Math.max(startFrame + 12, Math.round(adjustedEnd * FPS));

    return {
      ...cue,
      startFrame,
      endFrame,
    };
  });
};

const hashString = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

const seededRange = (seed: number, min: number, max: number) => {
  const n = Math.abs(Math.sin(seed * 9999.17));
  return min + n * (max - min);
};

const estimateTextWidth = (text: string) => {
  let cjkCount = 0;
  let asciiCount = 0;

  for (const char of text) {
    if (/^[\u4e00-\u9fff]$/u.test(char)) {
      cjkCount += 1;
    } else if (char.trim()) {
      asciiCount += 1;
    }
  }

  return Math.max(220, cjkCount * FONT_SIZE * 0.96 + asciiCount * FONT_SIZE * 0.58 + 28);
};

const rotateLeft90 = (point: Point, pivot: Point): Point => {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x + dy,
    y: pivot.y - dx,
  };
};

const buildLayouts = (cues: SubtitleCue[], width: number, height: number) => {
  const cueLayouts: CueLayout[] = [];
  const groups: GroupLayout[] = [];
  const groupCount = Math.ceil(cues.length / GROUP_SIZE);
  const seed = hashString(cues.map((cue) => cue.text).join("|"));

  const firstX = seededRange(seed, width * 0.36, width * 0.49);
  const firstY = seededRange(seed + 7, height * 0.34, height * 0.45);

  let nextGroupAnchor: Point | null = null;

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const startCueIndex = groupIndex * GROUP_SIZE;
    const endCueIndex = Math.min(startCueIndex + GROUP_SIZE - 1, cues.length - 1);

    for (let cueIndex = startCueIndex; cueIndex <= endCueIndex; cueIndex += 1) {
      const width = estimateTextWidth(cues[cueIndex].text);

      if (cueIndex === startCueIndex) {
        if (groupIndex === 0) {
          cueLayouts.push({
            cueIndex,
            groupIndex,
            x: firstX,
            y: firstY,
            width,
            height: BOX_HEIGHT,
          });
        } else {
          const anchor = nextGroupAnchor ?? { x: firstX, y: firstY + BOX_HEIGHT };
          cueLayouts.push({
            cueIndex,
            groupIndex,
            x: anchor.x,
            y: anchor.y - BOX_HEIGHT,
            width,
            height: BOX_HEIGHT,
          });
        }
      } else {
        const prev = cueLayouts[cueIndex - 1];
        cueLayouts.push({
          cueIndex,
          groupIndex,
          x: prev.x,
          y: prev.y + BOX_HEIGHT,
          width,
          height: BOX_HEIGHT,
        });
      }
    }

    const groupCueLayouts = cueLayouts.slice(startCueIndex, endCueIndex + 1);
    const minX = groupCueLayouts[0].x;
    const minY = groupCueLayouts[0].y;
    const maxX = Math.max(...groupCueLayouts.map((layout) => layout.x + layout.width));
    const maxY = groupCueLayouts[groupCueLayouts.length - 1].y + BOX_HEIGHT;
    const pivot = { x: minX, y: maxY };

    const corners = [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: minX, y: maxY },
      { x: maxX, y: maxY },
    ].map((point) => rotateLeft90(point, pivot));

    const rotatedBottomRight = {
      x: Math.max(...corners.map((point) => point.x)),
      y: Math.max(...corners.map((point) => point.y)),
    };

    nextGroupAnchor = rotatedBottomRight;

    groups.push({
      groupIndex,
      startCueIndex,
      endCueIndex,
      minX,
      maxX,
      minY,
      maxY,
      pivot,
      rotatedBottomRight,
    });
  }

  return {
    cueLayouts,
    groups,
  };
};

const cueBaseClass =
  "absolute whitespace-nowrap text-[72px] leading-none font-black tracking-tight text-neutral-100";

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const getCueEnterAnimation = (
  cue: SubtitleCue,
  selectedAnimations: EnterAnimationName[]
): EnterAnimationName | "default" => {
  if (selectedAnimations.length === 0) return "default";
  const hash = hashString(`${cue.id}-${cue.text}`);
  return selectedAnimations[hash % selectedAnimations.length];
};

const getEnterTransform = (
  animation: EnterAnimationName | "default",
  progress: number,
  frameSinceStart: number
) => {
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

  const x = interpolate(progress, [0, 1], [30, 0]);
  const y = interpolate(progress, [0, 1], [12, 0]);
  const scale = interpolate(progress, [0, 1], [0.9, 1]);
  return `translate(${x}px, ${y}px) scale(${scale})`;
};

const SubtitleComposition = ({
  cues,
  audioSrc,
  compositionSize,
  centerRegion,
  selectedAnimations,
}: SubtitleCompositionProps) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const { cueLayouts, groups } = useMemo(
    () => buildLayouts(cues, compositionSize.width, compositionSize.height),
    [compositionSize.height, compositionSize.width, cues]
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
      const centerX = layout.x + layout.width / 2 + cumulativeX;
      const centerY = layout.y + layout.height / 2 + cumulativeY;

      const targetCenterX = clamp(centerX, centerRect.left, centerRect.left + centerRect.width);
      const targetCenterY = clamp(centerY, centerRect.top, centerRect.top + centerRect.height);
      const moveX = targetCenterX - centerX;
      const moveY = targetCenterY - centerY;

      if (moveX !== 0 || moveY !== 0) {
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
  }, [centerRect.height, centerRect.left, centerRect.top, centerRect.width, cueLayouts, cues]);

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

  const rotatingAngle = transitionProgress === null
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

  const outgoingOpacity = transitionProgress === null
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
          return (
            <div
              key={`rotated-cue-${cueIndex}`}
              className={cueBaseClass}
              style={{
                left: layout.x,
                top: layout.y,
                textShadow: "0 4px 0 rgba(0,0,0,0.22)",
              }}
            >
              {cues[cueIndex].text}
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

      <div
        className="absolute inset-0"
        style={{ transform: `translate(${globalShift.x}px, ${globalShift.y}px)` }}
      >

      {hasOutgoingRotated && transitionBoundary
        ? renderGroup(
            outgoingRotatedGroupIndex,
            -90,
            outgoingOpacity
          )
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
            const animation = isLatest ? getCueEnterAnimation(cue, selectedAnimations) : "default";

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
                  opacity: interpolate(enter, [0, 1], [0, 1]) * interpolate(visualIndex, [0, 2], [1, 0.54]),
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

export function DuckSubtitle() {
  const [srtText, setSrtText] = useState(demoSrt);
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [centerRegion, setCenterRegion] = useState({
    x: 0.28,
    y: 0.28,
    width: 0.44,
    height: 0.42,
    show: true,
  });
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [selectedAnimations, setSelectedAnimations] = useState<EnterAnimationName[]>([]);
  const [resolutionId, setResolutionId] = useState("720p");

  const selectedResolution =
    resolutionOptions.find((option) => option.id === resolutionId) ?? {
      id: "default",
      label: "1280 x 720",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };

  const cues = useMemo(() => parseSrt(srtText), [srtText]);

  const durationInFrames = useMemo(() => {
    const subtitleFrames = cues.length > 0 ? cues[cues.length - 1].endFrame + FPS * 2 : FPS * 8;
    const audioFrames = audioDuration > 0 ? Math.ceil(audioDuration * FPS) : 0;
    return Math.max(subtitleFrames, audioFrames, FPS * 8);
  }, [audioDuration, cues]);

  const handleSrtUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setSrtText(text);
  };

  const handleAudioUpload = (file: File | null) => {
    if (!file) return;

    if (audioSrc) {
      URL.revokeObjectURL(audioSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };
    setAudioSrc(objectUrl);
  };

  useEffect(
    () => () => {
      if (audioSrc) URL.revokeObjectURL(audioSrc);
    },
    [audioSrc]
  );

  const normalizeRegion = (next: { x: number; y: number; width: number; height: number; show: boolean }) => {
    const width = clamp(next.width, 0.1, 0.9);
    const height = clamp(next.height, 0.1, 0.9);
    const x = clamp(next.x, 0, 1 - width);
    const y = clamp(next.y, 0, 1 - height);

    return {
      ...next,
      x,
      y,
      width,
      height,
    };
  };

  const updateCenterRegion = (key: "x" | "y" | "width" | "height", value: number) => {
    setCenterRegion((prev) => ({
      ...normalizeRegion({
        ...prev,
        [key]: value,
      }),
    }));
  };

  const getLocalPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
      width: rect.width,
      height: rect.height,
    };
  };

  const handleOverlayPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawMode) return;
    if (event.button !== 0) return;
    const point = getLocalPoint(event);
    if (!point) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: point.x, y: point.y };
    setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawMode) return;
    if (!dragStartRef.current) return;
    const point = getLocalPoint(event);
    if (!point) return;

    const x = Math.min(dragStartRef.current.x, point.x);
    const y = Math.min(dragStartRef.current.y, point.y);
    const width = Math.abs(point.x - dragStartRef.current.x);
    const height = Math.abs(point.y - dragStartRef.current.y);
    setDraftRect({ x, y, width, height });
  };

  const handleOverlayPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawMode) return;
    if (!dragStartRef.current) return;
    const point = getLocalPoint(event);
    dragStartRef.current = null;

    if (!point || !draftRect || draftRect.width < 8 || draftRect.height < 8) {
      setDraftRect(null);
      return;
    }

    const normalized = normalizeRegion({
      x: draftRect.x / point.width,
      y: draftRect.y / point.height,
      width: draftRect.width / point.width,
      height: draftRect.height / point.height,
      show: true,
    });

    setCenterRegion((prev) => ({ ...prev, ...normalized }));
    setDraftRect(null);
    setIsDrawMode(false);
  };

  const toggleAnimation = (id: EnterAnimationName, checked: boolean) => {
    setSelectedAnimations((prev) => {
      if (checked) {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  return (
    <div className="mx-auto grid w-full max-w-[1600px] gap-6 px-6 py-8 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="group relative inline-flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-purple-500/50 hover:scale-[1.02] active:scale-[0.98]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-sm font-semibold">导入 SRT</span>
            <input
              type="file"
              accept=".srt,text/plain"
              className="hidden"
              onChange={(event) => handleSrtUpload(event.target.files?.[0] ?? null)}
            />
          </label>

          <label className="group relative inline-flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-pink-500/50 hover:scale-[1.02] active:scale-[0.98]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-sm font-semibold">导入 MP3</span>
            <input
              type="file"
              accept="audio/mpeg,.mp3"
              className="hidden"
              onChange={(event) => handleAudioUpload(event.target.files?.[0] ?? null)}
            />
          </label>

          <button
            type="button"
            className="inline-flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:shadow-amber-500/50 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setSrtText(demoSrt)}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-semibold">恢复演示</span>
          </button>

          <button
            type="button"
            className={`inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 font-medium shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isDrawMode
                ? "bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:shadow-yellow-500/50"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
            onClick={() => {
              setIsDrawMode((prev) => !prev);
              setDraftRect(null);
              dragStartRef.current = null;
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
            <span className="text-sm font-semibold">{isDrawMode ? "退出框选" : "框选中心区域"}</span>
          </button>

          <button
            type="button"
            className="inline-flex items-center gap-2.5 rounded-lg bg-neutral-800 px-5 py-2.5 font-medium text-neutral-300 shadow-lg transition-all hover:bg-neutral-700 hover:scale-[1.02] active:scale-[0.98]"
            onClick={() => setCenterRegion((prev) => ({ ...prev, show: !prev.show }))}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="text-sm font-semibold">{centerRegion.show ? "隐藏框" : "显示框"}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
            <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="font-medium">{srtText === demoSrt ? "演示字幕" : "自定义字幕"}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
            <svg className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="font-medium">{audioSrc ? "有音频" : "无音频"}</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{cues.length} 条</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{(durationInFrames / FPS).toFixed(1)} 秒</span>
          </div>

          <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
            <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{selectedResolution.width}x{selectedResolution.height}</span>
          </div>
        </div>

          <main className="relative overflow-hidden border border-neutral-800">
            <Player
              key={`${srtText.length}-${durationInFrames}-${audioSrc ?? "no-audio"}-${resolutionId}-${centerRegion.x}-${centerRegion.y}-${centerRegion.width}-${centerRegion.height}-${centerRegion.show}-${selectedAnimations.join(",")}`}
              component={SubtitleComposition}
            inputProps={{
              cues,
              audioSrc,
              centerRegion,
              selectedAnimations,
              compositionSize: {
                width: selectedResolution.width,
                height: selectedResolution.height,
              },
            }}
              fps={FPS}
            compositionWidth={selectedResolution.width}
            compositionHeight={selectedResolution.height}
              durationInFrames={durationInFrames}
              controls
              style={{
                width: "100%",
              aspectRatio: `${selectedResolution.width}/${selectedResolution.height}`,
              }}
            />

            <div
              ref={overlayRef}
              className={`absolute inset-0 z-20 ${isDrawMode ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"}`}
              style={{ touchAction: "none" }}
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
            >
              {draftRect ? (
                <div
                  className="absolute border-2 border-yellow-300 bg-yellow-300/10"
                  style={{
                    left: draftRect.x,
                    top: draftRect.y,
                    width: draftRect.width,
                    height: draftRect.height,
                  }}
                />
              ) : null}
            </div>
          </main>
        </section>

        <aside className="space-y-3">
          <details open className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span>输出分辨率</span>
              </div>
            </summary>
            <div className="border-t border-neutral-800 px-4 py-3">
              <div className="grid gap-2">
                {resolutionOptions.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                      resolutionId === option.id
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                        : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolution"
                      checked={resolutionId === option.id}
                      onChange={() => setResolutionId(option.id)}
                      className="text-cyan-500"
                    />
                    <span className="text-sm font-medium">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>

          <details open className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                <span>中心区域设置</span>
              </div>
            </summary>
            <div className="border-t border-neutral-800 px-4 py-3">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">精准数值 (%)</div>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <label className="space-y-1.5">
                      <div className="text-xs font-medium text-neutral-300">X 位置</div>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        step={1}
                        value={Math.round(centerRegion.x * 100)}
                        onChange={(event) => updateCenterRegion("x", Number(event.target.value) / 100)}
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <div className="text-xs font-medium text-neutral-300">Y 位置</div>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        step={1}
                        value={Math.round(centerRegion.y * 100)}
                        onChange={(event) => updateCenterRegion("y", Number(event.target.value) / 100)}
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <div className="text-xs font-medium text-neutral-300">宽度</div>
                      <input
                        type="number"
                        min={10}
                        max={90}
                        step={1}
                        value={Math.round(centerRegion.width * 100)}
                        onChange={(event) => updateCenterRegion("width", Number(event.target.value) / 100)}
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      />
                    </label>

                    <label className="space-y-1.5">
                      <div className="text-xs font-medium text-neutral-300">高度</div>
                      <input
                        type="number"
                        min={10}
                        max={90}
                        step={1}
                        value={Math.round(centerRegion.height * 100)}
                        onChange={(event) => updateCenterRegion("height", Number(event.target.value) / 100)}
                        className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-1.5 text-sm text-neutral-100 focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </details>

          <details className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                </svg>
                <span>字幕进入动画</span>
              </div>
            </summary>
            <div className="border-t border-neutral-800 px-4 py-3">
              <div className="space-y-3">
                <div className="text-xs text-neutral-400">多选后随机，未勾选则使用默认进入动画</div>
                <div className="grid gap-2">
                  {enterAnimationOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                        selectedAnimations.includes(option.id)
                          ? "border-purple-500 bg-purple-500/10 text-purple-300"
                          : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAnimations.includes(option.id)}
                        onChange={(event) => toggleAnimation(option.id, event.target.checked)}
                        className="text-purple-500"
                      />
                      <span className="text-sm font-medium">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </details>
        </aside>
    </div>
  );
}
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
  fontFamily?: string;
  fontSize?: number;
  animation?: EnterAnimationName;
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
  fontSize: number;
  targetX: number; // 目标落点X
  targetY: number; // 目标落点Y
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
    manualPosition?: Point | null;
  };
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

type StylePreset = {
  id: string;
  label: string;
  fontFamily?: string;
  fontSize?: number;
  animation?: EnterAnimationName;
  description: string;
};

type SubtitleStyle = {
  fontFamily?: string;
  fontSize?: number;
  animation?: EnterAnimationName;
};

const FPS = 30;
const DEFAULT_WIDTH = 1280;
const DEFAULT_HEIGHT = 720;
const GROUP_SIZE = 3;
const ROTATE_DURATION_FRAMES = 16;
const SHIFT_DURATION_FRAMES = 12;
const FONT_SIZE = 72;
// @ts-expect-error - Legacy constant kept for documentation, now calculated dynamically
const BOX_HEIGHT = 86;
const ROTATE_FADE_PHASE = 0.45;

const fontFamilyOptions = [
  { id: "default", label: "默认字体", value: "ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", label: "宋体", value: "serif" },
  { id: "mono", label: "等宽", value: "ui-monospace, monospace" },
  { id: "kai", label: "楷体", value: "KaiTi, serif" },
  { id: "hei", label: "黑体", value: "SimHei, sans-serif" },
];

const stylePresets: StylePreset[] = [
  {
    id: "default",
    label: "标准",
    fontSize: 72,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    description: "默认样式",
  },
  {
    id: "large-bold",
    label: "大标题",
    fontSize: 96,
    fontFamily: "SimHei, sans-serif",
    description: "加大加粗",
  },
  {
    id: "small-subtitle",
    label: "小字幕",
    fontSize: 54,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    description: "紧凑显示",
  },
  {
    id: "elegant",
    label: "优雅",
    fontSize: 68,
    fontFamily: "KaiTi, serif",
    description: "楷体风格",
  },
];

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

const estimateTextWidth = (text: string, fontSize = FONT_SIZE) => {
  let cjkCount = 0;
  let asciiCount = 0;

  for (const char of text) {
    if (/^[\u4e00-\u9fff]$/u.test(char)) {
      cjkCount += 1;
    } else if (char.trim()) {
      asciiCount += 1;
    }
  }

  return Math.max(220, cjkCount * fontSize * 0.96 + asciiCount * fontSize * 0.58 + 28);
};

const calculateBoxHeight = (fontSize = FONT_SIZE) => {
  // BOX_HEIGHT \u76f8\u5bf9\u4e8e FONT_SIZE \u7684\u6bd4\u4f8b\u662f 86/72 \u2248 1.194
  return Math.ceil(fontSize * 1.194);
};

const rotateLeft90 = (point: Point, pivot: Point): Point => {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x + dy,
    y: pivot.y - dx,
  };
};

const buildLayouts = (
  cues: SubtitleCue[],
  width: number,
  height: number,
  manualPos?: Point | null,
  centerRect?: { left: number; top: number; width: number; height: number }
) => {
  const cueLayouts: CueLayout[] = [];
  const groups: GroupLayout[] = [];
  const groupCount = Math.ceil(cues.length / GROUP_SIZE);
  const seed = hashString(cues.map((cue) => cue.text).join("|"));

  let nextGroupAnchor: Point | null = null;

  for (let groupIndex = 0; groupIndex < groupCount; groupIndex += 1) {
    const startCueIndex = groupIndex * GROUP_SIZE;
    const endCueIndex = Math.min(startCueIndex + GROUP_SIZE - 1, cues.length - 1);

    for (let cueIndex = startCueIndex; cueIndex <= endCueIndex; cueIndex += 1) {
      const fontSize = cues[cueIndex].fontSize || FONT_SIZE;
      const cueWidth = estimateTextWidth(cues[cueIndex].text, fontSize);
      const cueHeight = calculateBoxHeight(fontSize);

      // 为每条字幕生成独立的目标落点(左上角顶点的位置)
      let targetX: number;
      let targetY: number;

      if (manualPos) {
        // 手动模式: 所有字幕都使用相同的手动选择位置
        targetX = manualPos.x;
        targetY = manualPos.y;
      } else if (centerRect) {
        // 随机模式: 在中心区域内为每条字幕随机生成落点
        const cueSeed = seed + cueIndex * 137;
        // 确保字幕完全在中心区域内: 左上角位置范围
        const maxX = Math.max(centerRect.left, centerRect.left + centerRect.width - cueWidth);
        const maxY = Math.max(centerRect.top, centerRect.top + centerRect.height - cueHeight);
        targetX = seededRange(cueSeed, centerRect.left, maxX);
        targetY = seededRange(cueSeed + 73, centerRect.top, maxY);
      } else {
        // 后备: 使用整个画布的中心区域
        targetX = seededRange(seed + cueIndex * 137, width * 0.3, width * 0.6);
        targetY = seededRange(seed + cueIndex * 137 + 73, height * 0.3, height * 0.6);
      }

      // 计算贴合位置(初始渲染位置)
      let x: number;
      let y: number;

      if (cueIndex === 0) {
        // 第一条字幕直接在落点
        x = targetX;
        y = targetY;
      } else if (cueIndex === startCueIndex && groupIndex > 0) {
        // 新组的第一条: 贴合到前一组旋转后的位置
        const anchor = nextGroupAnchor ?? { x: targetX, y: targetY };
        x = anchor.x;
        y = anchor.y;
      } else {
        // 贴合到前一条字幕的左下角 (左上角 -> 左下角)
        const prev = cueLayouts[cueIndex - 1];
        x = prev.x;
        y = prev.y + prev.height;
      }

      cueLayouts.push({
        cueIndex,
        groupIndex,
        x,
        y,
        width: cueWidth,
        height: cueHeight,
        fontSize,
        targetX,
        targetY,
      });
    }

    const groupCueLayouts = cueLayouts.slice(startCueIndex, endCueIndex + 1);
    const minX = groupCueLayouts[0].x;
    const minY = groupCueLayouts[0].y;
    const maxX = Math.max(...groupCueLayouts.map((layout) => layout.x + layout.width));
    const lastLayout = groupCueLayouts[groupCueLayouts.length - 1];
    const maxY = lastLayout.y + lastLayout.height;
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

const getCueEnterAnimation = (cue: SubtitleCue): EnterAnimationName | "default" => {
  // 如果字幕有自定义动画，使用自定义动画
  if (cue.animation) return cue.animation;

  // 否则从所有动画中随机选择一个
  const hash = hashString(`${cue.id}-${cue.text}`);
  const allAnimations = enterAnimationOptions.map((opt) => opt.id);
  return allAnimations[hash % allAnimations.length];
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

      // 计算当前字幕左上角的实际位置(包含累积偏移)
      const currentX = layout.x + cumulativeX;
      const currentY = layout.y + cumulativeY;

      // 检查左上角是否到达目标落点
      const moveX = layout.targetX - currentX;
      const moveY = layout.targetY - currentY;

      // 如果左上角不在目标落点,需要移动整组
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
          const cue = cues[cueIndex];
          return (
            <div
              key={`rotated-cue-${cueIndex}`}
              className={cueBaseClass}
              style={{
                left: layout.x,
                top: layout.y,
                fontSize: cue.fontSize ? `${cue.fontSize}px` : undefined,
                fontFamily: cue.fontFamily || undefined,
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

      {/* 调试: 显示每条字幕的目标落点 */}
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
              <div className="text-[8px] text-red-400 whitespace-nowrap">
                {layout.cueIndex}
              </div>
            </div>
          ))}
        </>
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
                  fontFamily: cue.fontFamily || undefined,
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
  const [centerRegion, setCenterRegion] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    show: boolean;
    manualPosition?: Point | null;
  }>({
    x: 0.28,
    y: 0.28,
    width: 0.44,
    height: 0.42,
    show: true,
    manualPosition: null,
  });
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(
    null
  );
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [resolutionId, setResolutionId] = useState("720p");
  const [subtitleStyles, setSubtitleStyles] = useState<Record<number, SubtitleStyle>>({});
  const [selectedCueIds, setSelectedCueIds] = useState<Set<number>>(new Set());
  const [expandedCueId, setExpandedCueId] = useState<number | null>(null);
  const [positionMode, setPositionMode] = useState<"random" | "manual">("random");
  const [isSelectingPosition, setIsSelectingPosition] = useState(false);

  const selectedResolution =
    resolutionOptions.find((option) => option.id === resolutionId) ?? {
      id: "default",
      label: "1280 x 720",
      width: DEFAULT_WIDTH,
      height: DEFAULT_HEIGHT,
    };

  const cues = useMemo(() => {
    const parsedCues = parseSrt(srtText);
    return parsedCues.map((cue) => ({
      ...cue,
      fontFamily: subtitleStyles[cue.id]?.fontFamily,
      fontSize: subtitleStyles[cue.id]?.fontSize,
      animation: subtitleStyles[cue.id]?.animation,
    }));
  }, [srtText, subtitleStyles]);

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
    const point = getLocalPoint(event);
    if (!point) return;

    if (isSelectingPosition) {
      if (event.button !== 0) return;
      // 点击选择字幕初始位置
      const normalizedX = point.x / point.width * selectedResolution.width;
      const normalizedY = point.y / point.height * selectedResolution.height;
      setCenterRegion((prev) => ({
        ...prev,
        manualPosition: { x: normalizedX, y: normalizedY },
      }));
      setIsSelectingPosition(false);
      setPositionMode("manual");
      return;
    }

    if (!isDrawMode) return;
    if (event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: point.x, y: point.y };
    setDraftRect({ x: point.x, y: point.y, width: 0, height: 0 });
  };

  const handleOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isSelectingPosition) return;
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
    if (isSelectingPosition) return;
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


  const updateSubtitleStyle = (
    cueId: number,
    key: "fontFamily" | "fontSize" | "animation",
    value: string | number | EnterAnimationName | undefined
  ) => {
    setSubtitleStyles((prev) => ({
      ...prev,
      [cueId]: {
        ...prev[cueId],
        [key]: value,
      },
    }));
  };

  const applyPresetToSelected = (preset: StylePreset) => {
    if (selectedCueIds.size === 0) return;
    setSubtitleStyles((prev) => {
      const updated = { ...prev };
      selectedCueIds.forEach((cueId) => {
        updated[cueId] = {
          fontFamily: preset.fontFamily,
          fontSize: preset.fontSize,
          animation: preset.animation,
        };
      });
      return updated;
    });
  };

  const applyPresetToAll = (preset: StylePreset) => {
    setSubtitleStyles((prev) => {
      const updated = { ...prev };
      cues.forEach((cue) => {
        updated[cue.id] = {
          fontFamily: preset.fontFamily,
          fontSize: preset.fontSize,
          animation: preset.animation,
        };
      });
      return updated;
    });
  };

  const toggleCueSelection = (cueId: number) => {
    setSelectedCueIds((prev) => {
      const next = new Set(prev);
      if (next.has(cueId)) {
        next.delete(cueId);
      } else {
        next.add(cueId);
      }
      return next;
    });
  };

  const selectAllCues = () => {
    setSelectedCueIds(new Set(cues.map((cue) => cue.id)));
  };

  const clearSelection = () => {
    setSelectedCueIds(new Set());
  };

  const resetStyles = () => {
    if (confirm("确定要重置所有字幕样式吗？")) {
      setSubtitleStyles({});
    }
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

          <button
            type="button"
            className={`inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 font-medium shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
              isSelectingPosition
                ? "bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:shadow-blue-500/50"
                : "bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
            }`}
            onClick={() => {
              setIsSelectingPosition((prev) => !prev);
              if (isDrawMode) {
                setIsDrawMode(false);
                setDraftRect(null);
                dragStartRef.current = null;
              }
            }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
            </svg>
            <span className="text-sm font-semibold">{isSelectingPosition ? "点击屏幕选择位置" : "设置字幕位置"}</span>
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
              key={`${srtText.length}-${durationInFrames}-${audioSrc ?? "no-audio"}-${resolutionId}-${centerRegion.x}-${centerRegion.y}-${centerRegion.width}-${centerRegion.height}-${centerRegion.show}-${centerRegion.manualPosition?.x ?? 'null'}-${centerRegion.manualPosition?.y ?? 'null'}`}
              component={SubtitleComposition}
            inputProps={{
              cues,
              audioSrc,
              centerRegion,
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
              className={`absolute inset-0 z-20 ${
                isDrawMode || isSelectingPosition ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"
              }`}
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
              {isSelectingPosition ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none">
                  <div className="text-center">
                    <div className="text-white text-lg font-semibold mb-2">点击选择字幕初始位置</div>
                    <div className="text-blue-300 text-sm">字幕将从您点击的位置开始显示</div>
                  </div>
                </div>
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
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
                </svg>
                <span>字幕位置设定</span>
              </div>
            </summary>
            <div className="border-t border-neutral-800 px-4 py-3">
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">位置模式</div>
                  <div className="grid gap-2">
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                        positionMode === "random"
                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                          : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="positionMode"
                        checked={positionMode === "random"}
                        onChange={() => {
                          setPositionMode("random");
                          setCenterRegion((prev) => ({ ...prev, manualPosition: null }));
                        }}
                        className="text-blue-500"
                      />
                      <div>
                        <div className="text-sm font-medium">随机位置</div>
                        <div className="text-xs text-neutral-500">使用算法计算的随机位置</div>
                      </div>
                    </label>
                    <label
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                        positionMode === "manual"
                          ? "border-blue-500 bg-blue-500/10 text-blue-300"
                          : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="positionMode"
                        checked={positionMode === "manual"}
                        onChange={() => setPositionMode("manual")}
                        className="text-blue-500"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium">手动位置</div>
                        <div className="text-xs text-neutral-500">点击屏幕选择字幕进入位置</div>
                      </div>
                    </label>
                  </div>
                </div>

                {positionMode === "manual" && (
                  <div className="space-y-2">
                    {centerRegion.manualPosition ? (
                      <div className="rounded-lg bg-blue-500/10 border border-blue-500/30 p-3">
                        <div className="text-xs font-medium text-blue-300 mb-1">已选择位置</div>
                        <div className="text-xs text-neutral-400">
                          X: {Math.round(centerRegion.manualPosition.x)}px,
                          Y: {Math.round(centerRegion.manualPosition.y)}px
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsSelectingPosition(true);
                            if (isDrawMode) {
                              setIsDrawMode(false);
                              setDraftRect(null);
                              dragStartRef.current = null;
                            }
                          }}
                          className="mt-2 w-full rounded-md bg-blue-500/20 px-2 py-1.5 text-xs text-blue-300 transition-colors hover:bg-blue-500/30"
                        >
                          重新选择
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectingPosition(true);
                          if (isDrawMode) {
                            setIsDrawMode(false);
                            setDraftRect(null);
                            dragStartRef.current = null;
                          }
                        }}
                        className="w-full rounded-lg bg-gradient-to-r from-blue-500 to-cyan-500 px-3 py-2 text-sm font-medium text-white transition-all hover:shadow-blue-500/50 hover:scale-[1.02]"
                      >
                        点击屏幕选择位置
                      </button>
                    )}
                  </div>
                )}
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

          <details open className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-800/50">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                <span>字幕样式设置</span>
              </div>
            </summary>
            <div className="border-t border-neutral-800 px-4 py-3">
              <div className="space-y-3">
                {/* 快速预设 */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">快速预设</div>
                  <div className="grid grid-cols-2 gap-2">
                    {stylePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPresetToAll(preset)}
                        className="group relative rounded-lg border border-neutral-700 bg-neutral-800/30 p-2 text-left transition-all hover:border-green-500 hover:bg-green-500/10"
                        title={preset.description}
                      >
                        <div className="text-xs font-medium text-neutral-200">{preset.label}</div>
                        <div className="text-[10px] text-neutral-500">{preset.fontSize}px</div>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => selectedCueIds.size > 0 && applyPresetToSelected(stylePresets[0])}
                      disabled={selectedCueIds.size === 0}
                      className="flex-1 rounded-md bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700 disabled:opacity-50 disabled:hover:bg-neutral-800"
                    >
                      应用到选中 ({selectedCueIds.size})
                    </button>
                    <button
                      type="button"
                      onClick={resetStyles}
                      className="rounded-md bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700"
                    >
                      重置全部
                    </button>
                  </div>
                </div>

                {/* 批量操作 */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">批量选择</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllCues}
                      className="flex-1 rounded-md bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700"
                    >
                      全选
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="flex-1 rounded-md bg-neutral-800 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700"
                    >
                      清空
                    </button>
                  </div>
                </div>

                {/* 字幕列表 */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-neutral-400">字幕列表</div>
                  <div className="max-h-64 space-y-1.5 overflow-y-auto">
                    {cues.map((cue) => {
                      const isSelected = selectedCueIds.has(cue.id);
                      const isExpanded = expandedCueId === cue.id;
                      const hasCustomStyle = subtitleStyles[cue.id]?.fontFamily || subtitleStyles[cue.id]?.fontSize || subtitleStyles[cue.id]?.animation;

                      return (
                        <div
                          key={cue.id}
                          className={`rounded-lg border transition-all ${
                            isSelected
                              ? "border-green-500 bg-green-500/10"
                              : "border-neutral-700 bg-neutral-800/30 hover:border-neutral-600"
                          }`}
                        >
                          <div className="flex items-center gap-2 p-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleCueSelection(cue.id)}
                              className="shrink-0 text-green-500"
                            />
                            <button
                              type="button"
                              onClick={() => setExpandedCueId(isExpanded ? null : cue.id)}
                              className="flex-1 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-neutral-300">
                                  #{cue.id + 1}
                                </span>
                                <span className="flex-1 truncate text-xs text-neutral-400">
                                  {cue.text}
                                </span>
                                {hasCustomStyle && (
                                  <span className="shrink-0 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-400">
                                    已设置
                                  </span>
                                )}
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() => setExpandedCueId(isExpanded ? null : cue.id)}
                              className="shrink-0 text-neutral-500 hover:text-neutral-300"
                            >
                              <svg
                                className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="border-t border-neutral-700 p-3 space-y-2">
                              <label className="space-y-1">
                                <div className="text-xs text-neutral-400">字体</div>
                                <select
                                  value={subtitleStyles[cue.id]?.fontFamily || ""}
                                  onChange={(event) => updateSubtitleStyle(cue.id, "fontFamily", event.target.value || undefined)}
                                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                  <option value="">默认</option>
                                  {fontFamilyOptions.map((font) => (
                                    <option key={font.id} value={font.value}>
                                      {font.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1">
                                <div className="text-xs text-neutral-400">字号 (px)</div>
                                <input
                                  type="number"
                                  min={24}
                                  max={200}
                                  step={2}
                                  placeholder="72"
                                  value={subtitleStyles[cue.id]?.fontSize || ""}
                                  onChange={(event) => updateSubtitleStyle(cue.id, "fontSize", event.target.value ? Number(event.target.value) : undefined)}
                                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                />
                              </label>
                              <label className="space-y-1">
                                <div className="text-xs text-neutral-400">进入动画</div>
                                <select
                                  value={subtitleStyles[cue.id]?.animation || ""}
                                  onChange={(event) => updateSubtitleStyle(cue.id, "animation", (event.target.value as EnterAnimationName) || undefined)}
                                  className="w-full rounded-md border border-neutral-700 bg-neutral-800 px-2 py-1.5 text-xs text-neutral-100 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                                >
                                  <option value="">随机</option>
                                  {enterAnimationOptions.map((anim) => (
                                    <option key={anim.id} value={anim.id}>
                                      {anim.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <button
                                type="button"
                                onClick={() => setSubtitleStyles((prev) => {
                                  const updated = { ...prev };
                                  delete updated[cue.id];
                                  return updated;
                                })}
                                className="w-full rounded-md bg-neutral-700 px-2 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-600"
                              >
                                重置此条
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </details>
        </aside>
    </div>
  );
}
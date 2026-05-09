// DuckSubtitle 工具函数和常量

export type SubtitleCue = {
  id: number;
  startSec: number;
  endSec: number;
  startFrame: number;
  endFrame: number;
  text: string;
  fontFamily?: string;
  fontSize?: number;
  animation?: EnterAnimationName;
  customPosition?: Point | null;
};

export type Point = {
  x: number;
  y: number;
};

export type CueLayout = {
  cueIndex: number;
  groupIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  targetX: number;
  targetY: number;
};

export type GroupLayout = {
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

export type EnterAnimationName =
  | "slam-bounce"
  | "spin-scale"
  | "side-skew"
  | "pop-shake"
  | "bounce-sway";

export type EnterAnimationOption = {
  id: EnterAnimationName;
  label: string;
};

export type ResolutionOption = {
  id: string;
  label: string;
  width: number;
  height: number;
};

export type StylePreset = {
  id: string;
  label: string;
  fontFamily?: string;
  fontSize?: number;
  animation?: EnterAnimationName;
  positionMode?: "random" | "manual";
  manualPosition?: Point | null;
  description: string;
};

export type SubtitleStyle = {
  fontFamily?: string;
  fontSize?: number;
  animation?: EnterAnimationName;
  customPosition?: Point | null;
};

// 常量
export const FPS = 30;
export const DEFAULT_WIDTH = 1280;
export const DEFAULT_HEIGHT = 720;
export const GROUP_SIZE = 3;
export const ROTATE_DURATION_FRAMES = 16;
export const SHIFT_DURATION_FRAMES = 12;
export const FONT_SIZE = 72;
export const ROTATE_FADE_PHASE = 0.45;

// 字体选项
export const fontFamilyOptions = [
  { id: "default", label: "默认字体", value: "ui-sans-serif, system-ui, sans-serif" },
  { id: "serif", label: "宋体", value: "serif" },
  { id: "mono", label: "等宽", value: "ui-monospace, monospace" },
  { id: "kai", label: "楷体", value: "KaiTi, serif" },
  { id: "hei", label: "黑体", value: "SimHei, sans-serif" },
];

// 样式预设
export const stylePresets: StylePreset[] = [
  {
    id: "default",
    label: "标准",
    fontSize: 72,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    positionMode: "random",
    description: "默认样式 + 随机位置",
  },
  {
    id: "large-bold",
    label: "大标题",
    fontSize: 96,
    fontFamily: "SimHei, sans-serif",
    positionMode: "random",
    description: "加大加粗 + 随机位置",
  },
  {
    id: "small-subtitle",
    label: "小字幕",
    fontSize: 54,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    positionMode: "random",
    description: "紧凑显示 + 随机位置",
  },
  {
    id: "elegant",
    label: "优雅",
    fontSize: 68,
    fontFamily: "KaiTi, serif",
    positionMode: "random",
    description: "楷体风格 + 随机位置",
  },
  {
    id: "center-fixed",
    label: "中心固定",
    fontSize: 72,
    fontFamily: "ui-sans-serif, system-ui, sans-serif",
    positionMode: "manual",
    manualPosition: null,
    description: "居中固定位置",
  },
];

// 入场动画选项
export const enterAnimationOptions: EnterAnimationOption[] = [
  { id: "slam-bounce", label: "砸入弹跳" },
  { id: "spin-scale", label: "旋转缩放" },
  { id: "side-skew", label: "侧滑扭曲" },
  { id: "pop-shake", label: "弹出抖动" },
  { id: "bounce-sway", label: "弹跳摇摆" },
];

// 分辨率选项
export const resolutionOptions: ResolutionOption[] = [
  { id: "720p", label: "1280 x 720 (HD)", width: 1280, height: 720 },
  { id: "1080p", label: "1920 x 1080 (Full HD)", width: 1920, height: 1080 },
  { id: "2k", label: "2560 x 1440 (2K)", width: 2560, height: 1440 },
  { id: "4k", label: "3840 x 2160 (4K)", width: 3840, height: 2160 },
  { id: "square-720", label: "720 x 720 (Square)", width: 720, height: 720 },
  { id: "square-1080", label: "1080 x 1080 (Square)", width: 1080, height: 1080 },
  { id: "portrait-720", label: "720 x 1280 (Vertical HD)", width: 720, height: 1280 },
  { id: "portrait-1080", label: "1080 x 1920 (Vertical Full HD)", width: 1080, height: 1920 },
  { id: "ultrawide", label: "2560 x 1080 (Ultrawide)", width: 2560, height: 1080 },
];

// Demo SRT 文本
export const demoSrt = `1
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

/**
 * 解析 SRT 时间戳
 */
export const parseSrtTime = (value: string): number => {
  const match = value.trim().match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  const [, hh, mm, ss, ms] = match;
  return Number(hh) * 3600 + Number(mm) * 60 + Number(ss) + Number(ms) / 1000;
};

/**
 * 解析 SRT 内容为字幕数组
 */
export const parseSrt = (content: string): SubtitleCue[] => {
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

/**
 * 字符串哈希函数
 */
export const hashString = (value: string): number => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
};

/**
 * 带种子的随机数生成
 */
export const seededRange = (seed: number, min: number, max: number): number => {
  const n = Math.abs(Math.sin(seed * 9999.17));
  return min + n * (max - min);
};

/**
 * 估算文本宽度
 */
export const estimateTextWidth = (text: string, fontSize = FONT_SIZE): number => {
  let cjkCount = 0;
  let asciiCount = 0;

  for (const char of text) {
    if (/^[一-鿿]$/u.test(char)) {
      cjkCount += 1;
    } else if (char.trim()) {
      asciiCount += 1;
    }
  }

  return Math.max(220, cjkCount * fontSize * 0.96 + asciiCount * fontSize * 0.58 + 28);
};

/**
 * 计算字幕框高度
 */
export const calculateBoxHeight = (fontSize = FONT_SIZE): number => {
  return Math.ceil(fontSize * 1.194);
};

/**
 * 左旋90度
 */
export const rotateLeft90 = (point: Point, pivot: Point): Point => {
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return {
    x: pivot.x + dy,
    y: pivot.y - dx,
  };
};

/**
 * 构建字幕布局
 */
export const buildLayouts = (
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

      let targetX: number;
      let targetY: number;

      if (cues[cueIndex].customPosition) {
        targetX = cues[cueIndex].customPosition!.x;
        targetY = cues[cueIndex].customPosition!.y;
      } else if (manualPos) {
        targetX = manualPos.x;
        targetY = manualPos.y;
      } else if (centerRect) {
        const cueSeed = seed + cueIndex * 137;
        const maxX = Math.max(centerRect.left, centerRect.left + centerRect.width - cueWidth);
        const maxY = Math.max(centerRect.top, centerRect.top + centerRect.height - cueHeight);
        targetX = seededRange(cueSeed, centerRect.left, maxX);
        targetY = seededRange(cueSeed + 73, centerRect.top, maxY);
      } else {
        targetX = seededRange(seed + cueIndex * 137, width * 0.3, width * 0.6);
        targetY = seededRange(seed + cueIndex * 137 + 73, height * 0.3, height * 0.6);
      }

      let x: number;
      let y: number;

      if (cueIndex === 0) {
        x = targetX;
        y = targetY;
      } else if (cueIndex === startCueIndex && groupIndex > 0) {
        const anchor = nextGroupAnchor ?? { x: targetX, y: targetY };
        x = anchor.x;
        y = anchor.y;
      } else {
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

/**
 * 限制数值范围
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * 获取字幕的入场动画
 */
export const getCueEnterAnimation = (cue: SubtitleCue): EnterAnimationName | "default" => {
  if (cue.animation) return cue.animation;

  const hash = hashString(`${cue.id}-${cue.text}`);
  const allAnimations = enterAnimationOptions.map((opt) => opt.id);
  return allAnimations[hash % allAnimations.length];
};

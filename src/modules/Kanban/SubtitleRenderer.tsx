// 字幕渲染组件 - 处理单条字幕的显示和动画

import { useCurrentFrame } from "remotion";
import { interpolate, spring } from "remotion";
import type { KanbanSubtitle } from "@/types/workflow";

export interface SubtitleRendererProps {
  subtitle: KanbanSubtitle;
  fps: number;
}

export function SubtitleRenderer({ subtitle, fps }: SubtitleRendererProps) {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // 计算字幕是否应该显示
  const shouldShow =
    currentTime >= subtitle.enterTime &&
    (subtitle.exitTime === 0 || currentTime < subtitle.exitTime);

  if (!shouldShow) {
    return null;
  }

  // 计算相对帧（从进入时间开始）
  const relativeFrame = Math.max(0, frame - subtitle.enterTime * fps);

  // 进入动画（前 30 帧，约 1 秒）
  const enterDuration = 30;
  const enterProgress = Math.min(1, relativeFrame / enterDuration);

  // 获取进入动画变换
  const enterTransform = getEnterAnimationTransform(
    subtitle.animation,
    enterProgress,
    fps,
    relativeFrame
  );

  // 缩放动画
  let scaleTransform = {
    x: subtitle.position.x,
    y: subtitle.position.y,
    fontSize: subtitle.fontSize,
    scaleProgress: 0,
  };

  if (subtitle.scale.enabled) {
    const scaleStartFrame = subtitle.scale.delay * fps;
    const scaleDuration = 30; // 缩放动画持续 30 帧
    const scaleRelativeFrame = Math.max(0, relativeFrame - scaleStartFrame);
    const scaleProgress = Math.min(1, scaleRelativeFrame / scaleDuration);

    if (scaleRelativeFrame > 0) {
      // 使用 spring 创建平滑的缩放动画
      const springValue = spring({
        frame: scaleRelativeFrame,
        fps,
        config: {
          damping: 20,
          stiffness: 100,
          mass: 1,
        },
      });

      scaleTransform = {
        x: interpolate(
          springValue,
          [0, 1],
          [subtitle.position.x, subtitle.scale.position.x]
        ),
        y: interpolate(
          springValue,
          [0, 1],
          [subtitle.position.y, subtitle.scale.position.y]
        ),
        fontSize: interpolate(
          springValue,
          [0, 1],
          [subtitle.fontSize, subtitle.scale.fontSize]
        ),
        scaleProgress: springValue,
      };
    }
  }

  // 退出淡出动画
  let opacity = 1;
  if (subtitle.exitTime > 0) {
    const exitDuration = 15; // 退出动画持续 15 帧
    const timeToExit = subtitle.exitTime - currentTime;
    if (timeToExit < exitDuration / fps) {
      opacity = interpolate(timeToExit, [0, exitDuration / fps], [0, 1]);
    }
  }

  // 组合所有变换
  const finalOpacity = enterTransform.opacity * opacity;
  const finalTransform = `
    translate(${scaleTransform.x}px, ${scaleTransform.y}px)
    ${enterTransform.transform}
  `;

  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        transform: finalTransform,
        opacity: finalOpacity,
        color: subtitle.color,
        fontSize: `${scaleTransform.fontSize}px`,
        fontWeight: "bold",
        textShadow: `
          2px 2px 4px rgba(0, 0, 0, 0.8),
          -1px -1px 2px rgba(0, 0, 0, 0.5)
        `,
        whiteSpace: "pre-wrap",
        lineHeight: 1.2,
      }}
    >
      {subtitle.text}
    </div>
  );
}

/**
 * 获取进入动画变换
 */
function getEnterAnimationTransform(
  animation: string,
  progress: number,
  fps: number,
  relativeFrame: number
): { transform: string; opacity: number } {
  if (animation === "none") {
    return { transform: "", opacity: 1 };
  }

  const springValue = spring({
    frame: relativeFrame,
    fps,
    config: {
      damping: 20,
      stiffness: 100,
      mass: 1,
    },
  });

  switch (animation) {
    case "slam-bounce": {
      const scale = interpolate(springValue, [0, 1], [0.3, 1]);
      const rotate = interpolate(springValue, [0, 1], [15, 0]);
      return {
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity: interpolate(progress, [0, 0.2], [0, 1]),
      };
    }

    case "spin-scale": {
      const scale = interpolate(springValue, [0, 1], [0, 1]);
      const rotate = interpolate(springValue, [0, 1], [360, 0]);
      return {
        transform: `scale(${scale}) rotate(${rotate}deg)`,
        opacity: 1,
      };
    }

    case "side-skew": {
      const translateX = interpolate(springValue, [0, 1], [-100, 0]);
      const skewX = interpolate(springValue, [0, 1], [20, 0]);
      return {
        transform: `translateX(${translateX}px) skewX(${skewX}deg)`,
        opacity: interpolate(progress, [0, 0.2], [0, 1]),
      };
    }

    case "pop-shake": {
      const scale = interpolate(springValue, [0, 1], [0, 1]);
      const shake = Math.sin(relativeFrame * 0.5) * (1 - progress) * 5;
      return {
        transform: `scale(${scale}) translateX(${shake}px)`,
        opacity: interpolate(progress, [0, 0.1], [0, 1]),
      };
    }

    case "bounce-sway": {
      const translateY = interpolate(springValue, [0, 1], [50, 0]);
      const sway = Math.sin(relativeFrame * 0.3) * (1 - progress) * 10;
      return {
        transform: `translateY(${translateY}px) translateX(${sway}px)`,
        opacity: interpolate(progress, [0, 0.2], [0, 1]),
      };
    }

    default:
      return { transform: "", opacity: 1 };
  }
}

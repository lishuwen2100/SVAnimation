// 图片渲染组件

import { useCurrentFrame, interpolate, spring } from "remotion";
import type { KanbanImage } from "@/types/workflow";

export interface ImageRendererProps {
  image: KanbanImage;
  fps: number;
}

export function ImageRenderer({ image, fps }: ImageRendererProps) {
  const frame = useCurrentFrame();
  const currentTime = frame / fps;

  // 检查是否在显示时间范围内
  const shouldShow =
    currentTime >= image.enterTime &&
    (image.exitTime === 0 || currentTime <= image.exitTime);

  if (!shouldShow) {
    return null;
  }

  // 计算进入动画进度
  const enterProgress = Math.min((currentTime - image.enterTime) * fps, 30) / 30;

  // 计算移动动画
  let currentPosition = image.position;
  let currentSize = { width: image.width, height: image.height };

  if (image.move.enabled && currentTime >= image.move.startTime) {
    const moveElapsed = currentTime - image.move.startTime;
    const moveProgress = Math.min(moveElapsed / image.move.duration, 1);

    // 使用 spring 动画进行平滑移动
    const springProgress = spring({
      frame: (currentTime - image.move.startTime) * fps,
      fps,
      config: {
        damping: 20,
        stiffness: 100,
      },
    });

    const actualProgress = Math.min(springProgress, 1);

    currentPosition = {
      x: interpolate(actualProgress, [0, 1], [image.position.x, image.move.position.x]),
      y: interpolate(actualProgress, [0, 1], [image.position.y, image.move.position.y]),
    };

    currentSize = {
      width: interpolate(actualProgress, [0, 1], [image.width, image.move.width]),
      height: interpolate(actualProgress, [0, 1], [image.height, image.move.height]),
    };
  }

  // 进入动画样式
  const animationStyle = getAnimationStyle(image.animation, enterProgress);

  // 退出动画
  let exitOpacity = 1;
  if (image.exitTime > 0 && currentTime > image.exitTime - 0.5) {
    const exitProgress = (currentTime - (image.exitTime - 0.5)) / 0.5;
    exitOpacity = 1 - exitProgress;
  }

  return (
    <div
      style={{
        position: "absolute",
        left: currentPosition.x,
        top: currentPosition.y,
        width: currentSize.width,
        height: currentSize.height,
        opacity: Math.min(animationStyle.opacity, exitOpacity),
        transform: animationStyle.transform,
        pointerEvents: "none",
      }}
    >
      <img
        src={image.imageData}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

/**
 * 获取进入动画样式
 */
function getAnimationStyle(
  animation: KanbanImage["animation"],
  progress: number
): { opacity: number; transform: string } {
  const opacity = interpolate(progress, [0, 0.2], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  switch (animation) {
    case "slam-bounce": {
      const scale = spring({
        frame: progress * 30,
        fps: 30,
        config: { damping: 10, stiffness: 200 },
      });
      const rotate = interpolate(progress, [0, 0.3], [15, 0]);
      return {
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      };
    }

    case "spin-scale": {
      const scale = interpolate(progress, [0, 0.5], [0, 1]);
      const rotate = interpolate(progress, [0, 0.5], [360, 0]);
      return {
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      };
    }

    case "side-skew": {
      const translateX = interpolate(progress, [0, 0.5], [-100, 0]);
      const skewX = interpolate(progress, [0, 0.5], [20, 0]);
      return {
        opacity,
        transform: `translateX(${translateX}px) skewX(${skewX}deg)`,
      };
    }

    case "pop-shake": {
      const scale = spring({
        frame: progress * 30,
        fps: 30,
        config: { damping: 8, stiffness: 300 },
      });
      const rotate = Math.sin(progress * 30) * 5;
      return {
        opacity,
        transform: `scale(${scale}) rotate(${rotate}deg)`,
      };
    }

    case "bounce-sway": {
      const translateY = interpolate(progress, [0, 0.5], [-50, 0]);
      const bounce = spring({
        frame: progress * 30,
        fps: 30,
        config: { damping: 12, stiffness: 150 },
      });
      const rotate = Math.sin(progress * 30) * 10 * (1 - progress);
      return {
        opacity,
        transform: `translateY(${translateY * (1 - bounce)}px) rotate(${rotate}deg)`,
      };
    }

    default:
      return {
        opacity,
        transform: "none",
      };
  }
}

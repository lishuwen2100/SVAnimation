// Kanban 模块 Remotion Composition 组件

import { OffthreadVideo } from "remotion";
import type { KanbanSubtitle, KanbanImage } from "@/types/workflow";
import { SubtitleRenderer } from "./SubtitleRenderer";
import { ImageRenderer } from "./ImageRenderer";

export interface KanbanCompositionProps {
  videoSrc: string | null;
  compositionSize: {
    width: number;
    height: number;
  };
  subtitles?: KanbanSubtitle[];
  images?: KanbanImage[];
}

export function KanbanComposition({
  videoSrc,
  compositionSize,
  subtitles = [],
  images = [],
}: KanbanCompositionProps) {
  if (!videoSrc) {
    return (
      <div
        style={{
          width: compositionSize.width,
          height: compositionSize.height,
          backgroundColor: "#000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
          fontSize: 24,
          fontFamily: "sans-serif",
        }}
      >
        未导入视频
      </div>
    );
  }

  return (
    <div
      style={{
        width: compositionSize.width,
        height: compositionSize.height,
        backgroundColor: "#000",
        position: "relative",
      }}
    >
      {/* 视频层 */}
      <OffthreadVideo
        src={videoSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />

      {/* 图片层 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: compositionSize.width,
          height: compositionSize.height,
          pointerEvents: "none",
        }}
      >
        {images.map((image) => (
          <ImageRenderer key={image.id} image={image} fps={30} />
        ))}
      </div>

      {/* 字幕层 */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: compositionSize.width,
          height: compositionSize.height,
          pointerEvents: "none",
        }}
      >
        {subtitles.map((subtitle) => (
          <SubtitleRenderer key={subtitle.id} subtitle={subtitle} fps={30} />
        ))}
      </div>
    </div>
  );
}

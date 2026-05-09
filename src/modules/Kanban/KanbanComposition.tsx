// Kanban 模块 Remotion Composition 组件

import { OffthreadVideo } from "remotion";

export interface KanbanCompositionProps {
  videoSrc: string | null;
  compositionSize: {
    width: number;
    height: number;
  };
}

export function KanbanComposition({
  videoSrc,
  compositionSize,
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
      }}
    >
      <OffthreadVideo
        src={videoSrc}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </div>
  );
}

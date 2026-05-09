// Kanban Composition 包装器 - 处理 IndexedDB 视频加载

import { useEffect, useState } from "react";
import { KanbanComposition, type KanbanCompositionProps } from "./KanbanComposition";
import { getVideoUrl } from "@/utils/videoStorage";

export interface KanbanCompositionWrapperProps {
  videoId: string | null;
  compositionSize: {
    width: number;
    height: number;
  };
}

export function KanbanCompositionWrapper({
  videoId,
  compositionSize,
}: KanbanCompositionWrapperProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      if (videoId) {
        try {
          const url = await getVideoUrl(videoId);
          if (isMounted && url) {
            objectUrl = url;
            setVideoUrl(url);
          }
        } catch (error) {
          console.error("Failed to load video:", error);
        }
      }
      if (isMounted) {
        setIsLoading(false);
      }
    };

    loadVideo();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [videoId]);

  if (isLoading) {
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
        加载中...
      </div>
    );
  }

  return (
    <KanbanComposition
      videoSrc={videoUrl}
      compositionSize={compositionSize}
    />
  );
}

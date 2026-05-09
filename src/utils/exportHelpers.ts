// 导出辅助工具函数

import type { Workflow, WorkflowNode } from "@/types/workflow";
import { getVideo } from "./videoStorage";

/**
 * 导出配置选项
 */
export interface ExportOptions {
  width: number;
  height: number;
  fps: number;
  outputName: string;
}

/**
 * 视频信息
 */
export interface VideoInfo {
  id: string;
  fileName: string;
  blob: Blob;
  nodeId: string;
}

/**
 * 检查节点是否包含视频
 */
const hasVideo = (node: WorkflowNode): boolean => {
  return node.type === "kanban" && !!node.config.videoId;
};

/**
 * 从 IndexedDB 导出工作流中的所有视频
 */
export const exportVideosForRendering = async (workflow: Workflow): Promise<VideoInfo[]> => {
  const videos: VideoInfo[] = [];

  for (const node of workflow.nodes) {
    if (hasVideo(node)) {
      try {
        const videoBlob = await getVideo(node.config.videoId);
        if (videoBlob) {
          videos.push({
            id: node.config.videoId,
            fileName: node.config.videoFileName || `video-${node.config.videoId}.mp4`,
            blob: videoBlob,
            nodeId: node.id,
          });
        }
      } catch (error) {
        console.error(`Failed to export video for node ${node.id}:`, error);
      }
    }
  }

  return videos;
};

/**
 * 准备工作流用于渲染（将 videoId 替换为本地路径）
 */
export const prepareWorkflowForRender = (
  workflow: Workflow,
  videoPathMap: Record<string, string>
): Workflow => {
  // 深拷贝工作流
  const cloned: Workflow = JSON.parse(JSON.stringify(workflow));

  // 替换所有视频引用
  for (const node of cloned.nodes) {
    if (hasVideo(node) && node.config.videoId) {
      const localPath = videoPathMap[node.config.videoId];
      if (localPath) {
        // 用本地路径替换 videoId
        node.config.videoSrc = localPath;
        delete node.config.videoId;
      }
    }
  }

  return cloned;
};

/**
 * 生成导出命令
 */
export const generateExportCommand = (
  workflowName: string,
  options: ExportOptions
): string => {
  const jsonFileName = `${workflowName}-export.json`;
  const command = `npm run export ${jsonFileName} ${options.outputName} -- --width=${options.width} --height=${options.height} --fps=${options.fps}`;
  return command;
};

/**
 * 下载工作流配置文件
 */
export const downloadWorkflowJson = (
  workflow: Workflow,
  options: ExportOptions,
  fileName: string
): void => {
  const exportData = {
    workflow,
    width: options.width,
    height: options.height,
    fps: options.fps,
    exportedAt: new Date().toISOString(),
  };

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
};

/**
 * 下载视频文件
 */
export const downloadVideo = (video: VideoInfo): void => {
  const url = URL.createObjectURL(video.blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = video.fileName;
  a.click();

  URL.revokeObjectURL(url);
};

/**
 * 复制文本到剪贴板
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
};

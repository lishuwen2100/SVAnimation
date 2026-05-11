// 工作流导入导出工具

import type { Workflow, WorkflowNode } from "@/types/workflow";
import { getVideo, saveVideo } from "./videoStorage";

/**
 * 外部依赖类型
 */
export type ExternalDependencyType = "video" | "audio";

/**
 * 外部依赖信息
 */
export interface ExternalDependency {
  id: string; // 依赖唯一标识
  type: ExternalDependencyType;
  nodeId: string; // 所属节点 ID
  nodeName: string; // 节点名称
  fileName: string; // 文件名
  fileSize?: number; // 文件大小（字节）
  duration?: number; // 时长（秒）
  status: "missing" | "available" | "embedded"; // 状态
  configPath: string; // 配置路径（如 config.videoId）
}

/**
 * 工作流导出数据
 */
export interface WorkflowExportData {
  version: string; // 导出格式版本
  exportedAt: string; // 导出时间
  workflow: Workflow; // 工作流数据
  dependencies: ExternalDependency[]; // 外部依赖清单
  embeddedFiles?: {
    // 可选：嵌入的文件数据
    [dependencyId: string]: string; // Base64 编码的文件数据
  };
}

/**
 * 导入结果
 */
export interface WorkflowImportResult {
  workflow: Workflow;
  missingDependencies: ExternalDependency[];
  success: boolean;
  message: string;
}

/**
 * 扫描工作流中的外部依赖
 */
export async function scanWorkflowDependencies(
  workflow: Workflow
): Promise<ExternalDependency[]> {
  const dependencies: ExternalDependency[] = [];

  for (const node of workflow.nodes) {
    // 检查视频依赖（Kanban 模块）
    if (node.type === "kanban" && node.config.videoId) {
      const videoId = node.config.videoId;
      let status: ExternalDependency["status"] = "missing";
      let fileSize: number | undefined;
      let duration: number | undefined;

      // 尝试从 IndexedDB 获取视频信息
      try {
        const video = await getVideo(videoId);
        if (video) {
          status = "available";
          fileSize = video.size;
          duration = node.config.videoDuration;
        }
      } catch (error) {
        console.warn(`Video ${videoId} not found in IndexedDB`);
      }

      dependencies.push({
        id: videoId,
        type: "video",
        nodeId: node.id,
        nodeName: node.name,
        fileName: node.config.videoFileName || "unknown.mp4",
        fileSize,
        duration,
        status,
        configPath: "config.videoId",
      });
    }

    // 检查音频依赖（DuckSubtitle 模块）
    if (node.type === "duck-subtitle" && node.config.audioSrc) {
      const audioSrc = node.config.audioSrc;

      // 如果是 Blob URL 或 data URL，标记为不可用
      const isExternal = audioSrc.startsWith("blob:") || audioSrc.startsWith("data:");

      dependencies.push({
        id: audioSrc,
        type: "audio",
        nodeId: node.id,
        nodeName: node.name,
        fileName: extractFileName(audioSrc),
        duration: node.config.audioDuration,
        status: isExternal ? "available" : "missing",
        configPath: "config.audioSrc",
      });
    }
  }

  return dependencies;
}

/**
 * 导出工作流（不包含文件）
 */
export async function exportWorkflow(
  workflow: Workflow,
  includeFiles: boolean = false
): Promise<WorkflowExportData> {
  const dependencies = await scanWorkflowDependencies(workflow);

  const exportData: WorkflowExportData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    workflow: JSON.parse(JSON.stringify(workflow)), // 深拷贝
    dependencies: dependencies.map((dep) => ({
      ...dep,
      status: "missing", // 导出时标记为 missing，导入时重新检查
    })),
  };

  // 可选：嵌入文件数据
  if (includeFiles) {
    exportData.embeddedFiles = {};

    for (const dep of dependencies) {
      if (dep.status === "available") {
        try {
          if (dep.type === "video") {
            // 从 IndexedDB 读取视频并转换为 Base64
            const videoBlob = await getVideo(dep.id);
            if (videoBlob) {
              const base64 = await blobToBase64(videoBlob);
              exportData.embeddedFiles[dep.id] = base64;
            }
          } else if (dep.type === "audio") {
            // 音频通常是 Blob URL，需要 fetch 获取
            const response = await fetch(dep.id);
            const blob = await response.blob();
            const base64 = await blobToBase64(blob);
            exportData.embeddedFiles[dep.id] = base64;
          }
        } catch (error) {
          console.error(`Failed to embed file ${dep.id}:`, error);
        }
      }
    }
  }

  return exportData;
}

/**
 * 导出工作流为 JSON 文件下载
 */
export async function downloadWorkflowAsJson(
  workflow: Workflow,
  includeFiles: boolean = false
): Promise<void> {
  const exportData = await exportWorkflow(workflow, includeFiles);

  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `${workflow.name}-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
}

/**
 * 从 JSON 导入工作流
 */
export async function importWorkflowFromJson(
  jsonData: string | WorkflowExportData
): Promise<WorkflowImportResult> {
  try {
    // 解析 JSON
    const exportData: WorkflowExportData =
      typeof jsonData === "string" ? JSON.parse(jsonData) : jsonData;

    // 验证格式
    if (!exportData.workflow || !exportData.dependencies) {
      return {
        workflow: exportData.workflow,
        missingDependencies: [],
        success: false,
        message: "无效的工作流格式",
      };
    }

    const workflow = exportData.workflow;
    const missingDependencies: ExternalDependency[] = [];

    // 处理嵌入的文件
    if (exportData.embeddedFiles) {
      for (const [depId, base64Data] of Object.entries(exportData.embeddedFiles)) {
        const dep = exportData.dependencies.find((d) => d.id === depId);
        if (!dep) continue;

        try {
          // 将 Base64 转回 Blob
          const blob = await base64ToBlob(base64Data);

          if (dep.type === "video") {
            // 保存到 IndexedDB，生成新的 videoId
            const newVideoId = await saveVideo(blob, dep.fileName, dep.duration || 0);

            // 更新工作流中的 videoId
            const node = workflow.nodes.find((n) => n.id === dep.nodeId);
            if (node) {
              node.config.videoId = newVideoId;
              dep.status = "available";
            }
          } else if (dep.type === "audio") {
            // 创建 Blob URL
            const audioUrl = URL.createObjectURL(blob);

            // 更新工作流中的 audioSrc
            const node = workflow.nodes.find((n) => n.id === dep.nodeId);
            if (node) {
              node.config.audioSrc = audioUrl;
              dep.status = "available";
            }
          }
        } catch (error) {
          console.error(`Failed to restore file ${depId}:`, error);
          missingDependencies.push(dep);
        }
      }
    } else {
      // 没有嵌入文件，检查依赖状态
      for (const dep of exportData.dependencies) {
        // 标记为缺失，等待用户手动上传
        dep.status = "missing";
        missingDependencies.push(dep);
      }
    }

    return {
      workflow,
      missingDependencies,
      success: missingDependencies.length === 0,
      message:
        missingDependencies.length === 0
          ? "工作流导入成功"
          : `工作流导入成功，但有 ${missingDependencies.length} 个外部依赖需要手动上传`,
    };
  } catch (error) {
    console.error("Import failed:", error);
    return {
      workflow: {} as Workflow,
      missingDependencies: [],
      success: false,
      message: `导入失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

/**
 * 上传外部依赖文件
 */
export async function uploadDependencyFile(
  workflow: Workflow,
  dependency: ExternalDependency,
  file: File
): Promise<{ success: boolean; message: string }> {
  try {
    const node = workflow.nodes.find((n) => n.id === dependency.nodeId);
    if (!node) {
      return { success: false, message: "节点不存在" };
    }

    if (dependency.type === "video") {
      // 保存视频到 IndexedDB
      const videoBlob = new Blob([file], { type: file.type });
      const duration = await getVideoDuration(videoBlob);
      const videoId = await saveVideo(videoBlob, file.name, duration);

      // 更新节点配置
      node.config.videoId = videoId;
      node.config.videoFileName = file.name;
      node.config.videoDuration = duration;
      node.config.videoSize = file.size;

      return { success: true, message: "视频上传成功" };
    } else if (dependency.type === "audio") {
      // 创建音频 Blob URL
      const audioBlob = new Blob([file], { type: file.type });
      const audioUrl = URL.createObjectURL(audioBlob);
      const duration = await getAudioDuration(audioBlob);

      // 更新节点配置
      node.config.audioSrc = audioUrl;
      node.config.audioDuration = duration;

      return { success: true, message: "音频上传成功" };
    }

    return { success: false, message: "不支持的文件类型" };
  } catch (error) {
    console.error("Upload failed:", error);
    return {
      success: false,
      message: `上传失败: ${error instanceof Error ? error.message : "未知错误"}`,
    };
  }
}

// ========== 辅助函数 ==========

/**
 * 从 URL 或路径提取文件名
 */
function extractFileName(path: string): string {
  if (path.startsWith("blob:") || path.startsWith("data:")) {
    return "audio.mp3"; // 默认名称
  }
  const parts = path.split("/");
  return parts[parts.length - 1] || "unknown";
}

/**
 * Blob 转 Base64
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // 移除 data URL 前缀
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Base64 转 Blob
 */
function base64ToBlob(base64: string, mimeType: string = "application/octet-stream"): Promise<Blob> {
  return new Promise((resolve) => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    resolve(new Blob([byteArray], { type: mimeType }));
  });
}

/**
 * 获取视频时长
 */
function getVideoDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      resolve(0);
    };
    video.src = URL.createObjectURL(blob);
  });
}

/**
 * 获取音频时长
 */
function getAudioDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const audio = document.createElement("audio");
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(audio.src);
      resolve(audio.duration);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(audio.src);
      resolve(0);
    };
    audio.src = URL.createObjectURL(blob);
  });
}

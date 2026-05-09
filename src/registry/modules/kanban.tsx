// Kanban 模块注册

import type { ModuleDefinition, KanbanConfig } from "@/types/workflow";
import { KanbanCompositionWrapper } from "@/modules/Kanban/KanbanCompositionWrapper";
import { KanbanConfigEditor } from "@/modules/Kanban/KanbanConfigEditor";

export const kanbanModule: ModuleDefinition = {
  type: "kanban",
  name: "看板",
  description: "导入并播放 MP4 视频文件，支持大文件（使用 IndexedDB 存储）",
  icon: "📋",
  color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",

  CompositionComponent: KanbanCompositionWrapper,
  ConfigEditorComponent: KanbanConfigEditor,

  getDefaultConfig: (): KanbanConfig => ({
    videoId: null,
    videoDuration: 0,
    resolution: {
      id: "720p",
      width: 1280,
      height: 720,
      label: "1280 x 720 (HD)",
    },
    subtitles: [],
  }),

  getDuration: (config: KanbanConfig, fps: number): number => {
    if (config.videoDuration > 0) {
      return Math.ceil(config.videoDuration * fps);
    }
    return fps * 8; // 默认 8 秒
  },

  convertConfigToProps: (config: KanbanConfig) => {
    return {
      videoId: config.videoId,
      compositionSize: {
        width: config.resolution.width,
        height: config.resolution.height,
      },
      subtitles: config.subtitles,
    };
  },
};

// Kanban 模块注册

import type { ModuleDefinition, KanbanConfig } from "@/types/workflow";
import { KanbanComposition } from "@/modules/Kanban/KanbanComposition";
import { KanbanConfigEditor } from "@/modules/Kanban/KanbanConfigEditor";

export const kanbanModule: ModuleDefinition = {
  type: "kanban",
  name: "看板",
  description: "导入并播放 MP4 视频文件",
  icon: "📋",
  color: "from-cyan-500/20 to-blue-500/20 border-cyan-500/30",

  CompositionComponent: KanbanComposition,
  ConfigEditorComponent: KanbanConfigEditor,

  getDefaultConfig: (): KanbanConfig => ({
    videoSrc: null,
    videoDuration: 0,
    resolution: {
      id: "720p",
      width: 1280,
      height: 720,
      label: "1280 x 720 (HD)",
    },
  }),

  getDuration: (config: KanbanConfig, fps: number): number => {
    if (config.videoDuration > 0) {
      return Math.ceil(config.videoDuration * fps);
    }
    return fps * 8; // 默认 8 秒
  },

  convertConfigToProps: (config: KanbanConfig) => {
    return {
      videoSrc: config.videoSrc,
      compositionSize: {
        width: config.resolution.width,
        height: config.resolution.height,
      },
    };
  },
};

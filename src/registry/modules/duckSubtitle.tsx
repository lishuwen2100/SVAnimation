// DuckSubtitle 模块注册

import type { ModuleDefinition } from "@/types/workflow";
import type { DuckSubtitleConfig } from "@/types/workflow";
import { DuckSubtitleComposition } from "@/modules/DuckSubtitle/DuckSubtitleComposition";
import { DuckSubtitleConfigEditor } from "@/modules/DuckSubtitle/DuckSubtitleConfigEditor";
import { parseSrt, demoSrt, FPS } from "@/modules/DuckSubtitle/utils";

export const duckSubtitleModule: ModuleDefinition = {
  type: "duck-subtitle",
  name: "倒鸭子字幕",
  description: "整句字幕贴合动画，每3句左转90度，支持SRT和MP3导入",
  icon: "🦆",
  color: "from-amber-500/20 to-orange-500/20 border-amber-500/30",

  CompositionComponent: DuckSubtitleComposition,
  ConfigEditorComponent: DuckSubtitleConfigEditor,

  getDefaultConfig: (): DuckSubtitleConfig => ({
    srtText: demoSrt,
    audioSrc: null,
    audioDuration: 0,
    centerRegion: {
      x: 0.28,
      y: 0.28,
      width: 0.44,
      height: 0.42,
      show: true,
      manualPosition: null,
    },
    resolution: {
      id: "720p",
      width: 1280,
      height: 720,
      label: "1280 x 720 (HD)",
    },
    subtitleStyles: {},
    positionMode: "random",
  }),

  getDuration: (config: DuckSubtitleConfig, fps: number): number => {
    const cues = parseSrt(config.srtText);
    const subtitleFrames = cues.length > 0 ? cues[cues.length - 1].endFrame + fps * 2 : fps * 8;
    const audioFrames = config.audioDuration > 0 ? Math.ceil(config.audioDuration * fps) : 0;
    return Math.max(subtitleFrames, audioFrames, fps * 8);
  },

  convertConfigToProps: (config: DuckSubtitleConfig) => {
    const cues = parseSrt(config.srtText).map((cue) => ({
      ...cue,
      fontFamily: config.subtitleStyles[cue.id]?.fontFamily,
      fontSize: config.subtitleStyles[cue.id]?.fontSize,
      animation: config.subtitleStyles[cue.id]?.animation,
      customPosition: config.subtitleStyles[cue.id]?.customPosition,
    }));

    return {
      cues,
      audioSrc: config.audioSrc,
      centerRegion: config.centerRegion,
      compositionSize: {
        width: config.resolution.width,
        height: config.resolution.height,
      },
    };
  },
};

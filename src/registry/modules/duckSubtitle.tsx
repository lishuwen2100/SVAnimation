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
    subtitles: [], // 初始为空,可通过 SRT 导入或手动添加
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
    let subtitleFrames = fps * 8;

    // 优先使用字幕列表计算时长
    if (config.subtitles.length > 0) {
      const lastSubtitle = config.subtitles.reduce((max, sub) =>
        sub.endTime > max.endTime ? sub : max
      );
      subtitleFrames = Math.ceil(lastSubtitle.endTime * fps) + fps * 2;
    } else if (config.srtText) {
      // 向后兼容:从 SRT 文本解析
      const cues = parseSrt(config.srtText);
      subtitleFrames = cues.length > 0 ? cues[cues.length - 1].endFrame + fps * 2 : fps * 8;
    }

    const audioFrames = config.audioDuration > 0 ? Math.ceil(config.audioDuration * fps) : 0;
    return Math.max(subtitleFrames, audioFrames, fps * 8);
  },

  convertConfigToProps: (config: DuckSubtitleConfig) => {
    let cues;

    // 优先使用字幕列表
    if (config.subtitles.length > 0) {
      cues = config.subtitles
        .sort((a, b) => a.startTime - b.startTime)
        .map((subtitle, index) => ({
          id: index,
          startSec: subtitle.startTime,
          endSec: subtitle.endTime,
          startFrame: Math.floor(subtitle.startTime * FPS),
          endFrame: Math.floor(subtitle.endTime * FPS),
          text: subtitle.text,
          fontFamily: subtitle.fontFamily,
          fontSize: subtitle.fontSize,
          animation: subtitle.animation,
          customPosition: subtitle.customPosition,
        }));
    } else {
      // 向后兼容:从 SRT 文本解析
      cues = parseSrt(config.srtText).map((cue) => ({
        ...cue,
        fontFamily: config.subtitleStyles[cue.id]?.fontFamily,
        fontSize: config.subtitleStyles[cue.id]?.fontSize,
        animation: config.subtitleStyles[cue.id]?.animation,
        customPosition: config.subtitleStyles[cue.id]?.customPosition,
      }));
    }

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

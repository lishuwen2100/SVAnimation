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

  getDefaultConfig: (): DuckSubtitleConfig => {
    // 将 demo SRT 转换为字幕列表
    const parsedCues = parseSrt(demoSrt);
    const demoSubtitles = parsedCues.map((cue, index) => ({
      id: `demo-subtitle-${index}`,
      text: cue.text,
      startTime: cue.startSec,
      // endTime 由倒鸭子旋转逻辑控制，不需要存储
    }));

    return {
      srtText: demoSrt, // 保留用于向后兼容
      subtitles: demoSubtitles, // 预填充演示字幕
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
    };
  },

  getDuration: (config: DuckSubtitleConfig, fps: number): number => {
    let subtitleFrames = fps * 8;

    // 优先使用字幕列表计算时长
    if (config.subtitles.length > 0) {
      // 字幕数量决定时长（考虑旋转动画）
      const GROUP_SIZE = 3;
      const ROTATE_DURATION_FRAMES = 16;
      const lastSubtitle = config.subtitles[config.subtitles.length - 1];
      const groupDelay = Math.floor((config.subtitles.length - 1) / GROUP_SIZE) * (ROTATE_DURATION_FRAMES / fps);
      subtitleFrames = Math.ceil((lastSubtitle.startTime + groupDelay + 2) * fps);
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
      const GROUP_SIZE = 3;
      const ROTATE_DURATION_FRAMES = 16;

      cues = config.subtitles
        .sort((a, b) => a.startTime - b.startTime)
        .map((subtitle, index) => {
          // 计算旋转延迟
          const groupDelay = Math.floor(index / GROUP_SIZE) * (ROTATE_DURATION_FRAMES / FPS);
          const adjustedStart = subtitle.startTime + groupDelay;
          const startFrame = Math.round(adjustedStart * FPS);

          // 计算合理的结束时间（默认持续1.5秒，但受旋转逻辑影响）
          const defaultDuration = 1.5;
          const adjustedEnd = adjustedStart + defaultDuration;
          const endFrame = Math.max(startFrame + 12, Math.round(adjustedEnd * FPS));

          return {
            id: index,
            startSec: subtitle.startTime,
            endSec: subtitle.startTime + defaultDuration, // 用于兼容，实际不影响显示
            startFrame,
            endFrame,
            text: subtitle.text,
            fontFamily: subtitle.fontFamily,
            fontSize: subtitle.fontSize,
            color: subtitle.color,
            animation: subtitle.animation,
            customPosition: subtitle.customPosition,
          };
        });
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

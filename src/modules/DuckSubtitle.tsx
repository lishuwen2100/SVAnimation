// DuckSubtitle 向后兼容入口（保留原有单模块功能）

import { useState } from "react";
import { DuckSubtitleConfigEditor } from "./DuckSubtitle/DuckSubtitleConfigEditor";
import type { DuckSubtitleConfig } from "@/types/workflow";
import { demoSrt, parseSrt } from "./DuckSubtitle/utils";

export function DuckSubtitle() {
  // 将 demo SRT 转换为字幕列表
  const parsedCues = parseSrt(demoSrt);
  const demoSubtitles = parsedCues.map((cue, index) => ({
    id: `demo-subtitle-${index}`,
    text: cue.text,
    startTime: cue.startSec,
    endTime: cue.endSec,
  }));

  const [config, setConfig] = useState<DuckSubtitleConfig>({
    srtText: demoSrt,
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
  });

  return (
    <DuckSubtitleConfigEditor
      config={config}
      onChange={setConfig}
      onFinish={() => {
        console.log("Configuration finished:", config);
      }}
    />
  );
}

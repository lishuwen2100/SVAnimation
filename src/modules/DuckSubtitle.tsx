// DuckSubtitle 向后兼容入口（保留原有单模块功能）

import { useState } from "react";
import { DuckSubtitleConfigEditor } from "./DuckSubtitle/DuckSubtitleConfigEditor";
import type { DuckSubtitleConfig } from "@/types/workflow";
import { demoSrt } from "./DuckSubtitle/utils";

export function DuckSubtitle() {
  const [config, setConfig] = useState<DuckSubtitleConfig>({
    srtText: demoSrt,
    subtitles: [], // 初始为空,由 SRT 解析填充
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

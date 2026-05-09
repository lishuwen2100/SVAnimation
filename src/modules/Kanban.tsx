// Kanban 向后兼容入口（保留原有单模块功能）

import { useState } from "react";
import { KanbanConfigEditor } from "./Kanban/KanbanConfigEditor";
import type { KanbanConfig } from "@/types/workflow";

export function Kanban() {
  const [config, setConfig] = useState<KanbanConfig>({
    videoId: null,
    videoDuration: 0,
    resolution: {
      id: "720p",
      width: 1280,
      height: 720,
      label: "1280 x 720 (HD)",
    },
  });

  return (
    <KanbanConfigEditor
      config={config}
      onChange={setConfig}
      onFinish={() => {
        console.log("Configuration finished:", config);
      }}
    />
  );
}

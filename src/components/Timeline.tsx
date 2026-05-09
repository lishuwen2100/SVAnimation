// 时间轴组件

import type { NodeTimelineEntry, WorkflowNode } from "@/types/workflow";
import { getModule } from "@/registry/moduleRegistry";

export interface TimelineProps {
  timeline: NodeTimelineEntry[];
  nodes: WorkflowNode[];
  fps: number;
}

export const Timeline: React.FC<TimelineProps> = ({ timeline, nodes, fps }) => {
  if (timeline.length === 0) return null;

  const totalFrames = timeline[timeline.length - 1]?.endFrame || 0;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-4 backdrop-blur-sm">
      <div className="mb-3 text-sm font-semibold text-neutral-300">时间轴</div>

      <div className="relative h-20 overflow-hidden rounded bg-neutral-800">
        {timeline.map((entry, idx) => {
          const node = nodes.find((n) => n.id === entry.nodeId);
          if (!node) return null;

          const module = getModule(node.type);
          const left = (entry.startFrame / totalFrames) * 100;
          const width = ((entry.endFrame - entry.startFrame) / totalFrames) * 100;
          const duration = (entry.endFrame - entry.startFrame) / fps;

          return (
            <div
              key={entry.nodeId}
              className={`absolute top-0 bottom-0 group cursor-pointer overflow-hidden border-r border-neutral-700 bg-gradient-to-r ${module.color} transition-all hover:opacity-80`}
              style={{
                left: `${left}%`,
                width: `${width}%`,
              }}
              title={`${node.name} (${duration.toFixed(1)}s)`}
            >
              <div className="flex h-full flex-col justify-between p-2">
                <div className="flex items-center gap-1">
                  <span className="text-lg">{module.icon}</span>
                  <span className="truncate text-xs font-medium text-neutral-100">
                    {node.name}
                  </span>
                </div>
                <div className="text-[10px] text-neutral-400">
                  {duration.toFixed(1)}s
                </div>
              </div>

              {/* 分隔线 */}
              {idx < timeline.length - 1 && (
                <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-neutral-900" />
              )}
            </div>
          );
        })}
      </div>

      {/* 时间刻度 */}
      <div className="mt-2 flex justify-between text-xs text-neutral-500">
        <span>0s</span>
        <span>{(totalFrames / fps / 2).toFixed(1)}s</span>
        <span>{(totalFrames / fps).toFixed(1)}s</span>
      </div>
    </div>
  );
};

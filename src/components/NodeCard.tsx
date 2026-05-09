// 工作流节点卡片

import type { WorkflowNode } from "@/types/workflow";
import { getModule } from "@/registry/moduleRegistry";

export interface NodeCardProps {
  node: WorkflowNode;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEnabled: () => void;
}

export const NodeCard: React.FC<NodeCardProps> = ({
  node,
  index,
  onEdit,
  onDelete,
  onToggleEnabled,
}) => {
  const module = getModule(node.type);

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br p-4 transition-all ${module.color} ${
        node.enabled ? "" : "opacity-50 grayscale"
      }`}
      draggable
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="text-4xl">{module.icon}</div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-xs font-medium text-neutral-500">#{index + 1}</span>
            <button
              onClick={onToggleEnabled}
              className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                node.enabled
                  ? "bg-green-900/30 text-green-400 hover:bg-green-900/50"
                  : "bg-neutral-700 text-neutral-400 hover:bg-neutral-600"
              }`}
            >
              {node.enabled ? "启用" : "禁用"}
            </button>
          </div>
          <h3 className="truncate text-lg font-bold text-neutral-100">{node.name}</h3>
          <p className="mt-1 text-xs text-neutral-400">{module.name}</p>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={onEdit}
            className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-300 transition-colors hover:bg-neutral-700"
          >
            配置
          </button>
          <button
            onClick={onDelete}
            className="rounded-md bg-red-900/30 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-900/50"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
};

// 工作流编辑器

import { useState } from "react";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { getAllModules, getModule } from "@/registry/moduleRegistry";
import { NodeCard } from "./NodeCard";
import type { ModuleType } from "@/types/workflow";

export interface WorkflowEditorProps {
  onBack: () => void;
  onPreview: () => void;
}

export const WorkflowEditor: React.FC<WorkflowEditorProps> = ({ onBack, onPreview }) => {
  const { currentWorkflow, addNode, deleteNode, updateNode } = useWorkflow();
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  if (!currentWorkflow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-400">未选择工作流</p>
      </div>
    );
  }

  const handleAddNode = (type: ModuleType) => {
    const module = getModule(type);
    const nodeId = addNode(type, `${module.name} ${currentWorkflow.nodes.length + 1}`);
    setEditingNodeId(nodeId);
  };

  const handleEditNode = (nodeId: string) => {
    setEditingNodeId(nodeId);
  };

  const handleCloseEditor = () => {
    setEditingNodeId(null);
  };

  const editingNode = currentWorkflow.nodes.find((n) => n.id === editingNodeId);
  const sortedNodes = [...currentWorkflow.nodes].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <span className="text-xl">←</span>
            <span className="text-sm">返回列表</span>
          </button>
          <div className="h-6 w-px bg-neutral-700" />
          <h2 className="flex-1 text-lg font-bold text-neutral-100">{currentWorkflow.name}</h2>
          <button
            onClick={onPreview}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/50 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>预览播放</span>
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-8">
        {sortedNodes.length === 0 ? (
          <div className="mb-6 rounded-lg border border-dashed border-neutral-700 bg-neutral-900/30 p-12 text-center">
            <div className="text-5xl opacity-50">✨</div>
            <h3 className="mt-4 text-xl font-bold text-neutral-400">工作流为空</h3>
            <p className="mt-2 text-sm text-neutral-500">添加模块开始创建视频</p>
          </div>
        ) : (
          <div className="mb-6 space-y-3">
            {sortedNodes.map((node, index) => (
              <NodeCard
                key={node.id}
                node={node}
                index={index}
                onEdit={() => handleEditNode(node.id)}
                onDelete={() => deleteNode(node.id)}
                onToggleEnabled={() => updateNode(node.id, { enabled: !node.enabled })}
              />
            ))}
          </div>
        )}

        <div>
          <h3 className="mb-3 text-sm font-semibold text-neutral-300">添加模块</h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {getAllModules().map((module) => (
              <button
                key={module.type}
                onClick={() => handleAddNode(module.type)}
                className={`group relative overflow-hidden rounded-lg border bg-gradient-to-br p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${module.color}`}
              >
                <div className="text-4xl">{module.icon}</div>
                <h4 className="mt-3 text-lg font-bold text-neutral-100">{module.name}</h4>
                <p className="mt-1 text-sm text-neutral-400">{module.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 配置模态框 */}
      {editingNode && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
          <div className="relative my-8 w-full max-w-[1600px] rounded-lg border border-neutral-800 bg-neutral-950 shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-6 py-4 backdrop-blur-sm">
              <h3 className="text-lg font-bold text-neutral-100">
                配置：{editingNode.name}
              </h3>
              <button
                onClick={handleCloseEditor}
                className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {(() => {
                const module = getModule(editingNode.type);
                const ConfigEditor = module.ConfigEditorComponent;
                return (
                  <ConfigEditor
                    config={editingNode.config}
                    onChange={(newConfig) => updateNode(editingNode.id, { config: newConfig })}
                    onFinish={handleCloseEditor}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

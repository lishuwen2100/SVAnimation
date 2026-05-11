// 工作流列表页

import { useState } from "react";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { ImportWorkflowDialog } from "./ImportWorkflowDialog";
import { downloadWorkflowAsJson } from "@/utils/workflowImportExport";
import type { Workflow } from "@/types/workflow";

export interface WorkflowListProps {
  onSelectWorkflow: (id: string) => void;
  onBack: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ onSelectWorkflow, onBack }) => {
  const { workflows, createWorkflow, deleteWorkflow, updateWorkflow } = useWorkflow();
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleCreate = () => {
    const name = prompt("输入工作流名称：", `工作流 ${workflows.length + 1}`);
    if (name) {
      const id = createWorkflow(name);
      onSelectWorkflow(id);
    }
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定删除工作流 "${name}" 吗？`)) {
      deleteWorkflow(id);
    }
  };

  // 导出工作流
  const handleExport = async (workflow: Workflow, includeFiles: boolean) => {
    try {
      await downloadWorkflowAsJson(workflow, includeFiles);
    } catch (error) {
      console.error("Export failed:", error);
      alert(`导出失败: ${error instanceof Error ? error.message : "未知错误"}`);
    }
  };

  // 导入成功回调
  const handleImportSuccess = (importedWorkflow: Workflow) => {
    // 生成新ID并添加到工作流列表（避免ID冲突）
    const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const workflowToAdd: Workflow = {
      ...importedWorkflow,
      id: newId,
      name: importedWorkflow.name,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // 直接添加到 workflows 数组（需要访问 setWorkflows）
    // 由于 WorkflowContext 没有直接的 addWorkflow 方法，我们先创建一个空工作流再更新
    const tempId = createWorkflow(importedWorkflow.name);
    updateWorkflow(tempId, {
      nodes: importedWorkflow.nodes,
    });

    setShowImportDialog(false);
    alert(`工作流 "${importedWorkflow.name}" 导入成功！`);

    // 可选：自动选择导入的工作流
    onSelectWorkflow(tempId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <span className="text-xl">←</span>
            <span className="text-sm">返回主页</span>
          </button>
          <div className="h-6 w-px bg-neutral-700" />
          <h1 className="text-3xl font-black text-neutral-100">工作流列表</h1>
        </header>

        <div className="mb-6 space-y-4">
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-3 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span>新建工作流</span>
            </button>

            <button
              onClick={() => setShowImportDialog(true)}
              className="inline-flex items-center gap-2.5 rounded-lg border border-cyan-500 bg-cyan-500/10 px-5 py-3 font-medium text-cyan-300 transition-all hover:bg-cyan-500/20"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              <span>导入工作流</span>
            </button>
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
            <div className="flex items-start gap-3">
              <div className="text-xl">💡</div>
              <div className="flex-1 text-sm text-neutral-400">
                <p className="mb-2"><strong className="text-neutral-300">导出说明：</strong></p>
                <ul className="space-y-1">
                  <li><strong className="text-cyan-400">导出：</strong>仅导出工作流结构，需要手动上传依赖文件</li>
                  <li><strong className="text-green-400">完整导出：</strong>导出工作流及所有音视频文件（文件较大，但可直接导入）</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {workflows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/30 p-12 text-center">
            <div className="text-5xl opacity-50">📋</div>
            <h3 className="mt-4 text-xl font-bold text-neutral-400">还没有工作流</h3>
            <p className="mt-2 text-sm text-neutral-500">点击"新建工作流"开始创建</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <div
                key={workflow.id}
                className="group relative overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm transition-all hover:border-neutral-700 hover:bg-neutral-900/70"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-neutral-100">{workflow.name}</h3>
                  <p className="mt-1 text-sm text-neutral-400">
                    {workflow.nodes.length} 个节点
                  </p>
                  <p className="text-xs text-neutral-500">
                    {new Date(workflow.updatedAt).toLocaleString("zh-CN")}
                  </p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onSelectWorkflow(workflow.id)}
                    className="w-full rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
                  >
                    编辑
                  </button>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExport(workflow, false)}
                      className="flex-1 rounded-md border border-cyan-500 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-400 transition-colors hover:bg-cyan-500/20"
                      title="仅导出工作流结构"
                    >
                      导出
                    </button>
                    <button
                      onClick={() => handleExport(workflow, true)}
                      className="flex-1 rounded-md border border-green-500 bg-green-500/10 px-3 py-2 text-sm text-green-400 transition-colors hover:bg-green-500/20"
                      title="导出工作流及所有依赖文件"
                    >
                      完整导出
                    </button>
                    <button
                      onClick={() => handleDelete(workflow.id, workflow.name)}
                      className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/50"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 导入对话框 */}
        {showImportDialog && (
          <ImportWorkflowDialog
            onClose={() => setShowImportDialog(false)}
            onImportSuccess={handleImportSuccess}
          />
        )}
      </div>
    </div>
  );
};

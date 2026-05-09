// 工作流列表页

import { useWorkflow } from "@/contexts/WorkflowContext";

export interface WorkflowListProps {
  onSelectWorkflow: (id: string) => void;
  onBack: () => void;
}

export const WorkflowList: React.FC<WorkflowListProps> = ({ onSelectWorkflow, onBack }) => {
  const { workflows, createWorkflow, deleteWorkflow } = useWorkflow();

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

        <div className="mb-6">
          <button
            onClick={handleCreate}
            className="inline-flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-3 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>新建工作流</span>
          </button>
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

                <div className="flex gap-2">
                  <button
                    onClick={() => onSelectWorkflow(workflow.id)}
                    className="flex-1 rounded-md bg-purple-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-500"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(workflow.id, workflow.name)}
                    className="rounded-md bg-red-900/30 px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-900/50"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

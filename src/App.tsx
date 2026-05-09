import { useState } from "react";
import { DuckSubtitle } from "./modules/DuckSubtitle";
import { WorkflowList } from "./components/WorkflowList";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { useWorkflow } from "./contexts/WorkflowContext";

type ModuleId = "home" | "duck-subtitle" | "workflow-list" | "workflow-editor";

type ModuleCard = {
  id: ModuleId;
  title: string;
  description: string;
  icon: string;
  color: string;
};

const modules: ModuleCard[] = [
  {
    id: "duck-subtitle",
    title: "倒鸭子字幕",
    description: "整句字幕贴合动画，每3句左转90度，支持SRT和MP3导入",
    icon: "🦆",
    color: "from-amber-500/20 to-orange-500/20 border-amber-500/30 hover:border-amber-500/60",
  },
];

export default function App() {
  const [currentModule, setCurrentModule] = useState<ModuleId>("home");
  const { selectWorkflow } = useWorkflow();

  if (currentModule === "duck-subtitle") {
    return (
      <div className="min-h-screen bg-neutral-950">
        <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => setCurrentModule("home")}
              className="flex items-center gap-2 text-neutral-400 hover:text-neutral-100 transition-colors"
            >
              <span className="text-xl">←</span>
              <span className="text-sm">返回主界面</span>
            </button>
            <div className="h-6 w-px bg-neutral-700" />
            <h2 className="text-lg font-bold text-neutral-100">倒鸭子字幕</h2>
          </div>
        </header>
        <DuckSubtitle />
      </div>
    );
  }

  if (currentModule === "workflow-list") {
    return (
      <WorkflowList
        onSelectWorkflow={(id) => {
          selectWorkflow(id);
          setCurrentModule("workflow-editor");
        }}
        onBack={() => setCurrentModule("home")}
      />
    );
  }

  if (currentModule === "workflow-editor") {
    return (
      <WorkflowEditor
        onBack={() => setCurrentModule("workflow-list")}
        onPreview={() => {
          // TODO: Phase 4 - 实现统一播放器
          alert("统一播放器将在 Phase 4 实现");
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <header className="text-center mb-16 space-y-4">
          <h1 className="text-5xl font-black tracking-tight text-neutral-100">
            SVAnimation
          </h1>
          <p className="text-xl text-neutral-400 font-light">
            短视频特效助手
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-neutral-500">
            <span>基于 Remotion 的短视频特效工具集</span>
          </div>
        </header>

        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-neutral-300 px-2">
            选择一个特效模块
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <button
              onClick={() => setCurrentModule("workflow-list")}
              className="group relative overflow-hidden border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="relative z-10 space-y-4">
                <div className="text-5xl">🎬</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-100">
                    工作流编辑器
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed">
                    组合多个模块创建复杂视频，顺序播放和导出
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors">
                  <span>进入工作流</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </div>
              </div>
              <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            {modules.map((module) => (
              <button
                key={module.id}
                onClick={() => setCurrentModule(module.id)}
                className={`group relative overflow-hidden border bg-gradient-to-br ${module.color} p-6 text-left transition-all hover:scale-[1.02] active:scale-[0.98]`}
              >
                <div className="relative z-10 space-y-4">
                  <div className="text-5xl">{module.icon}</div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-neutral-100">
                      {module.title}
                    </h3>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-neutral-500 group-hover:text-neutral-400 transition-colors">
                    <span>进入模块</span>
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}

            <div className="group relative overflow-hidden border border-neutral-800 border-dashed bg-neutral-900/30 p-6 text-left opacity-50">
              <div className="relative z-10 space-y-4">
                <div className="text-5xl opacity-50">✨</div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-neutral-400">
                    更多特效
                  </h3>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    持续开发中...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="mt-24 text-center text-sm text-neutral-600">
          <p>使用 React + Remotion + Tailwind CSS 构建</p>
        </footer>
      </div>
    </div>
  );
}

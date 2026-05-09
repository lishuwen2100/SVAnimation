import { useState } from "react";
import { WorkflowList } from "./components/WorkflowList";
import { WorkflowEditor } from "./components/WorkflowEditor";
import { UnifiedPlayer } from "./components/UnifiedPlayer";
import { useWorkflow } from "./contexts/WorkflowContext";
import { getAllModules } from "./registry/moduleRegistry";

type ViewId = "home" | "workflow-list" | "workflow-editor" | "unified-player";

export default function App() {
  const [currentView, setCurrentView] = useState<ViewId>("home");
  const { selectWorkflow } = useWorkflow();

  if (currentView === "workflow-list") {
    return (
      <WorkflowList
        onSelectWorkflow={(id) => {
          selectWorkflow(id);
          setCurrentView("workflow-editor");
        }}
        onBack={() => setCurrentView("home")}
      />
    );
  }

  if (currentView === "workflow-editor") {
    return (
      <WorkflowEditor
        onBack={() => setCurrentView("workflow-list")}
        onPreview={() => setCurrentView("unified-player")}
      />
    );
  }

  if (currentView === "unified-player") {
    return (
      <UnifiedPlayer
        onBack={() => setCurrentView("workflow-editor")}
      />
    );
  }

  const availableModules = getAllModules();

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
            <span>基于 Remotion 的工作流式视频编辑工具</span>
          </div>
        </header>

        <section className="mb-16">
          <button
            onClick={() => setCurrentView("workflow-list")}
            className="group relative mx-auto block w-full max-w-2xl overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/20 to-pink-500/20 p-8 text-left transition-all hover:scale-[1.02] active:scale-[0.98] hover:border-purple-500/50"
          >
            <div className="relative z-10 flex items-center gap-6">
              <div className="text-7xl">🎬</div>
              <div className="flex-1 space-y-3">
                <h2 className="text-3xl font-black text-neutral-100">
                  工作流编辑器
                </h2>
                <p className="text-neutral-400 leading-relaxed">
                  组合多个特效模块创建复杂视频，支持顺序播放、实时预览和统一导出
                </p>
                <div className="flex items-center gap-2 text-purple-300 group-hover:text-purple-200 transition-colors">
                  <span className="font-medium">立即开始创作</span>
                  <span className="group-hover:translate-x-2 transition-transform text-xl">→</span>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </section>

        <section className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-2xl font-bold text-neutral-200">
              可用的特效模块
            </h3>
            <p className="text-neutral-500">
              在工作流编辑器中添加这些模块，创建精彩的视频内容
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {availableModules.map((module) => (
              <div
                key={module.type}
                className={`relative overflow-hidden rounded-lg border bg-gradient-to-br ${module.color} p-6`}
              >
                <div className="relative z-10 space-y-4">
                  <div className="text-5xl">{module.icon}</div>
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-neutral-100">
                      {module.name}
                    </h4>
                    <p className="text-sm text-neutral-400 leading-relaxed">
                      {module.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-neutral-500">
                    <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>已集成到工作流</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="relative overflow-hidden rounded-lg border border-neutral-800 border-dashed bg-neutral-900/30 p-6 opacity-50">
              <div className="relative z-10 space-y-4">
                <div className="text-5xl opacity-50">✨</div>
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-neutral-400">
                    更多模块
                  </h4>
                  <p className="text-sm text-neutral-500 leading-relaxed">
                    更多特效模块正在开发中...
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

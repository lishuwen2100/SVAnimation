// 统一播放器（Series 集成）

import { useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { AbsoluteFill, Series, Audio } from "remotion";
import { useWorkflow } from "@/contexts/WorkflowContext";
import { Timeline } from "./Timeline";
import { ExportDialog } from "./ExportDialog";
import { FPS } from "@/modules/DuckSubtitle/utils";

/**
 * 顶层 Composition（包裹 Series）
 */
const UnifiedComposition: React.FC<{
  timeline: ReturnType<ReturnType<typeof useWorkflow>["computeTimeline"]>;
  masterAudioSrc?: string | null;
}> = ({ timeline }) => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        {timeline.map((entry, idx) => {
          const duration = entry.endFrame - entry.startFrame;

          return (
            <Series.Sequence
              key={`${entry.nodeId}-${idx}`}
              durationInFrames={duration}
              name={`Node ${idx + 1}`}
            >
              <entry.composition {...entry.inputProps} />
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};

export interface UnifiedPlayerProps {
  onBack: () => void;
}

export const UnifiedPlayer: React.FC<UnifiedPlayerProps> = ({ onBack }) => {
  const { currentWorkflow, computeTimeline } = useWorkflow();
  const [showExportDialog, setShowExportDialog] = useState(false);

  const timeline = useMemo(() => computeTimeline(FPS), [computeTimeline]);

  const totalFrames = useMemo(() => {
    if (timeline.length === 0) return FPS * 3;
    return timeline[timeline.length - 1].endFrame;
  }, [timeline]);

  const totalSeconds = totalFrames / FPS;

  // 获取统一的分辨率（使用第一个节点的分辨率）
  const resolution = useMemo(() => {
    if (timeline.length === 0 || !currentWorkflow) {
      return { width: 1280, height: 720 };
    }

    // 从第一个启用节点的配置中获取分辨率
    const firstNode = currentWorkflow.nodes
      .filter((n) => n.enabled)
      .sort((a, b) => a.order - b.order)[0];

    if (firstNode?.config?.resolution) {
      return {
        width: firstNode.config.resolution.width,
        height: firstNode.config.resolution.height,
      };
    }

    return { width: 1280, height: 720 };
  }, [timeline, currentWorkflow]);

  if (!currentWorkflow) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950">
        <p className="text-neutral-400">未选择工作流</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950">
      <header className="sticky top-0 z-50 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
        <div className="mx-auto max-w-[1600px] px-6 py-4 flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-neutral-400 transition-colors hover:text-neutral-100"
          >
            <span className="text-xl">←</span>
            <span className="text-sm">返回编辑</span>
          </button>
          <div className="h-6 w-px bg-neutral-700" />
          <h2 className="flex-1 text-lg font-bold text-neutral-100">
            预览播放：{currentWorkflow.name}
          </h2>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
        {timeline.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-700 bg-neutral-900/30 p-12 text-center">
            <div className="text-5xl opacity-50">🎬</div>
            <h3 className="mt-4 text-xl font-bold text-neutral-400">没有可播放的内容</h3>
            <p className="mt-2 text-sm text-neutral-500">
              请添加并启用至少一个节点
            </p>
          </div>
        ) : (
          <>
            {/* Remotion Player */}
            <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
              <Player
                component={UnifiedComposition}
                inputProps={{ timeline }}
                durationInFrames={totalFrames}
                fps={FPS}
                compositionWidth={resolution.width}
                compositionHeight={resolution.height}
                controls
                style={{
                  width: "100%",
                  aspectRatio: `${resolution.width}/${resolution.height}`,
                }}
              />
            </div>

            {/* 统计信息 */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
                <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span className="text-sm font-medium">{timeline.length} 个节点</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium">总时长: {totalSeconds.toFixed(1)}s</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
                <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-sm font-medium">{resolution.width} × {resolution.height}</span>
              </div>

              <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span className="text-sm font-medium">{FPS} FPS</span>
              </div>
            </div>

            {/* 时间轴 */}
            <Timeline
              timeline={timeline}
              nodes={currentWorkflow.nodes}
              fps={FPS}
            />

            {/* 导出按钮 */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm">
              <h3 className="mb-3 text-sm font-semibold text-neutral-300">导出视频</h3>
              <p className="mb-4 text-sm text-neutral-400">
                生成导出命令，使用 Remotion CLI 渲染最终视频文件。支持 5-10 分钟长视频。
              </p>
              <button
                onClick={() => setShowExportDialog(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 text-sm font-medium text-white transition-all hover:from-purple-600 hover:to-pink-600"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>📤 导出视频</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* 导出对话框 */}
      {showExportDialog && currentWorkflow && (
        <ExportDialog
          workflow={currentWorkflow}
          timeline={timeline}
          onClose={() => setShowExportDialog(false)}
        />
      )}
    </div>
  );
};

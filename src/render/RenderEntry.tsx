// Remotion 渲染入口文件
// 用于 CLI 渲染，读取工作流配置并构建 Composition

import { Composition } from "remotion";
import { AbsoluteFill, Series } from "remotion";
import type { Workflow, NodeTimelineEntry } from "@/types/workflow";
import { getModule } from "@/registry/moduleRegistry";
import { initializeModules } from "@/registry";

// 初始化模块注册
initializeModules();

/**
 * 计算工作流时间轴
 */
const computeTimelineFromWorkflow = (workflow: Workflow, fps: number): NodeTimelineEntry[] => {
  // 筛选启用的节点并按 order 排序
  const enabledNodes = workflow.nodes
    .filter((n) => n.enabled)
    .sort((a, b) => a.order - b.order);

  const timeline: NodeTimelineEntry[] = [];
  let currentFrame = 0;

  for (const node of enabledNodes) {
    try {
      const module = getModule(node.type);
      const duration = module.getDuration(node.config, fps);

      timeline.push({
        nodeId: node.id,
        startFrame: currentFrame,
        endFrame: currentFrame + duration,
        composition: module.CompositionComponent,
        inputProps: module.convertConfigToProps(node.config),
      });

      currentFrame += duration;
    } catch (error) {
      console.error(`Failed to compute timeline for node ${node.id}:`, error);
    }
  }

  return timeline;
};

/**
 * 统一 Composition（Series 集成）
 */
const UnifiedComposition: React.FC<{
  timeline: NodeTimelineEntry[];
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

/**
 * Remotion Root（导出多个 Composition）
 */
export const RemotionRoot: React.FC = () => {
  // 从输入 props 获取工作流配置
  // Remotion CLI 会通过 --props 参数传入
  const workflowData = (window as any).__REMOTION_PROPS__ as {
    workflow: Workflow;
    fps: number;
    width: number;
    height: number;
  };

  // 默认值
  const fps = workflowData?.fps || 30;
  const width = workflowData?.width || 1920;
  const height = workflowData?.height || 1080;
  const workflow = workflowData?.workflow;

  if (!workflow) {
    console.error("No workflow data provided");
    return null;
  }

  // 计算时间轴
  const timeline = computeTimelineFromWorkflow(workflow, fps);
  const totalFrames = timeline.length > 0
    ? timeline[timeline.length - 1].endFrame
    : fps * 3;

  return (
    <>
      <Composition
        id="workflow-output"
        component={UnifiedComposition}
        durationInFrames={totalFrames}
        fps={fps}
        width={width}
        height={height}
        defaultProps={{ timeline }}
      />
    </>
  );
};

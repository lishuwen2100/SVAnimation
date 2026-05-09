// Remotion 渲染入口文件
// 用于 CLI 渲染，读取工作流配置并构建 Composition

import { Composition, registerRoot } from "remotion";
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

// 定义输入 props 的类型
export interface RenderInputProps {
  workflow: Workflow;
  fps: number;
  width: number;
  height: number;
}

/**
 * 可计算的 Composition
 */
export const WorkflowComposition: React.FC<RenderInputProps> = (props) => {
  const { workflow, fps } = props;

  // 计算时间轴
  const timeline = computeTimelineFromWorkflow(workflow, fps);

  return <UnifiedComposition timeline={timeline} />;
};

/**
 * Remotion Root（导出多个 Composition）
 */
const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="workflow-output"
        component={WorkflowComposition}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          workflow: { id: "", name: "", nodes: [], createdAt: 0, updatedAt: 0 },
          fps: 30,
          width: 1920,
          height: 1080,
        }}
        calculateMetadata={({ props }) => {
          const timeline = computeTimelineFromWorkflow(props.workflow, props.fps);
          const totalFrames = timeline.length > 0
            ? timeline[timeline.length - 1].endFrame
            : props.fps * 3;

          return {
            durationInFrames: totalFrames,
            fps: props.fps,
            width: props.width,
            height: props.height,
          };
        }}
      />
    </>
  );
};

// 注册 Remotion Root（CLI 渲染必需）
registerRoot(RemotionRoot);

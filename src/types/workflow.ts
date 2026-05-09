// 工作流系统类型定义

/**
 * 模块类型标识
 */
export type ModuleType = "duck-subtitle" | "text-render" | "effects" | "kanban";

/**
 * 工作流节点
 */
export interface WorkflowNode {
  id: string;                    // UUID
  type: ModuleType;              // 模块类型
  name: string;                  // 用户自定义名称
  order: number;                 // 顺序索引
  enabled: boolean;              // 是否启用
  config: Record<string, any>;   // 模块配置数据
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}

/**
 * 工作流
 */
export interface Workflow {
  id: string;                    // UUID
  name: string;                  // 工作流名称
  nodes: WorkflowNode[];         // 节点列表
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
}

/**
 * 时间轴条目（用于统一播放器）
 */
export interface NodeTimelineEntry {
  nodeId: string;                           // 节点 ID
  startFrame: number;                       // 起始帧
  endFrame: number;                         // 结束帧
  composition: React.ComponentType<any>;    // Remotion Composition 组件
  inputProps: Record<string, any>;          // Composition 的 inputProps
}

/**
 * 模块定义接口
 */
export interface ModuleDefinition {
  type: ModuleType;
  name: string;
  description: string;
  icon: string;
  color: string;  // Tailwind gradient classes

  /**
   * Remotion Composition 组件
   */
  CompositionComponent: React.ComponentType<any>;

  /**
   * 配置编辑器组件
   */
  ConfigEditorComponent: React.ComponentType<{
    config: Record<string, any>;
    onChange: (config: Record<string, any>) => void;
    onFinish: () => void;
  }>;

  /**
   * 获取默认配置
   */
  getDefaultConfig: () => Record<string, any>;

  /**
   * 计算时长（帧数）
   * @param config 模块配置
   * @param fps 帧率
   * @returns 时长（帧数）
   */
  getDuration: (config: Record<string, any>, fps: number) => number;

  /**
   * 将配置转换为 Composition inputProps
   * @param config 模块配置
   * @returns Composition 的 inputProps
   */
  convertConfigToProps: (config: Record<string, any>) => Record<string, any>;
}

/**
 * DuckSubtitle 模块配置
 */
export interface DuckSubtitleConfig {
  srtText: string;
  audioSrc: string | null;
  audioDuration: number;
  centerRegion: {
    x: number;
    y: number;
    width: number;
    height: number;
    show: boolean;
    manualPosition?: { x: number; y: number } | null;
  };
  resolution: {
    id: string;
    width: number;
    height: number;
    label: string;
  };
  subtitleStyles: Record<number, {
    fontFamily?: string;
    fontSize?: number;
    animation?: string;
    customPosition?: { x: number; y: number };
  }>;
  positionMode: "random" | "manual";
}

/**
 * Kanban 模块配置
 */
export interface KanbanConfig {
  videoId: string | null; // IndexedDB 中的视频 ID
  videoFileName?: string; // 文件名
  videoDuration: number; // 视频时长（秒）
  videoSize?: number; // 文件大小（字节）
  resolution: {
    id: string;
    width: number;
    height: number;
    label: string;
  };
}

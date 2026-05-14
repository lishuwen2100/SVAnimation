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
 * DuckSubtitle 字幕项
 */
export interface DuckSubtitleItem {
  id: string;          // 唯一标识
  text: string;        // 字幕文本
  startTime: number;   // 开始时间（秒）
  // 注意：字幕消失时间由倒鸭子旋转逻辑控制，不需要 endTime
  fontFamily?: string;
  fontSize?: number;
  color?: string;      // 字幕颜色（CSS 颜色值）
  animation?: string;
  customPosition?: { x: number; y: number };
}

/**
 * DuckSubtitle 模块配置
 */
export interface DuckSubtitleConfig {
  srtText: string; // 保留用于向后兼容和 SRT 导入
  subtitles: DuckSubtitleItem[]; // 字幕列表（新增）
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
 * 看板字幕/图片动画类型
 */
export type KanbanAnimation =
  | "none"
  | "slam-bounce"
  | "spin-scale"
  | "side-skew"
  | "pop-shake"
  | "bounce-sway";

// 保持向后兼容
export type KanbanSubtitleAnimation = KanbanAnimation;

/**
 * 看板字幕缩放配置
 */
export interface KanbanSubtitleScale {
  enabled: boolean;
  fontSize: number;
  position: { x: number; y: number };
  delay: number; // 缩放延迟时间（秒）
}

/**
 * 看板字幕切换项
 */
export interface KanbanSubtitleSwitchItem {
  id: string; // 唯一标识
  text: string; // 文字内容
  time: number; // 出现时间（秒）
}

/**
 * 看板字幕切换配置
 */
export interface KanbanSubtitleSwitch {
  enabled: boolean;
  items: KanbanSubtitleSwitchItem[]; // 切换文字列表
}

/**
 * 看板字幕配置
 */
export interface KanbanSubtitle {
  id: string; // 唯一标识
  text: string; // 字幕文本
  enterTime: number; // 进入画面时间（秒）
  exitTime: number; // 移出画面时间（秒，0 表示一直显示）
  fontSize: number; // 字体大小
  color: string; // 颜色（CSS 颜色值）
  position: { x: number; y: number }; // 坐标（像素）
  animation: KanbanSubtitleAnimation; // 进入动画
  scale: KanbanSubtitleScale; // 缩放配置
  switch: KanbanSubtitleSwitch; // 切换配置
}

/**
 * 看板图片移动配置
 */
export interface KanbanImageMove {
  enabled: boolean;
  width: number;       // 移动后的宽度
  height: number;      // 移动后的高度
  position: { x: number; y: number }; // 移动到的位置
  startTime: number;   // 开始移动的时间（秒）
  duration: number;    // 移动持续时间（秒）
}

/**
 * 看板图片配置
 */
export interface KanbanImage {
  id: string;          // 唯一标识
  imageData: string;   // Base64 图片数据
  fileName: string;    // 文件名
  enterTime: number;   // 进入画面时间（秒）
  exitTime: number;    // 移出画面时间（秒，0 表示一直显示）
  width: number;       // 图片宽度（像素）
  height: number;      // 图片高度（像素）
  position: { x: number; y: number }; // 坐标（像素）
  animation: KanbanAnimation; // 进入动画
  move: KanbanImageMove; // 移动配置
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
  subtitles: KanbanSubtitle[]; // 字幕列表
  images: KanbanImage[];        // 图片列表
}

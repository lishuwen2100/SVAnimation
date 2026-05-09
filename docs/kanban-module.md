# 看板模块开发文档

## 模块概述

**看板（Kanban）** 是 SVAnimation 的视频播放模块，提供 MP4 视频文件的导入和播放功能。

## 功能特性

### 1. 视频导入
- 支持 MP4 格式视频文件上传
- 自动检测视频时长
- 实时预览导入的视频

### 2. 分辨率支持
- **1920 x 1080 (Full HD)** - 横屏高清
- **1280 x 720 (HD)** - 横屏标清
- **1080 x 1920 (竖屏)** - 移动端竖屏

### 3. 实时预览
- 使用 Remotion Player 实时预览
- 支持播放控制（播放/暂停/进度条）
- 自适应容器尺寸

## 技术实现

### 文件结构

```
src/
├── modules/
│   ├── Kanban.tsx                          # 向后兼容入口
│   └── Kanban/
│       ├── KanbanComposition.tsx           # Remotion Composition
│       └── KanbanConfigEditor.tsx          # 配置编辑器
├── registry/
│   └── modules/
│       └── kanban.tsx                      # 模块注册定义
└── types/
    └── workflow.ts                         # 类型定义
```

### 核心组件

#### KanbanComposition
Remotion Composition 组件，负责视频渲染：
- 使用 Remotion 的 `<Video>` 组件
- 支持视频容器适配（contain）
- 处理无视频状态的占位显示

#### KanbanConfigEditor
配置编辑器组件，提供用户界面：
- 视频文件上传
- 分辨率选择
- 实时预览播放器
- 响应式布局（左侧控制，右侧预览）

### 配置类型

```typescript
interface KanbanConfig {
  videoSrc: string | null;           // 视频源 URL
  videoDuration: number;             // 视频时长（秒）
  resolution: {                      // 分辨率配置
    id: string;
    width: number;
    height: number;
    label: string;
  };
}
```

### 模块注册

模块通过 `moduleRegistry` 系统注册：
- **type**: `"kanban"`
- **name**: "看板"
- **icon**: 📋
- **color**: cyan/blue gradient

## 工作流集成

### 在工作流中使用

1. 进入工作流编辑器
2. 点击"添加节点"
3. 选择"看板"模块
4. 上传 MP4 视频
5. 选择分辨率
6. 预览并保存

### 时长计算

模块的 `getDuration` 方法：
- 有视频：使用实际视频时长
- 无视频：默认 8 秒

### Props 转换

`convertConfigToProps` 将配置转换为 Composition props：
```typescript
{
  videoSrc: string | null,
  compositionSize: { width, height }
}
```

## 使用场景

1. **视频片段导入** - 将外部视频导入工作流
2. **视频预处理** - 作为工作流的输入源
3. **多段拼接** - 与其他模块组合创建复杂视频

## 后续扩展方向

- [ ] 视频裁剪功能
- [ ] 视频滤镜效果
- [ ] 多视频轨道
- [ ] 视频转场效果
- [ ] 音频分离/替换
- [ ] 字幕叠加
- [ ] 速度调节
- [ ] 视频旋转/翻转

## 开发注意事项

### 视频格式
- 当前仅支持 MP4 格式
- 考虑未来扩展其他格式（WebM、MOV 等）

### 性能优化
- 大文件上传需要考虑加载状态
- 建议添加文件大小限制
- 考虑视频缩略图生成

### 错误处理
- 视频加载失败处理
- 文件格式验证
- 时长检测异常处理

## API 参考

### KanbanConfigEditor Props
```typescript
interface KanbanConfigEditorProps {
  config: KanbanConfig;           // 当前配置
  onChange: (config: KanbanConfig) => void;  // 配置变更回调
  onFinish: () => void;           // 完成回调
}
```

### KanbanComposition Props
```typescript
interface KanbanCompositionProps {
  videoSrc: string | null;        // 视频源
  compositionSize: {              // 画布尺寸
    width: number;
    height: number;
  };
}
```

## 版本历史

### v1.0.0 (2026-05-09)
- ✅ 初始版本
- ✅ MP4 视频导入
- ✅ 三种分辨率支持
- ✅ Remotion Player 预览
- ✅ 工作流系统集成

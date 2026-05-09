# SVAnimation - 短视频特效助手

基于 Remotion 的短视频特效工具集，提供多种特效模块供视频创作者使用。

## 技术栈

- **React 19** - UI 框架
- **Vite 7** - 构建工具
- **Tailwind CSS 4** - 样式框架
- **Remotion 4** - 视频渲染引擎
- **TypeScript 5** - 类型系统

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

## 功能模块

### 🦆 倒鸭子字幕

整句字幕贴合动画，每3句左转90度，支持SRT和MP3导入。

**特性：**
- 整句中文字幕显示（不拆字不拆词）
- 几何贴合算法（新字幕贴合上一条的底部）
- 每3条字幕自动旋转90度
- 中心区域约束（自动回中）
- 5种进入动画可选
- 5种分辨率预设
- 鼠标框选中心区域
- MP3音频同步

### 📋 看板

导入并播放 MP4 视频文件，可作为工作流的视频输入源。

**特性：**
- MP4 视频文件导入
- 自动检测视频时长
- 三种分辨率支持（1080p/720p/竖屏）
- 实时预览播放
- 工作流集成

### ✨ 更多特效

持续开发中...

## 文档

### 用户文档
- **[使用指南](docs/usage.md)** - 详细的用户操作指南
- **[功能模块](docs/)** - 各模块的功能说明

### 开发文档
- **[工作流编辑器](docs/workflow-editor.md)** - 工作流系统架构
- **[设计文档](DESIGN.md)** - 完整的设计规范
- **[开发指南](CLAUDE.md)** - Claude Code 开发指南

### 模块文档
- **[看板模块](docs/kanban-module.md)** - 视频字幕编辑器
- **[字幕功能](docs/kanban-subtitle-feature.md)** - 字幕系统文档
- **[字幕切换](docs/kanban-subtitle-switch-feature.md)** - 文字切换功能
- **[翻转动画](docs/kanban-subtitle-flip-animation.md)** - 3D 翻转效果

### 技术文档
- **[IndexedDB 实现](docs/kanban-indexeddb-implementation.md)** - 视频存储方案
- **[模块演进](docs/kanban-module-evolution.md)** - 开发历史

### 计划文档
- **[待办事项](docs/todo.md)** - 当前任务列表
- **[未来规划](docs/future-plans.md)** - 功能路线图
- **[Bug 修复](docs/bugfix-summary.md)** - 修复记录
- **[导出指南](docs/export-guide.md)** - 视频导出使用文档

## 许可证

MIT

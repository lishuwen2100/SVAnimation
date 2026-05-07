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

### ✨ 更多特效

持续开发中...

## 项目结构

```
src/
├── App.tsx              # 主界面和模块导航
├── modules/             # 特效模块目录
│   └── DuckSubtitle.tsx # 倒鸭子字幕模块
├── utils/               # 工具函数
├── main.tsx             # 应用入口
└── index.css            # 全局样式
```

## 开发指南

### 添加新模块

1. 在 `src/modules/` 创建新模块文件
2. 导出命名组件（如 `export function YourModule()`）
3. 在 `src/App.tsx` 中导入模块
4. 添加模块卡片到 `modules` 数组
5. 添加导航逻辑

示例：

```typescript
// src/modules/YourModule.tsx
export function YourModule() {
  return <div>Your module content</div>;
}

// src/App.tsx
import { YourModule } from "./modules/YourModule";

const modules = [
  // ...
  {
    id: "your-module",
    title: "你的模块",
    description: "模块描述",
    icon: "✨",
    color: "from-blue-500/20 to-cyan-500/20 border-blue-500/30 hover:border-blue-500/60",
  },
];
```

## 许可证

MIT

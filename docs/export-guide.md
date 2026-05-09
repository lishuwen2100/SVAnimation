# SVAnimation 视频导出指南

## 概述

SVAnimation 支持将工作流渲染为最终的 MP4 视频文件。导出功能使用 Remotion CLI 进行渲染，支持 5-10 分钟的长视频导出。

## 快速开始

### 1. 打开导出对话框

在统一播放器界面，点击"导出视频"按钮。

### 2. 配置导出选项

**分辨率选择：**
- 1080p (1920×1080) - 全高清横屏
- 720p (1280×720) - 高清横屏
- 竖屏 (1080×1920) - 移动设备竖屏

**帧率选择：**
- 30 FPS - 标准帧率，文件较小
- 60 FPS - 高帧率，更流畅

**输出文件名：**
- 自定义输出文件名，默认为 `output.mp4`

### 3. 生成导出配置

点击"生成导出配置"按钮，系统会：
1. 自动下载工作流配置文件（JSON）
2. 列出需要下载的视频文件
3. 生成导出命令

### 4. 下载视频文件（如有）

如果工作流包含视频：
1. 点击每个视频的"下载"按钮
2. 或点击"下载全部视频"一次性下载
3. 在项目根目录创建 `videos/` 文件夹
4. 将下载的视频文件放入 `videos/` 文件夹

### 5. 执行导出命令

1. 复制生成的导出命令
2. 在项目根目录打开终端
3. 粘贴并执行命令
4. 等待渲染完成

## 导出命令详解

### 基础命令

```bash
npm run export workflow-export.json output.mp4
```

**参数说明：**
- `workflow-export.json` - 工作流配置文件（必需）
- `output.mp4` - 输出文件名（可选，默认 output.mp4）

### 高级选项

```bash
npm run export workflow-export.json output.mp4 -- --width=1920 --height=1080 --fps=60
```

**可用选项：**
- `--width=<数字>` - 视频宽度（像素）
- `--height=<数字>` - 视频高度（像素）
- `--fps=<数字>` - 帧率（30 或 60）

## 文件结构

导出需要以下文件结构：

```
your-project/
├── workflow-export.json    # 工作流配置文件（自动下载）
├── videos/                 # 视频文件目录（手动创建）
│   ├── video-xxx.mp4      # 从 IndexedDB 导出的视频
│   └── video-yyy.mp4
├── scripts/
│   └── export-workflow.js  # 导出脚本
└── output.mp4              # 渲染后的输出文件
```

## 渲染时间估算

渲染时间取决于：
- 视频总时长
- 分辨率（1080p 比 720p 慢）
- 帧率（60 FPS 比 30 FPS 慢）
- 特效复杂度
- 电脑性能

**参考时间：**
- 1 分钟视频：约 1-3 分钟
- 5 分钟视频：约 5-10 分钟
- 10 分钟视频：约 10-20 分钟

## 渲染过程

执行导出命令后，你会看到：

```
📹 SVAnimation 视频导出
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📁 工作流文件: workflow-export.json
💾 输出文件: output.mp4
🎬 工作流名称: 我的视频项目
📊 节点数量: 3
📐 分辨率: 1920x1080
⚡ 帧率: 30 FPS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ 开始渲染...

[进度条和实时信息]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 导出完成！
📹 视频文件: /path/to/output.mp4
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 常见问题

### Q: 视频文件在哪里？

A: 渲染完成的视频文件在项目根目录，文件名就是你指定的输出文件名（默认 `output.mp4`）。

### Q: 为什么需要手动下载视频？

A: 工作流中的视频存储在浏览器的 IndexedDB，CLI 渲染时无法直接访问。需要先导出为本地文件。

### Q: 可以在渲染时修改工作流吗？

A: 可以，渲染使用的是导出时的配置文件，不会受到后续修改影响。

### Q: 渲染失败怎么办？

A: 常见原因：
1. 视频文件路径不正确 → 检查 `videos/` 文件夹
2. 工作流配置文件损坏 → 重新生成导出配置
3. 依赖未安装 → 运行 `npm install`
4. 磁盘空间不足 → 清理空间（至少需要 2GB）

### Q: 可以取消渲染吗？

A: 可以，在终端按 `Ctrl+C` 终止渲染进程。

### Q: 支持哪些视频格式？

A: 目前支持 MP4 格式（H.264 编码），这是最通用的格式。

## 高级技巧

### 自定义编码参数

修改 `remotion.config.ts` 文件：

```typescript
import { Config } from "@remotion/cli/config";

// 设置编码质量（默认：80，范围 0-100）
Config.setCrf(18); // 更高质量（文件更大）

// 设置编码器预设（ultrafast, fast, medium, slow）
Config.setCodec("h264");
```

### 批量导出

创建一个 Shell 脚本批量导出多个工作流：

```bash
#!/bin/bash

for workflow in workflow-*.json; do
  output="${workflow%.json}.mp4"
  npm run export "$workflow" "$output"
done
```

### 导出不同格式

使用 FFmpeg 转换格式：

```bash
# 导出为 WebM
ffmpeg -i output.mp4 -c:v libvpx-vp9 output.webm

# 导出为 GIF（小文件）
ffmpeg -i output.mp4 -vf "scale=640:-1" output.gif
```

## 性能优化

### 提升渲染速度

1. **降低分辨率**：720p 比 1080p 快约 2 倍
2. **降低帧率**：30 FPS 比 60 FPS 快约 2 倍
3. **减少特效**：复杂动画会显著增加渲染时间
4. **关闭其他程序**：释放 CPU 和内存

### 减小文件大小

1. **调整 CRF 值**：在 `remotion.config.ts` 中设置更高的 CRF（如 28）
2. **降低分辨率**：720p 文件大小约为 1080p 的 50%
3. **降低帧率**：30 FPS 文件大小约为 60 FPS 的 50%

## macOS 兼容性

⚠️ **重要提示**: macOS 15 (Sequoia) 以下的系统可能遇到音频合成失败的问题。

**常见错误**:
```
Error: Symbol not found: (_AVCaptureDeviceTypeContinuityCamera)
```

**解决方案**: 详见 [macOS 兼容性说明](macos-compatibility.md)

## 故障排除

### 错误：找不到工作流文件

```
❌ 错误: 工作流文件不存在: workflow-export.json
```

**解决方法：**
- 确保配置文件在当前目录
- 检查文件名拼写是否正确

### 错误：视频文件缺失

```
Error: Video file not found
```

**解决方法：**
1. 检查 `videos/` 文件夹是否存在
2. 确认所有视频文件都已下载并放置正确
3. 检查文件名是否与配置文件匹配

### 错误：内存不足

```
JavaScript heap out of memory
```

**解决方法：**
```bash
# 增加 Node.js 内存限制
NODE_OPTIONS=--max-old-space-size=8192 npm run export workflow.json output.mp4
```

### 渲染卡住不动

**可能原因：**
- 视频文件过大或损坏
- 某个特效导致死循环

**解决方法：**
1. 按 `Ctrl+C` 终止
2. 检查工作流中的视频和特效
3. 尝试禁用部分节点后重新导出

## 未来计划

- [ ] 一键导出（无需复制命令）
- [ ] 实时渲染进度条
- [ ] 导出预设（快速/标准/高质量）
- [ ] 云端渲染支持
- [ ] 批量导出界面

## 技术细节

### 渲染流程

1. **读取配置**：从 JSON 文件读取工作流配置
2. **构建时间轴**：计算每个节点的开始/结束帧
3. **初始化 Composition**：创建 Remotion Composition
4. **逐帧渲染**：使用浏览器引擎渲染每一帧
5. **视频编码**：将帧序列编码为 MP4 文件

### 使用的技术

- **Remotion CLI** - 视频渲染引擎
- **Puppeteer** - 无头浏览器（自动安装）
- **FFmpeg** - 视频编码（自动下载）
- **Node.js** - 脚本运行环境

## 相关文档

- [Remotion 官方文档](https://www.remotion.dev/docs/)
- [工作流编辑器文档](workflow-editor.md)
- [视频持久化说明](data-persistence.md)

## 支持与反馈

如果遇到问题或有建议，请：
1. 查看本文档的故障排除部分
2. 检查浏览器控制台和终端错误信息
3. 在项目 Issues 中反馈问题

---

**提示**: 首次渲染可能需要下载 FFmpeg 和 Puppeteer，请耐心等待。后续渲染会快很多。

# macOS 兼容性说明

## 问题描述

在 macOS 15 (Sequoia) 以下的系统上导出视频时，可能会遇到以下错误：

```
Error: Command was killed with SIGABRT (Aborted)
dyld: Symbol not found: (_AVCaptureDeviceTypeContinuityCamera)
```

这是 Remotion 4.0.459 的已知限制，详见：https://github.com/remotion-dev/remotion/issues/7027

## 影响范围

- **受影响系统**: macOS 14 (Sonoma) 及更早版本
- **影响阶段**: 视频渲染的最后阶段（音频合成）
- **渲染进度**: 视频帧已全部渲染完成（5260/5260），但无法合成最终文件

## 解决方案

### 方案 1：升级 macOS（推荐）

升级到 macOS 15 (Sequoia) 或更高版本即可完全解决此问题。

### 方案 2：使用旧版本 Remotion

降级到 Remotion 3.x 版本：

```bash
npm install remotion@3.3.98 @remotion/cli@3.3.98 @remotion/bundler@3.3.98 @remotion/player@3.3.98
```

⚠️ **注意**: 降级可能导致某些新功能不可用。

### 方案 3：手动合成（当前可用）

由于视频帧已经完全渲染，你可以手动完成最后的合成步骤：

#### 步骤 1: 找到渲染的帧文件

渲染的帧文件保存在临时目录：
```
/var/folders/.../remotion-v4.0.459-assets.../frames/
```

可以在渲染输出中找到确切路径。

#### 步骤 2: 使用 FFmpeg 手动合成

如果你的工作流**包含视频**：

```bash
# 提取原视频的音频
ffmpeg -i videos/your-video.mp4 -vn -acodec copy audio.aac

# 合成视频帧 + 音频
ffmpeg -framerate 30 -i /path/to/frames/frame-%05d.jpeg -i audio.aac -c:v libx264 -pix_fmt yuv420p -c:a aac output.mp4
```

如果你的工作流**不包含视频**（纯字幕）：

```bash
# 仅合成视频帧（无音频）
ffmpeg -framerate 30 -i /path/to/frames/frame-%05d.jpeg -c:v libx264 -pix_fmt yuv420p output.mp4
```

### 方案 4：使用 Docker（进阶）

使用 Docker 运行 Remotion，可以避免系统兼容性问题：

```bash
# 拉取 Remotion Docker 镜像
docker pull remotion/render

# 运行渲染
docker run --rm -v $(pwd):/app remotion/render \
  npx remotion render src/render/RenderEntry.tsx workflow-output output.mp4 \
  --props='$(cat workflow-export.json)'
```

### 方案 5：云端渲染

使用 Remotion Lambda 或其他云服务进行渲染，避开本地系统限制。

## 临时处理建议

在等待系统升级或解决方案的情况下：

1. **优先渲染短视频**：测试时使用短视频（< 30秒）
2. **分段渲染**：将长工作流拆分为多个短节点
3. **使用其他工具**：导出单帧PNG序列，使用 After Effects 等工具合成

##常见问题

### Q: 为什么 --muted 选项无效？

A: `--muted` 选项仍然会生成静音音频轨道，而音频处理依赖 AVFoundation 框架的新 API，这在旧 macOS 上不可用。

### Q: 可以跳过音频合成吗？

A: 目前 Remotion CLI 没有提供完全跳过音频处理的选项。需要使用方案 3 手动合成。

### Q: 帧文件在哪里？

A: 在渲染输出的早期部分会显示类似这样的路径：
```
Using temp folder: /var/folders/wg/nvtxwqtj5nz9f4jwgh89y3tm0000gn/T/remotion-v4.0.459-assets...
```

帧文件在 `frames/` 子目录中。

### Q: 可以保留帧文件吗？

A: 默认情况下，Remotion 会在渲染完成后删除临时文件。可以添加环境变量：
```bash
REMOTION_KEEP_ARTIFACTS=1 npm run export workflow.json output.mp4
```

## 进度跟踪

我们正在关注 Remotion 团队的修复进展：
- GitHub Issue: https://github.com/remotion-dev/remotion/issues/7027
- 预计修复版本: TBD

## 相关文档

- [导出指南](export-guide.md)
- [Remotion 官方文档](https://www.remotion.dev/docs/)
- [FFmpeg 文档](https://ffmpeg.org/documentation.html)

## 反馈与支持

如果你找到了其他解决方案，欢迎：
1. 更新本文档
2. 在项目 Issues 中分享
3. 提交 PR 改进工具

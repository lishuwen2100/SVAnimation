# 修复看板模块视频播放问题

## 问题描述

用户导入 MP4 视频后，播放时看不到画面。

## 问题原因

### 1. Blob URL 过早释放
在 `KanbanConfigEditor.tsx` 中，代码在获取视频时长后立即调用了 `URL.revokeObjectURL(url)`：

```typescript
// 错误代码
videoElement.onloadedmetadata = () => {
  const duration = videoElement.duration;
  onChange({
    ...config,
    videoSrc: url,
    videoDuration: duration,
  });
  URL.revokeObjectURL(url); // ❌ 过早释放，导致后续无法访问
};
```

这导致 Blob URL 被释放，后续的播放器无法访问该视频源。

### 2. 使用 Video 而非 OffthreadVideo
Remotion 推荐使用 `<OffthreadVideo>` 组件来获得更好的性能和兼容性。

## 解决方案

### 1. 延迟 Blob URL 释放

添加 URL 管理机制：
- 使用 `useRef` 跟踪当前 Blob URL
- 在上传新视频时释放旧 URL
- 在组件卸载时释放 URL

```typescript
const previousVideoUrlRef = useRef<string | null>(null);

// 清理机制
useEffect(() => {
  return () => {
    if (previousVideoUrlRef.current && previousVideoUrlRef.current.startsWith("blob:")) {
      URL.revokeObjectURL(previousVideoUrlRef.current);
    }
  };
}, []);

const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  // ... 文件验证

  // 释放之前的 Blob URL
  if (previousVideoUrlRef.current && previousVideoUrlRef.current.startsWith("blob:")) {
    URL.revokeObjectURL(previousVideoUrlRef.current);
  }

  // 创建新的 Blob URL
  const url = URL.createObjectURL(file);
  previousVideoUrlRef.current = url;

  videoElement.onloadedmetadata = () => {
    onChange({
      ...config,
      videoSrc: url,
      videoDuration: duration,
    });
    // ✅ 不立即释放，保持 URL 可用
  };
};
```

### 2. 使用 OffthreadVideo

```typescript
// 修改前
import { Video } from "remotion";
<Video src={videoSrc} ... />

// 修改后
import { OffthreadVideo } from "remotion";
<OffthreadVideo src={videoSrc} ... />
```

## 修改文件

### KanbanConfigEditor.tsx
- 导入 `useEffect`
- 添加 `previousVideoUrlRef` 引用
- 添加清理 effect
- 修改 `handleVideoUpload` 逻辑

### KanbanComposition.tsx
- 将 `Video` 改为 `OffthreadVideo`

## 测试验证

1. 启动开发服务器
2. 进入看板模块
3. 上传 MP4 视频
4. 点击播放按钮
5. 验证视频正常显示和播放

## Blob URL 生命周期

```
上传视频
  ↓
创建 Blob URL (URL.createObjectURL)
  ↓
保存到 previousVideoUrlRef
  ↓
传递给 Player/Composition
  ↓
视频正常播放
  ↓
上传新视频 OR 组件卸载
  ↓
释放 Blob URL (URL.revokeObjectURL)
```

## 最佳实践

### Blob URL 管理
- ✅ 在需要时创建
- ✅ 保持引用直到不再需要
- ✅ 在替换或卸载时释放
- ❌ 不要过早释放

### Remotion 视频组件选择
- `<Video>` - 基础视频组件
- `<OffthreadVideo>` - 推荐，更好的性能
- `<staticFile()>` - 用于 public 目录的静态文件

## 性能优化建议

1. **内存管理**
   - 及时释放不用的 Blob URL
   - 避免创建多个未释放的 URL

2. **大文件处理**
   - 考虑添加文件大小限制
   - 显示上传进度

3. **视频预加载**
   - 使用 `preload="metadata"` 快速获取信息
   - 按需加载完整视频

## 相关资源

- [Remotion Video Component](https://www.remotion.dev/docs/video)
- [Remotion OffthreadVideo](https://www.remotion.dev/docs/offthread-video)
- [MDN: URL.createObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL)
- [MDN: URL.revokeObjectURL](https://developer.mozilla.org/en-US/docs/Web/API/URL/revokeObjectURL)

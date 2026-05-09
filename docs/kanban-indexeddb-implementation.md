# 看板模块 IndexedDB 实现文档

## 概述

看板模块使用 IndexedDB 存储视频文件，替代之前的 Base64 Data URL 方案，支持大文件存储。

## 架构设计

### 数据流

```
用户上传视频
  ↓
保存到 IndexedDB (videoId)
  ↓
配置保存 videoId 到 localStorage
  ↓
渲染时从 IndexedDB 读取
  ↓
创建临时 Blob URL
  ↓
Remotion 渲染视频
  ↓
组件卸载时释放 Blob URL
```

### 核心组件

#### 1. videoStorage.ts - 存储工具类

提供 IndexedDB 操作的封装：

```typescript
// 保存视频
const videoId = await saveVideo(file, fileName, duration);

// 获取视频
const record = await getVideo(videoId);

// 获取 Blob URL
const url = await getVideoUrl(videoId);

// 删除视频
await deleteVideo(videoId);

// 清理未使用的视频
await cleanupUnusedVideos(usedIds);
```

#### 2. KanbanCompositionWrapper - 异步加载包装器

处理 Remotion Composition 的异步视频加载：

```typescript
<KanbanCompositionWrapper
  videoId={videoId}
  compositionSize={{ width, height }}
/>
```

- 从 IndexedDB 加载视频
- 创建临时 Blob URL
- 传递给实际的 Composition
- 组件卸载时清理 URL

#### 3. KanbanConfigEditor - 配置编辑器

- 上传视频保存到 IndexedDB
- 显示视频信息（文件名、时长、大小）
- 实时预览（自动加载视频）
- 管理旧视频的清理

## IndexedDB 结构

### 数据库配置

```typescript
const DB_NAME = "svanimation-videos";
const DB_VERSION = 1;
const STORE_NAME = "videos";
```

### 数据模型

```typescript
interface VideoRecord {
  id: string;           // 主键：video-{timestamp}-{random}
  file: Blob;           // 视频文件
  fileName: string;     // 原始文件名
  fileSize: number;     // 文件大小（字节）
  duration: number;     // 视频时长（秒）
  uploadedAt: number;   // 上传时间戳
}
```

### 索引

- `uploadedAt`: 按上传时间排序，方便清理旧视频

## 配置数据结构

### KanbanConfig

```typescript
interface KanbanConfig {
  videoId: string | null;      // IndexedDB 中的视频 ID
  videoFileName?: string;       // 文件名（用于显示）
  videoDuration: number;        // 视频时长（秒）
  videoSize?: number;           // 文件大小（字节）
  resolution: {                 // 输出分辨率
    id: string;
    width: number;
    height: number;
    label: string;
  };
}
```

### 数据持久化

- **videoId** → localStorage（轻量级引用）
- **video file** → IndexedDB（大文件存储）

## 对比方案

### Base64 Data URL（旧方案）

**优点：**
- ✅ 实现简单
- ✅ 数据自包含
- ✅ 无需异步加载

**缺点：**
- ❌ 文件大小限制（~50MB）
- ❌ 编码开销（+33% 大小）
- ❌ 占用 localStorage 空间
- ❌ 编码时间长

### IndexedDB（新方案）

**优点：**
- ✅ 支持大文件（GB 级别）
- ✅ 无编码开销
- ✅ 不占用 localStorage
- ✅ 更好的性能
- ✅ 独立的存储配额

**缺点：**
- ⚠️ 实现复杂
- ⚠️ 需要异步加载
- ⚠️ 需要清理机制

## 实现细节

### 1. 上传视频

```typescript
const handleVideoUpload = async (file: File) => {
  // 1. 创建临时 URL 获取时长
  const tempUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.src = tempUrl;

  video.onloadedmetadata = async () => {
    const duration = video.duration;
    URL.revokeObjectURL(tempUrl);

    // 2. 删除旧视频
    if (previousVideoIdRef.current) {
      await deleteVideo(previousVideoIdRef.current);
    }

    // 3. 保存到 IndexedDB
    const videoId = await saveVideo(file, file.name, duration);

    // 4. 更新配置
    onChange({
      ...config,
      videoId,
      videoFileName: file.name,
      videoDuration: duration,
      videoSize: file.size,
    });
  };
};
```

### 2. 加载视频（编辑器预览）

```typescript
useEffect(() => {
  let objectUrl: string | null = null;

  const loadVideo = async () => {
    if (config.videoId) {
      const url = await getVideoUrl(config.videoId);
      objectUrl = url;
      setVideoUrl(url);
    }
  };

  loadVideo();

  return () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  };
}, [config.videoId]);
```

### 3. Composition 包装器

```typescript
export function KanbanCompositionWrapper({ videoId, compositionSize }) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      if (videoId) {
        const url = await getVideoUrl(videoId);
        objectUrl = url;
        setVideoUrl(url);
      }
      setIsLoading(false);
    };

    loadVideo();

    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [videoId]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <KanbanComposition videoSrc={videoUrl} compositionSize={compositionSize} />;
}
```

## 生命周期管理

### Blob URL 清理

每个组件管理自己的 Blob URL：

```typescript
useEffect(() => {
  let objectUrl: string | null = null;

  // 加载时创建
  loadVideo().then(url => {
    objectUrl = url;
  });

  // 卸载时清理
  return () => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl);
    }
  };
}, [videoId]);
```

### 视频文件清理

#### 自动清理（上传新视频时）

```typescript
if (previousVideoIdRef.current) {
  await deleteVideo(previousVideoIdRef.current);
}
```

#### 手动清理（管理功能）

```typescript
// 获取所有工作流中使用的视频 ID
const usedIds = new Set<string>();
workflows.forEach(workflow => {
  workflow.nodes.forEach(node => {
    if (node.type === "kanban" && node.config.videoId) {
      usedIds.add(node.config.videoId);
    }
  });
});

// 清理未使用的视频
const deletedCount = await cleanupUnusedVideos(usedIds);
console.log(`Cleaned up ${deletedCount} unused videos`);
```

## 性能优化

### 1. 延迟加载

只在需要时加载视频：
- 配置编辑器打开时
- Composition 渲染时
- 不在列表视图时不加载

### 2. 缓存策略

Blob URL 在组件生命周期内复用：
```typescript
const [videoUrl, setVideoUrl] = useState<string | null>(null);
// URL 在组件存活期间保持不变
```

### 3. 批量操作

```typescript
// 批量删除未使用的视频
const promises = unusedIds.map(id => deleteVideo(id));
await Promise.all(promises);
```

## 错误处理

### 1. 视频加载失败

```typescript
try {
  const url = await getVideoUrl(videoId);
  if (!url) {
    console.error("Video not found");
    // 显示占位符
  }
} catch (error) {
  console.error("Failed to load video:", error);
  // 显示错误状态
}
```

### 2. 存储空间不足

```typescript
try {
  await saveVideo(file, fileName, duration);
} catch (error) {
  if (error.name === "QuotaExceededError") {
    alert("存储空间不足，请清理旧视频");
  }
}
```

### 3. 数据库访问失败

```typescript
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error("Failed to open IndexedDB"));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };
  });
};
```

## 存储限制

### 浏览器配额

不同浏览器的 IndexedDB 配额不同：

| 浏览器 | 配额 | 说明 |
|--------|------|------|
| Chrome | 可用磁盘空间的 60% | 动态分配 |
| Firefox | 可用磁盘空间的 50% | 超过 50MB 需要用户确认 |
| Safari | ~1GB | iOS 更严格 |
| Edge | 同 Chrome | 基于 Chromium |

### 查询存储使用

```typescript
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage || 0;
  const quota = estimate.quota || 0;
  const percentUsed = (usage / quota) * 100;

  console.log(`存储使用率: ${percentUsed.toFixed(1)}%`);
  console.log(`已使用: ${(usage / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`配额: ${(quota / (1024 * 1024)).toFixed(2)} MB`);
}
```

## 迁移指南

### 从 Base64 迁移到 IndexedDB

如果用户已有使用 Base64 的工作流：

```typescript
// 检测旧配置
if (config.videoSrc && config.videoSrc.startsWith("data:")) {
  // 转换 Base64 → Blob
  const blob = dataURLtoBlob(config.videoSrc);

  // 保存到 IndexedDB
  const videoId = await saveVideo(blob, "migrated-video.mp4", config.videoDuration);

  // 更新配置
  onChange({
    ...config,
    videoId,
    videoSrc: undefined, // 移除旧字段
  });
}

function dataURLtoBlob(dataurl: string): Blob {
  const arr = dataurl.split(",");
  const mime = arr[0].match(/:(.*?);/)?.[1] || "video/mp4";
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}
```

## 调试工具

### 查看 IndexedDB 数据

Chrome DevTools:
1. 打开 DevTools (F12)
2. Application 标签
3. Storage → IndexedDB → svanimation-videos
4. 查看 videos 对象存储

### 统计信息

```typescript
const stats = await getStorageStats();
console.log(`视频数量: ${stats.count}`);
console.log(`总大小: ${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`);
```

## 最佳实践

### 1. 文件命名

保留原始文件名，方便用户识别：
```typescript
videoFileName: file.name
```

### 2. 定期清理

建议在应用启动时清理未使用的视频：
```typescript
useEffect(() => {
  // 应用启动时清理
  cleanupUnusedVideos(getAllUsedVideoIds());
}, []);
```

### 3. 错误提示

提供友好的错误信息：
```typescript
if (error.name === "QuotaExceededError") {
  alert("存储空间不足，请清理旧视频或删除不需要的工作流");
}
```

### 4. 加载状态

显示加载进度：
```typescript
{isLoading && <LoadingSpinner text="加载视频中..." />}
```

## 后续优化

### 1. 压缩优化

在保存前压缩视频：
```typescript
import { FFmpeg } from '@ffmpeg/ffmpeg';

const compressedBlob = await compressVideo(file, {
  maxSize: 100 * 1024 * 1024, // 100MB
  quality: 0.8,
});
```

### 2. 增量加载

对于超大视频，分块加载：
```typescript
// 保存时分块
await saveVideoChunks(file, videoId);

// 播放时按需加载
const chunk = await getVideoChunk(videoId, chunkIndex);
```

### 3. 缩略图生成

保存视频缩略图用于列表显示：
```typescript
const thumbnail = await generateThumbnail(videoUrl);
await saveThumbnail(videoId, thumbnail);
```

## 相关资源

- [IndexedDB API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Storage API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API)
- [Blob API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
- [Storage for the Web](https://web.dev/storage-for-the-web/)

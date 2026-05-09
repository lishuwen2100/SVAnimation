# 修复看板模块视频持久化问题

## 问题描述

**症状：**
1. 在看板模块编辑器中上传视频，预览正常
2. 退出编辑器返回工作流界面，预览时视频无法播放
3. 再次进入看板编辑器，视频也无法播放

**影响范围：**
- 工作流预览（UnifiedPlayer）
- 重新打开配置编辑器
- 刷新页面后

## 根本原因

### Blob URL 的生命周期问题

之前的实现使用 `URL.createObjectURL()` 创建临时 Blob URL：

```typescript
const url = URL.createObjectURL(file);  // 创建 Blob URL
// url 格式: "blob:http://localhost:5173/abc123..."
```

**问题：**
1. **Blob URL 是临时的**
   - 仅在当前浏览器会话中有效
   - 绑定到创建它的文档上下文
   
2. **组件卸载时 URL 被释放**
   ```typescript
   useEffect(() => {
     return () => {
       URL.revokeObjectURL(url); // 组件卸载时释放
     };
   }, []);
   ```

3. **无法跨组件共享**
   - 编辑器组件卸载 → URL 失效
   - 其他组件（预览、播放器）无法访问

4. **无法持久化**
   - Blob URL 不能保存到 localStorage
   - 刷新页面后 URL 失效

### 工作流程图

```
上传视频
  ↓
创建 Blob URL (blob:...)
  ↓
保存到工作流配置
  ↓
退出编辑器 → 组件卸载
  ↓
Blob URL 被释放 (URL.revokeObjectURL)
  ↓
预览器读取配置
  ↓
❌ URL 已失效，视频无法播放
```

## 解决方案

### 使用 Base64 Data URL

将视频文件转换为 Base64 Data URL，这是一个完整的、自包含的数据 URI。

#### 优点
✅ **完全自包含** - 数据嵌入在 URL 中  
✅ **可持久化** - 可以保存到 localStorage  
✅ **跨组件共享** - 任何组件都能访问  
✅ **会话独立** - 刷新页面仍然有效  
✅ **无需清理** - 没有生命周期管理

#### 缺点
⚠️ **文件大小限制** - 建议不超过 50MB  
⚠️ **编码时间** - 大文件需要几秒钟  
⚠️ **内存占用** - Base64 比原文件大约 33%

### 实现细节

#### 1. 文件转 Base64

```typescript
const reader = new FileReader();

reader.onload = (event) => {
  const dataUrl = event.target?.result as string;
  // dataUrl 格式: "data:video/mp4;base64,AAAAA..."
  
  // 保存到配置
  onChange({
    ...config,
    videoSrc: dataUrl,  // Base64 Data URL
  });
};

reader.readAsDataURL(file);
```

#### 2. 文件大小限制

```typescript
const maxSize = 50 * 1024 * 1024; // 50MB
if (file.size > maxSize) {
  alert("视频文件过大（超过 50MB），请选择较小的文件");
  return;
}
```

#### 3. 上传状态显示

```typescript
const [isUploading, setIsUploading] = useState(false);

// 上传开始
setIsUploading(true);

// 上传完成
setIsUploading(false);

// UI
{isUploading ? "上传中..." : "上传 MP4 视频"}
```

#### 4. 文件信息显示

```typescript
export interface KanbanConfig {
  videoSrc: string | null;
  videoDuration: number;
  videoSize?: number;  // 新增：文件大小
  // ...
}

// 显示
{config.videoSize && (
  <div>大小: {(config.videoSize / (1024 * 1024)).toFixed(2)} MB</div>
)}
```

## 数据格式对比

### Blob URL (旧方案)
```
blob:http://localhost:5173/abc123-def456-...
```
- 长度：~50 字符
- 特点：临时引用，无法持久化

### Base64 Data URL (新方案)
```
data:video/mp4;base64,AAAAIGZ0eXBpc29tAAACAGlzb21pc28y...
```
- 长度：文件大小 × 1.33（Base64 编码开销）
- 特点：完整数据，可持久化

## 性能影响

### 编码性能

| 文件大小 | 编码时间（估计） |
|---------|----------------|
| 5 MB    | ~0.5 秒        |
| 10 MB   | ~1 秒          |
| 20 MB   | ~2 秒          |
| 50 MB   | ~5 秒          |

### localStorage 限制

- 浏览器通常限制 5-10 MB
- Base64 后的数据会更大
- 建议单个视频不超过 50MB（编码后 ~66MB）
- localStorage 可能达到上限，需要注意错误处理

## 使用建议

### 适合的场景
✅ 短视频片段（< 50MB）  
✅ 工作流中的视频素材  
✅ 需要保存和分享的项目  

### 不适合的场景
❌ 大型视频文件（> 50MB）  
❌ 长视频（> 5 分钟）  
❌ 高分辨率源文件  

### 最佳实践
1. **压缩视频** - 使用 H.264 编码，适当降低码率
2. **合理裁剪** - 只保留需要的片段
3. **降低分辨率** - 720p 通常足够预览使用
4. **提供提示** - 告知用户文件大小限制

## 后续优化方向

### 1. IndexedDB 存储（大文件）
```typescript
// 将视频存储到 IndexedDB
const db = await openDB('svanimation-videos');
await db.put('videos', file, videoId);

// 配置只存储 ID
config.videoId = videoId;
```

**优点：**
- 支持大文件（GB 级别）
- 不占用 localStorage 空间
- 更好的性能

**缺点：**
- 实现更复杂
- 需要清理机制

### 2. 混合策略
```typescript
if (file.size < 10 * 1024 * 1024) {
  // 小文件：使用 Base64
  useBase64Storage(file);
} else {
  // 大文件：使用 IndexedDB
  useIndexedDBStorage(file);
}
```

### 3. 视频压缩
```typescript
// 使用 ffmpeg.wasm 在浏览器中压缩
import { FFmpeg } from '@ffmpeg/ffmpeg';
const compressedFile = await compressVideo(file);
```

## 修改文件清单

### KanbanConfigEditor.tsx
- ✅ 移除 Blob URL 相关代码
- ✅ 使用 FileReader.readAsDataURL
- ✅ 添加文件大小限制（50MB）
- ✅ 添加上传状态管理
- ✅ 保存文件大小信息
- ✅ 显示文件信息（时长、大小）

### workflow.ts
- ✅ 添加 `videoSize` 字段到 `KanbanConfig`

## 测试验证

### 测试步骤
1. ✅ 上传小视频（< 10MB）
2. ✅ 预览正常播放
3. ✅ 退出编辑器
4. ✅ 在工作流预览中播放（UnifiedPlayer）
5. ✅ 再次进入编辑器，视频仍然可以播放
6. ✅ 刷新页面，视频数据保留
7. ✅ 测试 50MB 限制
8. ✅ 测试上传中状态显示

### 预期结果
- 视频在所有场景下都能正常播放
- 数据在 localStorage 中持久化
- 文件大小和时长正确显示
- 超大文件被拒绝

## 性能监控

### localStorage 使用率
```typescript
// 检查 localStorage 使用情况
const usedSpace = JSON.stringify(localStorage).length;
const maxSpace = 10 * 1024 * 1024; // 10MB 估计值
const usagePercent = (usedSpace / maxSpace) * 100;

console.log(`localStorage 使用率: ${usagePercent.toFixed(1)}%`);
```

### 建议告警阈值
- < 50%: 正常 ✅
- 50-80%: 警告 ⚠️
- > 80%: 危险 ❌

## 相关资源

- [FileReader API](https://developer.mozilla.org/en-US/docs/Web/API/FileReader)
- [Data URLs](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/Data_URLs)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [localStorage Limits](https://web.dev/storage-for-the-web/)

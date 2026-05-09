# SVAnimation 数据持久化说明

## 概述

SVAnimation 使用 **localStorage + IndexedDB** 双重存储策略，确保所有工作内容在刷新或关闭浏览器后依然保留。

## ✅ 已实现的持久化

### 1. 工作流数据（localStorage）

#### 存储内容
- ✅ 所有工作流列表
- ✅ 工作流名称和 ID
- ✅ 工作流节点配置
- ✅ 节点顺序和启用状态
- ✅ 当前选中的工作流

#### 存储位置
```
localStorage
├── svanimation-workflows        # 工作流数据
└── svanimation-current-workflow # 当前工作流 ID
```

#### 数据格式
```json
{
  "svanimation-workflows": [
    {
      "id": "workflow-1715234567890-abc123",
      "name": "我的视频项目",
      "nodes": [
        {
          "id": "node-1715234567891-def456",
          "type": "kanban",
          "name": "字幕视频",
          "order": 0,
          "enabled": true,
          "config": { /* 节点配置 */ },
          "createdAt": 1715234567890,
          "updatedAt": 1715234567900
        }
      ],
      "createdAt": 1715234567890,
      "updatedAt": 1715234567900
    }
  ]
}
```

### 2. 看板模块配置（localStorage）

#### 存储内容
- ✅ 视频 ID（引用 IndexedDB）
- ✅ 视频文件名
- ✅ 视频时长和大小
- ✅ 分辨率设置
- ✅ **所有字幕数据**
  - 文本内容
  - 时间点（进入/退出）
  - 样式（字体、颜色、位置）
  - 进入动画
  - 缩放配置
  - **切换列表**（所有切换文字和时间）

#### 数据示例
```json
{
  "videoId": "video-1715234567890-abc123",
  "videoFileName": "demo.mp4",
  "videoDuration": 10.5,
  "videoSize": 5242880,
  "resolution": {
    "id": "720p",
    "width": 1280,
    "height": 720,
    "label": "1280 x 720 (HD)"
  },
  "subtitles": [
    {
      "id": "subtitle-1715234567890",
      "text": "欢迎",
      "enterTime": 2.0,
      "exitTime": 5.0,
      "fontSize": 48,
      "color": "#FFFFFF",
      "position": { "x": 100, "y": 100 },
      "animation": "slam-bounce",
      "scale": {
        "enabled": true,
        "fontSize": 72,
        "position": { "x": 640, "y": 360 },
        "delay": 1.0
      },
      "switch": {
        "enabled": true,
        "items": [
          {
            "id": "switch-1715234567891",
            "text": "开始",
            "time": 3.0
          },
          {
            "id": "switch-1715234567892",
            "text": "继续",
            "time": 4.0
          }
        ]
      }
    }
  ]
}
```

### 3. 视频文件（IndexedDB）

#### 存储内容
- ✅ 视频文件（Blob 对象）
- ✅ 文件元数据（名称、大小、时长）
- ✅ 上传时间戳

#### 存储位置
```
IndexedDB
└── svanimation-videos
    └── videos (ObjectStore)
        ├── video-1715234567890-abc123
        ├── video-1715234567891-def456
        └── ...
```

#### 数据格式
```typescript
{
  id: "video-1715234567890-abc123",
  file: Blob(5242880),           // 原始视频文件
  fileName: "demo.mp4",
  fileSize: 5242880,             // 字节
  duration: 10.5,                // 秒
  uploadedAt: 1715234567890      // 时间戳
}
```

## 🔄 自动持久化流程

### 启动时加载
```typescript
1. 应用启动
   ↓
2. WorkflowContext 初始化
   ↓
3. 从 localStorage 加载工作流数据
   ↓
4. 恢复当前工作流
   ↓
5. 渲染界面
```

### 数据变化时保存
```typescript
1. 用户修改数据
   ↓
2. onChange/onUpdate 回调
   ↓
3. 更新 Context 状态
   ↓
4. useEffect 监听状态变化
   ↓
5. 自动保存到 localStorage
```

### 视频上传时保存
```typescript
1. 用户上传视频
   ↓
2. saveVideo(file, name, duration)
   ↓
3. 保存到 IndexedDB
   ↓
4. 返回 videoId
   ↓
5. videoId 保存到 config
   ↓
6. config 保存到 localStorage
```

## 💾 存储容量

### localStorage
- **容量**: 通常 5-10 MB
- **用途**: 轻量级配置数据
- **限制**: 仅字符串，需要 JSON 序列化

**当前使用：**
```
工作流配置: ~KB 级别
每条字幕: ~1 KB
每个切换项: ~100 B
```

### IndexedDB
- **容量**: 通常是可用磁盘空间的 50-60%
- **用途**: 大文件（视频）
- **限制**: 异步操作

**当前使用：**
```
每个视频: 实际文件大小（可达 GB 级别）
```

## 🧪 测试持久化

### 方法 1: 浏览器开发者工具

**Chrome DevTools:**
```
1. F12 打开开发者工具
2. Application 标签
3. Storage:
   - Local Storage → 查看 localStorage
   - IndexedDB → 查看 svanimation-videos
```

**查看数据：**
```javascript
// Console 中执行
// 查看工作流
console.log(JSON.parse(localStorage.getItem('svanimation-workflows')));

// 查看当前工作流
console.log(localStorage.getItem('svanimation-current-workflow'));

// 查看存储大小
const estimate = await navigator.storage.estimate();
console.log(`已使用: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
console.log(`配额: ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
```

### 方法 2: 手动测试流程

```
1. 创建工作流
   ✓ 添加节点
   ✓ 上传视频
   ✓ 添加字幕
   ✓ 配置切换

2. 刷新页面 (F5)
   ✓ 验证工作流仍存在
   ✓ 验证视频可播放
   ✓ 验证字幕完整保留

3. 关闭浏览器
   ✓ 完全退出浏览器

4. 重新打开
   ✓ 访问应用 URL
   ✓ 验证所有数据恢复
```

### 方法 3: 使用测试页面

访问测试页面（浏览器中打开）：
```
file:///tmp/test-persistence.html
```

点击按钮查看：
- localStorage 数据
- IndexedDB 视频列表
- 存储配额使用情况

## 🔍 数据查看工具

### 导出数据

```javascript
// Console 中执行
function exportData() {
  const data = {
    workflows: localStorage.getItem('svanimation-workflows'),
    currentWorkflow: localStorage.getItem('svanimation-current-workflow'),
    timestamp: new Date().toISOString()
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `svanimation-backup-${Date.now()}.json`;
  a.click();
}

exportData();
```

### 导入数据

```javascript
// Console 中执行
function importData(jsonString) {
  const data = JSON.parse(jsonString);
  
  if (data.workflows) {
    localStorage.setItem('svanimation-workflows', data.workflows);
  }
  
  if (data.currentWorkflow) {
    localStorage.setItem('svanimation-current-workflow', data.currentWorkflow);
  }
  
  alert('数据已导入，请刷新页面');
}

// 使用方法：
// 1. 读取 JSON 文件内容
// 2. importData(jsonContent);
```

### 清空数据

```javascript
// Console 中执行 - 小心使用！
function clearAllData() {
  if (confirm('确定要清空所有数据吗？此操作不可恢复！')) {
    // 清空 localStorage
    localStorage.removeItem('svanimation-workflows');
    localStorage.removeItem('svanimation-current-workflow');
    
    // 清空 IndexedDB
    indexedDB.deleteDatabase('svanimation-videos');
    
    alert('数据已清空，请刷新页面');
  }
}

clearAllData();
```

## 🛡️ 数据安全

### 自动保存
- ✅ 每次修改自动保存
- ✅ 无需手动保存操作
- ✅ 防止意外丢失

### 数据隔离
- ✅ 不同域名数据独立
- ✅ 不会跨站访问
- ✅ 浏览器级别保护

### 备份建议
- 💡 定期导出工作流数据
- 💡 重要项目单独备份
- 💡 清除浏览器数据前先备份

## ⚠️ 注意事项

### localStorage 限制
```
❌ 清除浏览器数据会丢失
❌ 隐私模式可能不持久化
❌ 不同浏览器数据不共享
```

### IndexedDB 限制
```
❌ 空间不足时可能保存失败
❌ 某些浏览器可能限制大小
❌ 需要异步加载（有延迟）
```

### 最佳实践
```
✅ 避免存储过大的工作流（推荐 < 100 个节点）
✅ 定期清理不用的视频
✅ 重要数据导出备份
✅ 测试环境使用隐私模式
```

## 🔧 故障排除

### 问题: 刷新后数据丢失

**检查：**
```javascript
// 1. 检查是否在隐私模式
console.log(navigator.storage.persisted());

// 2. 检查 localStorage 是否可用
try {
  localStorage.setItem('test', 'test');
  localStorage.removeItem('test');
  console.log('localStorage 可用');
} catch (e) {
  console.error('localStorage 不可用:', e);
}

// 3. 检查数据是否存在
console.log(localStorage.getItem('svanimation-workflows'));
```

**解决方法：**
1. 退出隐私/无痕模式
2. 检查浏览器设置（允许存储）
3. 清除缓存后重试

### 问题: 视频无法播放

**检查：**
```javascript
// 在 Console 中
const db = await new Promise((resolve) => {
  const req = indexedDB.open('svanimation-videos', 1);
  req.onsuccess = () => resolve(req.result);
});

const tx = db.transaction(['videos'], 'readonly');
const store = tx.objectStore('videos');
const allKeys = await new Promise((resolve) => {
  const req = store.getAllKeys();
  req.onsuccess = () => resolve(req.result);
});

console.log('视频数量:', allKeys.length);
console.log('视频 IDs:', allKeys);
```

**解决方法：**
1. 检查 videoId 是否正确
2. 重新上传视频
3. 检查存储配额

### 问题: 存储空间不足

**检查配额：**
```javascript
const estimate = await navigator.storage.estimate();
const percentUsed = (estimate.usage / estimate.quota) * 100;

console.log(`使用: ${percentUsed.toFixed(1)}%`);
console.log(`可用: ${(estimate.quota - estimate.usage) / 1024 / 1024} MB`);
```

**解决方法：**
1. 删除不用的工作流
2. 删除不用的视频
3. 使用较小的视频文件

## 📊 存储统计

### 查看详细统计

```javascript
async function getStorageStats() {
  // localStorage 大小
  const workflows = localStorage.getItem('svanimation-workflows');
  const localStorageSize = workflows ? new Blob([workflows]).size : 0;
  
  // IndexedDB 统计
  const db = await new Promise((resolve) => {
    const req = indexedDB.open('svanimation-videos', 1);
    req.onsuccess = () => resolve(req.result);
  });
  
  const tx = db.transaction(['videos'], 'readonly');
  const store = tx.objectStore('videos');
  const all = await new Promise((resolve) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
  });
  
  const indexedDBSize = all.reduce((sum, v) => sum + v.fileSize, 0);
  
  return {
    localStorage: {
      size: localStorageSize,
      sizeMB: (localStorageSize / 1024 / 1024).toFixed(2),
      workflows: all.length
    },
    indexedDB: {
      size: indexedDBSize,
      sizeMB: (indexedDBSize / 1024 / 1024).toFixed(2),
      videos: all.length
    },
    total: {
      size: localStorageSize + indexedDBSize,
      sizeMB: ((localStorageSize + indexedDBSize) / 1024 / 1024).toFixed(2)
    }
  };
}

// 使用
getStorageStats().then(console.log);
```

## 🚀 未来改进

### 短期
- [ ] 添加数据导出/导入 UI
- [ ] 显示存储使用情况
- [ ] 自动清理功能

### 中期
- [ ] 云端同步（可选）
- [ ] 多设备共享
- [ ] 版本历史

### 长期
- [ ] 协作编辑
- [ ] 实时同步
- [ ] 冲突解决

## 📚 相关文档

- [IndexedDB 实现](kanban-indexeddb-implementation.md)
- [工作流编辑器](workflow-editor.md)
- [看板模块](kanban-module.md)

## 总结

✅ **数据持久化已完整实现**
- 工作流配置自动保存
- 视频文件安全存储
- 刷新/关闭后数据保留
- 支持大文件（GB 级别）

你可以放心使用，所有工作内容都会自动保存！

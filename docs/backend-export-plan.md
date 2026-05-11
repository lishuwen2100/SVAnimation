# 后端视频导出解决方案实施计划

> 本文档为后端 API 导出方案的详细实施计划
> 
> 创建时间：2026-05-11
> 状态：待实施

## Context

CLI 导出功能已经实现并验证通过（除了 macOS < 15 的音频合成问题），现在需要构建后端 API 导出方案，提供更好的用户体验。

**当前状况：**
- ✅ CLI 导出已实现（手动下载文件 → 执行命令）
- ✅ 渲染流程验证成功（5260 帧全部完成）
- ✅ 前端 UI 和导出对话框完整
- ❌ 用户体验差：需要手动下载、放置文件、执行命令
- ❌ 无实时进度反馈
- ❌ 无并发支持

**目标：**
- 实现后端 API，自动处理视频上传和渲染
- 提供实时渲染进度反馈
- 一键导出，无需手动操作
- 保留现有 CLI 导出作为备选方案
- 架构可扩展，后期可升级为任务队列

**用户选择：**
- 架构：混合方案（先同步，预留升级接口）
- 部署：本地开发模式
- 上传：直接上传（<500MB）

## 技术方案

### 后端架构

**技术栈：**
- Express.js 4.x - Web 框架
- @remotion/renderer 4.0.459 - 视频渲染引擎
- Multer - 文件上传中间件
- UUID - 任务 ID 生成
- Pino - 日志记录

**目录结构：**
```
server/
├── src/
│   ├── index.ts              # 服务器入口
│   ├── routes/
│   │   └── render.ts         # 渲染 API 路由
│   ├── services/
│   │   ├── renderService.ts  # 渲染业务逻辑
│   │   └── storageService.ts # 文件存储管理
│   ├── types/
│   │   └── backend.ts        # 后端类型定义
│   └── utils/
│       └── logger.ts         # 日志工具
├── temp/                     # 临时文件目录（gitignore）
├── tsconfig.json
└── package.json
```

### 数据流程

```
前端（ExportDialog）
    ↓ [1] 上传工作流 + 视频文件
后端 API (/api/render/submit)
    ↓ [2] 保存到临时目录
后端 renderService
    ↓ [3] 调用 @remotion/renderer
Remotion 渲染引擎
    ↓ [4] 生成 MP4
后端 API (/api/render/{jobId}/download)
    ↓ [5] 返回视频文件
前端下载视频
```

## 实施计划

### 阶段一：后端基础设施

#### 1. 创建 server 目录和配置

**文件：** `server/package.json`

**依赖包：**
- @remotion/renderer: ^4.0.459
- @remotion/bundler: ^4.0.459
- express: ^4.18.2
- multer: ^1.4.5-lts.1
- uuid: ^9.0.1
- cors: ^2.8.5
- pino: ^8.16.0
- pino-pretty: ^10.2.0

**开发依赖：**
- @types/express, @types/multer, @types/node, @types/cors
- ts-node: ^10.9.1
- typescript: ^5.3.0

#### 2. 创建服务器入口文件

**文件：** `server/src/index.ts`

**功能：**
- Express 应用初始化
- CORS 配置（允许 http://localhost:5173）
- 路由注册
- 健康检查端点
- 端口：3001

#### 3. 创建日志工具

**文件：** `server/src/utils/logger.ts`

**功能：**
- 使用 Pino 日志库
- 彩色输出
- 格式化时间戳

### 阶段二：渲染服务核心

#### 4. 创建后端类型定义

**文件：** `server/src/types/backend.ts`

**类型：**
- RenderJobRequest - 渲染任务请求
- RenderJobResponse - 渲染任务响应
- RenderProgress - 渲染进度
- TempFiles - 临时文件路径

#### 5. 创建存储服务

**文件：** `server/src/services/storageService.ts`

**功能：**
- 初始化临时目录
- 创建任务工作目录
- 保存上传的视频文件
- 清理任务目录
- 获取输出文件路径

**目录结构：**
```
temp/
└── {jobId}/
    ├── videos/
    │   └── video-xxx.mp4
    └── output.mp4
```

#### 6. 创建渲染服务

**文件：** `server/src/services/renderService.ts`

**功能：**
- Bundle Remotion 项目
- 配置 Webpack 路径别名
- 调用 renderMedia API
- 实时进度更新
- 错误处理

**关键方法：**
- renderVideo() - 执行渲染
- updateProgress() - 更新进度
- getProgress() - 获取进度

### 阶段三：API 路由

#### 7. 创建渲染路由

**文件：** `server/src/routes/render.ts`

**端点：**

1. **POST /api/render/submit**
   - 上传工作流 + 视频文件
   - 同步渲染
   - 返回 jobId 和下载链接

2. **GET /api/render/:jobId/progress**
   - 获取渲染进度
   - 返回状态和百分比

3. **GET /api/render/:jobId/download**
   - 下载渲染完成的视频
   - 自动清理临时文件

**文件处理：**
- 使用 Multer 中间件
- 文件大小限制：500MB
- 文件命名格式：`videoId---filename.mp4`

### 阶段四：前端集成

#### 8. 修改 ExportDialog 组件

**文件：** `src/components/ExportDialog.tsx`

**新增功能：**
- 导出模式选择（CLI / 后端）
- 后端导出处理函数
- 上传进度显示
- 渲染进度显示

**UI 改动：**
- 添加模式切换按钮
- 添加上传状态提示
- 添加渲染状态提示
- 保留 CLI 导出流程

**API 调用：**
```typescript
POST http://localhost:3001/api/render/submit
- FormData: workflow + options + videos
- 返回：{ jobId, downloadUrl }
```

#### 9. 更新根 package.json

**文件：** `package.json`

**新增脚本：**
- `server` - 启动后端服务器
- `dev:all` - 并发启动前后端

**新增依赖：**
- concurrently: ^8.2.2

### 阶段五：测试和优化

#### 10. 创建 .gitignore 更新

**忽略目录：**
- server/temp/
- server/dist/
- server/node_modules/
- temp/
- uploads/

#### 11. 创建 README

**文件：** `server/README.md`

**内容：**
- 快速开始指南
- API 文档
- 验证计划
- 关键文件说明
- 后续升级路径
- 注意事项

## 验证计划

### 单元测试
1. 测试存储服务创建目录
2. 测试视频文件保存
3. 测试清理功能

### 集成测试
1. **上传测试**：
   - 启动后端：`cd server && npm run dev`
   - 使用 Postman 提交 render job
   - 验证文件保存到 temp 目录

2. **渲染测试**：
   - 提交包含字幕的简单工作流
   - 观察控制台日志
   - 确认 output.mp4 生成

3. **下载测试**：
   - 访问 `/api/render/{jobId}/download`
   - 验证视频可播放
   - 确认临时文件被清理

4. **端到端测试**：
   - 启动前后端：`npm run dev:all`
   - 在浏览器中创建工作流
   - 点击"后端导出"
   - 验证完整流程

### 性能测试
- 测试 1 分钟视频渲染时间
- 测试 5 分钟视频渲染时间
- 监控内存使用
- 验证文件清理

## 关键文件

**后端新增：**
- `server/src/index.ts` - 服务器入口
- `server/src/routes/render.ts` - 渲染 API
- `server/src/services/renderService.ts` - 渲染逻辑
- `server/src/services/storageService.ts` - 存储管理
- `server/src/types/backend.ts` - 类型定义
- `server/src/utils/logger.ts` - 日志工具
- `server/package.json` - 后端依赖
- `server/tsconfig.json` - TypeScript 配置
- `server/README.md` - 后端文档

**前端修改：**
- `src/components/ExportDialog.tsx` - 添加后端导出
- `package.json` - 添加并发脚本

**共享文件（复用）：**
- `src/render/RenderEntry.tsx` - Remotion 入口
- `src/utils/exportHelpers.ts` - 导出工具
- `remotion.config.ts` - Remotion 配置

## 后续升级路径

### Phase 2: 异步任务队列
- 安装 Bull + Redis
- 实现任务队列
- 添加进度轮询 WebSocket

### Phase 3: 生产就绪
- 环境变量配置
- 错误处理和重试
- 日志持久化
- 监控和告警

### Phase 4: Docker 化
- 创建 Dockerfile
- docker-compose 编排
- 一键部署

## 注意事项

1. **macOS 兼容性**：
   - 后端渲染同样受 macOS < 15 限制
   - 需要在 renderMedia 中设置 `muted: true`

2. **内存管理**：
   - 长视频可能消耗大量内存
   - 建议设置：`NODE_OPTIONS=--max-old-space-size=4096`

3. **并发限制**：
   - 当前同步方案一次只能处理一个任务
   - 升级为队列后可支持并发

4. **文件清理**：
   - 当前在下载后 5 秒清理
   - 生产环境建议定时任务清理

5. **安全性**：
   - 本地开发模式，无身份验证
   - 生产环境需添加认证和授权

## 预期成果

完成后将实现：
- ✅ 一键后端导出功能
- ✅ 实时渲染进度反馈
- ✅ 自动文件管理
- ✅ CLI 和后端双模式支持
- ✅ 可扩展的架构设计

用户体验提升：
- 无需手动下载视频文件
- 无需手动执行命令
- 实时查看渲染进度
- 自动清理临时文件
- 更好的错误提示

## 参考文档

- [CLI 导出实现](export-guide.md)
- [macOS 兼容性说明](macos-compatibility.md)
- [Remotion Renderer API](https://www.remotion.dev/docs/renderer)
- [Express.js 文档](https://expressjs.com/)

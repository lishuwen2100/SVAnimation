# SVAnimation 工作流编辑器改造任务清单

## Phase 1: 基础架构 ✅

**目标**：建立工作流数据结构和状态管理

- [x] 1. 创建类型定义 (`/src/types/workflow.ts`)
- [x] 2. 实现模块注册系统 (`/src/registry/moduleRegistry.ts`)
- [x] 3. 创建 WorkflowContext (`/src/contexts/WorkflowContext.tsx`)
- [x] 4. 实现 localStorage 持久化逻辑
- [x] 5. 添加 Context Provider 到 App.tsx

**验证点**：
- 可创建/删除工作流
- 可添加/删除节点
- 数据持久化到 localStorage

---

## Phase 2: 拆分 DuckSubtitle ✅

**目标**：将 DuckSubtitle 改造为可复用的工作流节点

- [x] 6. 创建 `/src/modules/DuckSubtitle/` 目录结构
- [x] 7. 提取 `DuckSubtitleComposition.tsx`（包含 SubtitleComposition 及依赖函数）
- [x] 7.1. 提取 `utils.ts`（共享工具函数和常量）
- [x] 8. 改造 `DuckSubtitleConfigEditor.tsx`（状态管理改为 props 驱动）
- [x] 9. 创建 `/src/registry/modules/duckSubtitle.tsx` 注册文件
- [x] 10. 保留原有 `/src/modules/DuckSubtitle.tsx` 作为向后兼容入口
- [x] 10.1. 创建 `/src/registry/index.ts` 模块初始化文件

**验证点**：
- 单模块模式仍可正常使用
- ConfigEditor 可通过 props 控制状态
- Composition 可独立渲染

---

## Phase 3: 工作流编辑器 UI ✅

**目标**：实现节点列表和配置界面

- [x] 11. 创建 `WorkflowList.tsx`（工作流列表页）
- [x] 12. 创建 `WorkflowEditor.tsx`（工作流编辑主界面）
- [x] 13. NodeCard.tsx 已包含在 WorkflowEditor 中
- [x] 14. 创建 `NodeCard.tsx`（单个节点卡片组件）
- [x] 15. 配置模态框已集成在 WorkflowEditor 中
- [x] 16. 集成到 App.tsx 主导航
- [ ] 16.1. 实现拖拽排序（后续优化）

**验证点**：
- 可添加/删除/重命名节点
- 可拖拽排序
- 点击节点弹出配置界面
- 配置修改实时保存

---

## Phase 4: 统一播放器

**目标**：实现 Series 集成和连续播放

- [ ] 17. 创建 `UnifiedPlayer.tsx`（Series 集成）
- [ ] 18. 实现 `UnifiedComposition`（顶层 Composition）
- [ ] 19. 创建 `Timeline.tsx`（时间轴组件 + 节点边界显示）
- [ ] 20. 实现节点跳转功能（控制 Player currentFrame）
- [ ] 21. 实现时长计算逻辑

**验证点**：
- 多个节点顺序播放
- 时间轴正确显示各节点位置
- 点击时间轴可跳转
- 总时长计算正确

---

## Phase 5: 导航集成

**目标**：将工作流编辑器集成到 App 导航

- [ ] 22. 修改 `App.tsx` 添加新视图状态
- [ ] 23. 在主页添加"工作流编辑器"入口卡片
- [ ] 24. 实现视图切换逻辑
- [ ] 25. 保留单模块入口（向后兼容）

**验证点**：
- 主页 → 工作流列表 → 编辑器 → 播放器 导航流畅
- 单模块入口仍可用
- 返回按钮正确

---

## Phase 6: 优化和扩展（可选）

- [ ] 26. 添加节点启用/禁用开关
- [ ] 27. 添加工作流导入/导出（JSON）
- [ ] 28. 实现导出视频功能（Remotion render API）
- [ ] 29. 优化大文件处理（IndexedDB 替代 localStorage）
- [ ] 30. 添加节点预览缩略图

---

## 测试清单

### 工作流管理
- [ ] 创建新工作流
- [ ] 重命名工作流
- [ ] 删除工作流
- [ ] 切换工作流
- [ ] 刷新页面后数据恢复

### 节点操作
- [ ] 添加倒鸭子节点
- [ ] 删除节点
- [ ] 拖拽排序节点
- [ ] 启用/禁用节点
- [ ] 编辑节点名称

### 配置编辑
- [ ] 进入节点配置界面
- [ ] 导入 SRT 文件
- [ ] 导入 MP3 文件
- [ ] 修改字幕样式
- [ ] 框选中心区域
- [ ] 选择字幕位置
- [ ] 配置保存正确

### 统一播放器
- [ ] 连续播放多个节点
- [ ] 时间轴显示正确
- [ ] 点击时间轴跳转
- [ ] 总时长计算正确
- [ ] 节点边界清晰

### 向后兼容
- [ ] 单模块入口正常
- [ ] 倒鸭子功能完整
- [ ] 样式一致

### 边界情况
- [ ] 空工作流播放
- [ ] 单节点工作流
- [ ] 所有节点禁用
- [ ] 超长 SRT 处理
- [ ] 超长工作流（10+ 节点）

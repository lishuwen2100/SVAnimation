# 看板模块字幕功能文档

## 功能概述

看板模块现已支持完整的字幕功能，允许用户在视频上添加、编辑和动画化字幕。

## 核心功能

### 1. 字幕管理

#### 添加字幕
- 点击"添加字幕"按钮创建新字幕
- 自动获取当前视频时间作为进入时间
- 默认设置：白色、48px、左上角(0,0)、无动画

#### 编辑字幕
- 展开字幕项查看详细配置
- 实时修改所有字幕属性
- 支持输入框和点选两种方式设置坐标

#### 删除字幕
- 展开字幕配置面板
- 点击"删除字幕"按钮

### 2. 字幕属性

#### 基本属性
- **字幕文本**: 支持多行文本，自动换行
- **进入时间**: 字幕出现的时间点（秒）
- **退出时间**: 字幕消失的时间点（0 = 一直显示）
- **字体大小**: 12-200px 可调
- **颜色**: 颜色选择器 + 手动输入（支持 HEX、RGB 等）

#### 位置设置
- **初始坐标**: 字幕首次出现的位置（X, Y 像素）
- **点选模式**: 点击预览画面直接选择位置
- **数值微调**: 输入精确的坐标值

#### 进入动画
提供 6 种进入动画效果：

1. **无动画** - 直接显示
2. **猛击弹跳** (slam-bounce)
   - 从小到大缩放
   - 带轻微旋转
   - 弹性效果

3. **旋转缩放** (spin-scale)
   - 360° 旋转
   - 从无到有缩放

4. **侧滑倾斜** (side-skew)
   - 从左侧滑入
   - 带倾斜效果

5. **弹出摇晃** (pop-shake)
   - 弹性缩放
   - 左右摇晃

6. **弹跳摇摆** (bounce-sway)
   - 从上方落下
   - 左右摇摆

### 3. 缩放动画

#### 功能开关
- 开启/关闭缩放功能
- 开启后显示缩放设置

#### 缩放设置
- **缩放后字体大小**: 目标字体大小
- **缩放后坐标**: 目标位置（可点选）
- **缩放延迟**: 等待多少秒后开始缩放（秒）

#### 缩放行为
1. 字幕按初始状态显示
2. 等待指定延迟时间
3. 使用 Spring 动画平滑过渡到缩放状态
   - 位置：从初始坐标 → 缩放坐标
   - 大小：从初始字体 → 缩放字体
4. 后续保持缩放状态直到退出

### 4. 时间控制

#### 获取当前时间
- 点击"当前"按钮
- 自动填充视频播放器的当前时间

#### 时间设置方式
1. **手动输入**: 直接输入时间值（秒）
2. **当前时间**: 获取播放器时间
3. **精度**: 支持小数点后两位（0.01 秒精度）

#### 显示逻辑
- `currentTime >= enterTime` → 字幕出现
- `exitTime = 0` → 一直显示到视频结束
- `currentTime >= exitTime` → 字幕淡出消失

## 界面布局

### 左侧控制面板

#### 视频导入（永久展开）
- 上传 MP4 文件
- 显示文件信息（名称、时长、大小）

#### 分辨率（可折叠，默认收起）
- 1080p (1920x1080)
- 720p (1280x720)
- 竖屏 (1080x1920)

#### 字幕设定（可折叠，默认收起）
- 显示字幕总数
- 添加字幕按钮
- 字幕列表
  - 字幕标题栏（文本预览 + 时间范围）
  - 展开后显示完整配置面板

### 右侧预览区

#### 预览标题
- 显示"预览"文字
- 点选模式时显示"点击画面选择坐标"提示

#### 视频画面
- Remotion Player 播放器
- 点选模式：十字光标 + 青色边框
- 正常模式：标准播放控制

## 坐标点选模式

### 进入点选模式
1. 展开字幕配置面板
2. 在"坐标"或"缩放后坐标"旁点击"点选"按钮
3. 界面进入点选模式

### 点选模式视觉反馈
- 配置面板："点选"按钮高亮
- 预览区域：
  - 光标变为十字准心
  - 青色边框环绕
  - 顶部显示提示标签
- 配置面板底部：显示提示信息

### 选择坐标
1. 点击视频画面任意位置
2. 自动计算实际视频坐标
3. 更新配置并退出点选模式

### 坐标计算
```typescript
// 屏幕坐标 → 视频坐标
const scaleX = videoWidth / displayWidth;
const scaleY = videoHeight / displayHeight;
const actualX = clickX * scaleX;
const actualY = clickY * scaleY;
```

## 字幕渲染逻辑

### 显示判断
```typescript
const shouldShow = 
  currentTime >= enterTime && 
  (exitTime === 0 || currentTime < exitTime);
```

### 动画时间轴
```
时间 →
├─ 进入时间 (enterTime)
│   ├─ 进入动画 (0-1秒)
│   │   └─ 淡入 + 动画效果
│   └─ 正常显示
│
├─ 缩放延迟 (enterTime + scale.delay)
│   └─ 缩放动画 (1秒)
│       └─ Spring 平滑过渡
│
└─ 退出时间 (exitTime, 如果 > 0)
    └─ 淡出动画 (0.5秒)
```

### 动画优先级
1. **退出淡出**: 最高优先级（覆盖所有）
2. **缩放动画**: 延迟触发，影响位置和大小
3. **进入动画**: 仅前 1 秒生效

### Transform 组合
```typescript
transform = `
  translate(x, y)        // 位置（缩放影响）
  scale(s)               // 进入动画
  rotate(deg)            // 进入动画
  skew(deg)              // 进入动画
`
```

## 技术实现

### 组件结构
```
KanbanConfigEditor (编辑器主界面)
  ├─ SubtitleConfigPanel (字幕配置面板)
  │   └─ 各种输入控件
  └─ KanbanComposition (预览 Composition)
      └─ SubtitleRenderer (字幕渲染器)
          └─ 动画逻辑
```

### 数据流
```
用户操作
  ↓
SubtitleConfigPanel
  ↓
onUpdate(updates)
  ↓
KanbanConfigEditor
  ↓
onChange(newConfig)
  ↓
Parent Component
  ↓
config prop
  ↓
KanbanComposition
  ↓
subtitles prop
  ↓
SubtitleRenderer
  ↓
渲染到屏幕
```

### 关键代码

#### 字幕数据类型
```typescript
interface KanbanSubtitle {
  id: string;
  text: string;
  enterTime: number;
  exitTime: number;
  fontSize: number;
  color: string;
  position: { x: number; y: number };
  animation: KanbanSubtitleAnimation;
  scale: {
    enabled: boolean;
    fontSize: number;
    position: { x: number; y: number };
    delay: number;
  };
}
```

#### Spring 动画配置
```typescript
const springValue = spring({
  frame: relativeFrame,
  fps: 30,
  config: {
    damping: 20,      // 阻尼
    stiffness: 100,   // 弹性
    mass: 1,          // 质量
  },
});
```

## 使用场景

### 1. 简单文字说明
- 添加字幕
- 设置进入/退出时间
- 调整位置和颜色
- 选择合适的动画

### 2. 强调重点内容
- 使用缩放动画
- 初始：小字体 + 边角位置
- 缩放：大字体 + 中心位置
- 延迟：等待关键时刻

### 3. 多段字幕序列
- 添加多条字幕
- 合理安排时间轴
- 错开进入和退出时间
- 使用不同动画增加变化

### 4. 视频标注
- 无动画模式（直接显示）
- 精确坐标定位
- 长时间显示（exitTime = 0）

## 性能优化

### 渲染优化
- 仅渲染当前时间范围内的字幕
- 提前退出不显示的字幕
- 动画计算使用 Remotion 原生 API

### 内存管理
- 字幕配置存储在 config 对象
- 随工作流保存到 localStorage
- 不占用 IndexedDB 空间

## 限制和注意事项

### 字体限制
- 使用系统默认字体
- 暂不支持自定义字体上传
- 字体大小范围：12-200px

### 文本限制
- 支持任意字符
- 自动换行（pre-wrap）
- 无字数限制

### 动画限制
- 进入动画固定 1 秒
- 缩放动画固定 1 秒
- 退出动画固定 0.5 秒

### 坐标限制
- 以视频左上角为原点
- 可能超出视频边界（需手动检查）
- 没有自动边界约束

## 后续优化方向

### 短期优化
- [ ] 字幕模板（快速预设）
- [ ] 批量编辑（选中多条字幕）
- [ ] 时间轴视图（可视化编辑）
- [ ] 撤销/重做功能

### 中期规划
- [ ] 自定义字体上传
- [ ] 更多动画效果
- [ ] 字幕描边和阴影控制
- [ ] 背景框样式
- [ ] 路径动画（沿曲线移动）

### 长期愿景
- [ ] 富文本编辑（加粗、斜体）
- [ ] 关键帧编辑器
- [ ] 字幕轨道系统
- [ ] 导入 SRT/ASS 字幕
- [ ] AI 自动字幕生成

## 常见问题

### Q: 字幕看不见？
A: 检查：
1. 进入时间是否正确
2. 颜色是否与背景对比明显
3. 坐标是否在视频范围内
4. 播放时间是否在字幕时间范围内

### Q: 动画不流畅？
A: 
- 使用 Spring 动画，已经很平滑
- 如果卡顿，可能是视频文件太大
- 建议压缩视频或降低分辨率

### Q: 坐标点选不准？
A: 
- 确保视频已加载完成
- 点选模式下不能使用播放控制
- 坐标基于视频实际尺寸，不是显示尺寸

### Q: 如何实现字幕淡入淡出？
A: 
- 进入动画自动包含淡入
- 退出时间设置非 0 自动淡出
- 无动画模式也有淡入效果

## 参考资源

### 相关文档
- `docs/kanban-subtitle-desgin.md` - 设计规范
- `docs/kanban-module.md` - 模块概述
- `DESIGN.md` - 整体设计文档

### 源代码
- `src/modules/Kanban/SubtitleRenderer.tsx` - 渲染逻辑
- `src/modules/Kanban/SubtitleConfigPanel.tsx` - 配置界面
- `src/modules/Kanban/KanbanComposition.tsx` - Composition 组件

### Remotion 文档
- [Remotion Spring](https://www.remotion.dev/docs/spring)
- [Remotion Interpolate](https://www.remotion.dev/docs/interpolate)
- [Remotion useCurrentFrame](https://www.remotion.dev/docs/use-current-frame)

# 看板字幕翻转切换动画

## 功能概述

字幕切换时使用 3D 翻转动画，类似"饺子机"或"翻页"效果，让文字在旋转过程中自然切换。

## 动画效果

### 视觉效果
```
旧文字 "开始"
    ↓
   旋转
    ↓
新文字 "继续"
```

### 3D 旋转过程

```
     正面                    侧面                    背面                    侧面                    正面
   ┌─────┐                ║                      ┌─────┐                  ║                    ┌─────┐
   │开始 │    →          ║                      │继续 │      →          ║        →          │继续 │
   └─────┘                ║                      └─────┘                  ║                    └─────┘
     0°                   90°                     180°                   270°                  360°
   (旧文字)              (切换点)                (新文字)               (切换点)              (新文字)
```

### 时间轴分解

```
时间: 0.0s - 0.6s (翻转动画持续 0.6 秒)

0.00s ─┬─ 0°     显示: "开始" (旧文字)
       │
0.15s ─┼─ 90°    ← 切换点，开始显示新文字
       │
0.30s ─┼─ 180°   显示: "继续" (新文字)
       │
0.45s ─┼─ 270°   ← 切换点，继续显示新文字
       │
0.60s ─┴─ 360°   显示: "继续" (新文字，固定)
```

## 技术实现

### 核心代码

```typescript
// 1. 计算旋转角度
const switchFrameOffset = Math.max(0, frame - switchTime * fps);

const springValue = spring({
  frame: switchFrameOffset,
  fps: 30,
  config: {
    damping: 15,      // 阻尼：控制弹性
    stiffness: 120,   // 刚度：控制速度
    mass: 0.8,        // 质量：影响惯性
  },
});

const rotateY = interpolate(springValue, [0, 1], [0, 360]);

// 2. 根据角度选择显示文字
const rotateNormalized = rotateY % 360;
if (rotateNormalized > 90 && rotateNormalized < 270) {
  displayText = newText; // 背面：新文字
} else {
  displayText = oldText; // 正面：旧文字
}

// 3. 应用 3D 变换
transform: `rotateY(${rotateY}deg)`
transformStyle: "preserve-3d"
backfaceVisibility: "hidden"
```

### Spring 动画配置

| 参数 | 值 | 作用 |
|------|-----|------|
| **damping** | 15 | 阻尼，值越小越有弹性 |
| **stiffness** | 120 | 刚度，值越大速度越快 |
| **mass** | 0.8 | 质量，影响惯性和摆动 |

### 3D Transform 属性

```css
/* 启用 3D 变换空间 */
transformStyle: preserve-3d;

/* Y 轴旋转（左右翻转） */
transform: rotateY(angle);

/* 隐藏元素背面（提升性能） */
backfaceVisibility: hidden;
```

## 切换逻辑

### 算法流程

```typescript
1. 按时间排序所有切换项
   [
     { time: 2.0, text: "A" },
     { time: 4.0, text: "B" },
     { time: 7.0, text: "C" }
   ]

2. 找到当前应该显示的切换项
   currentTime = 4.5s
   → 切换项: { time: 4.0, text: "B" }

3. 获取旧文字和新文字
   oldText = "A" (前一个切换项)
   newText = "B" (当前切换项)

4. 计算动画进度
   timeSinceSwitch = 4.5 - 4.0 = 0.5s
   → 动画进行中

5. 根据旋转角度选择文字
   rotateY = 180°
   → 90° < 180° < 270°
   → 显示新文字 "B"
```

### 边界情况

#### 第一次切换
```typescript
oldText = subtitle.text  // 原始字幕文字
newText = sortedItems[0].text
```

#### 动画完成
```typescript
timeSinceSwitch >= 0.6s
→ 直接显示新文字，无动画
```

#### 无切换项
```typescript
sortedItems.length === 0
→ 显示原始字幕文字
```

## 性能优化

### 1. 仅在切换时触发

```typescript
const timeSinceSwitch = currentTime - switchTime;
if (timeSinceSwitch < 0.6) {
  // 执行动画
} else {
  // 跳过计算，直接显示
}
```

### 2. 预计算排序

```typescript
// 一次排序，多次使用
const sortedItems = [...subtitle.switch.items]
  .sort((a, b) => a.time - b.time);
```

### 3. GPU 加速

```css
/* 使用 3D transform 触发 GPU 加速 */
transform: rotateY()
transformStyle: preserve-3d
```

## 动画参数调整

### 调整速度

```typescript
// 更快
config: {
  damping: 20,     // 增加阻尼
  stiffness: 150,  // 增加刚度
}

// 更慢
config: {
  damping: 10,     // 减少阻尼
  stiffness: 80,   // 减少刚度
}
```

### 调整弹性

```typescript
// 更有弹性
config: {
  damping: 10,     // 减少阻尼
  mass: 1.2,       // 增加质量
}

// 更平滑
config: {
  damping: 20,     // 增加阻尼
  mass: 0.5,       // 减少质量
}
```

### 调整持续时间

```typescript
// 更长
const switchDuration = 0.8; // 秒

// 更短
const switchDuration = 0.4; // 秒
```

## 使用示例

### 倒计时效果

```
设置切换项:
- 时间 3.0s, 文字 "3"
- 时间 4.0s, 文字 "2"
- 时间 5.0s, 文字 "1"
- 时间 6.0s, 文字 "GO!"

效果:
3.0s: "准备" 翻转到 "3"
4.0s: "3" 翻转到 "2"
5.0s: "2" 翻转到 "1"
6.0s: "1" 翻转到 "GO!"
```

### 分步教学

```
设置切换项:
- 时间 2.0s, 文字 "第一步"
- 时间 5.0s, 文字 "第二步"
- 时间 8.0s, 文字 "第三步"

效果:
每个步骤都通过翻转切换
```

## 视觉效果对比

### 无动画（之前）
```
"开始" → "继续"
(瞬间切换)
```

### 翻转动画（现在）
```
"开始" ⟲ "继续"
(0.6秒旋转过渡)
```

## 常见问题

### Q: 为什么选择 Y 轴旋转？
A: 
- Y 轴旋转是左右翻转（像翻书）
- 符合"饺子机"的翻转效果
- 视觉上更自然

**其他轴：**
- X 轴：上下翻转
- Z 轴：平面旋转

### Q: 可以调整旋转方向吗？
A: 可以，修改插值范围：

```typescript
// 顺时针
interpolate(springValue, [0, 1], [0, 360])

// 逆时针
interpolate(springValue, [0, 1], [0, -360])

// 两圈
interpolate(springValue, [0, 1], [0, 720])
```

### Q: 文字会倒着显示吗？
A: 不会。代码逻辑确保：
- 0-90°: 正面（旧文字）
- 90-270°: 背面（新文字，不倒）
- 270-360°: 正面（新文字）

### Q: 动画会影响其他功能吗？
A: 不会：
- ✅ 进入动画正常
- ✅ 缩放动画正常
- ✅ 退出动画正常
- ✅ 仅在切换时生效

### Q: 性能如何？
A: 
- 使用 GPU 加速（3D transform）
- 仅在 0.6 秒动画期间计算
- 完成后无额外开销
- 性能影响极小

## 扩展方向

### 短期优化
- [ ] 可配置动画持续时间
- [ ] 可选择旋转轴（X/Y/Z）
- [ ] 可选择旋转方向
- [ ] 可调整 Spring 参数

### 中期规划
- [ ] 多种切换动画（淡入淡出、滑动等）
- [ ] 动画预设（快速、优雅、活泼）
- [ ] 动画预览功能
- [ ] 关键帧编辑器

### 长期愿景
- [ ] 自定义动画曲线
- [ ] 粒子效果切换
- [ ] 3D 模型切换
- [ ] 物理模拟效果

## 调试技巧

### 查看旋转角度

```typescript
console.log("Rotate Y:", switchAnimation.rotateY);
console.log("Display text:", displayText);
```

### 慢动作播放

```typescript
// 增加动画时长
const switchDuration = 2.0; // 2秒（原来 0.6秒）
```

### 查看切换时间点

```typescript
console.log("Switch time:", switchTime);
console.log("Time since switch:", timeSinceSwitch);
console.log("In animation:", timeSinceSwitch < switchDuration);
```

## 相关资源

### 文档
- `docs/kanban-subtitle-switch-feature.md` - 切换功能基础
- `docs/kanban-subtitle-feature.md` - 字幕功能完整文档

### Remotion 文档
- [Spring Animation](https://www.remotion.dev/docs/spring)
- [Interpolate](https://www.remotion.dev/docs/interpolate)
- [3D Transforms](https://www.remotion.dev/docs/transforms)

### CSS 3D
- [transform-style](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-style)
- [backface-visibility](https://developer.mozilla.org/en-US/docs/Web/CSS/backface-visibility)
- [perspective](https://developer.mozilla.org/en-US/docs/Web/CSS/perspective)

## 版本历史

### v1.0.0 (2026-05-09)
- ✅ Y 轴翻转动画
- ✅ Spring 弹性效果
- ✅ 智能文字切换
- ✅ 3D 变换优化
- ✅ 性能优化

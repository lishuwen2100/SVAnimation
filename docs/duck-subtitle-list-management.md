# 倒鸭子模块字幕列表管理功能

## 概述

为倒鸭子模块添加了类似看板模块的字幕列表管理功能,用户现在可以手动添加、删除和编辑字幕,不再仅限于 SRT 文件导入。

## 新增功能

### 1. 字幕列表管理面板

在配置编辑器的右侧面板中添加了"字幕列表"折叠面板,位置在"字幕位置设定"和"字幕样式设置"之间。

**功能包括:**
- 显示当前字幕数量
- 添加新字幕按钮
- 字幕列表展示(可滚动,最大高度 264px)
- 每条字幕的编辑和删除

### 2. 字幕添加

点击"添加字幕"按钮会:
- 创建一条新字幕,默认文本为"新字幕"
- 开始时间为播放器当前时间
- 结束时间为开始时间 + 1.5 秒
- 自动展开新添加的字幕编辑面板

### 3. 字幕编辑

每条字幕支持独立编辑:
- **文本**: 多行文本框,支持换行
- **开始时间**: 数字输入框,步进 0.1 秒,支持"使用当前时间"快捷按钮
- **结束时间**: 数字输入框,步进 0.1 秒,支持"使用当前时间"快捷按钮
- **字体**: 下拉选择(默认、宋体、等宽、楷体、黑体)
- **字号**: 滑块控制,范围 36-120px,步进 2px
- **入场动画**: 下拉选择(随机、砸入弹跳、旋转缩放、侧滑扭曲、弹出抖动、弹跳摇摆)

### 4. 字幕删除

每条字幕编辑面板底部有"删除字幕"按钮,点击即可删除该字幕。

### 5. 时间控制便利功能

在编辑开始/结束时间时,每个输入框旁边都有"[使用当前时间]"按钮:
- 点击后会自动填入播放器当前播放位置的时间
- 方便精确设置字幕出现和消失的时间点

## 数据结构变化

### DuckSubtitleItem 类型

```typescript
export interface DuckSubtitleItem {
  id: string;          // 唯一标识
  text: string;        // 字幕文本
  startTime: number;   // 开始时间（秒）
  endTime: number;     // 结束时间（秒）
  fontFamily?: string;
  fontSize?: number;
  animation?: string;
  customPosition?: { x: number; y: number };
}
```

### DuckSubtitleConfig 更新

```typescript
export interface DuckSubtitleConfig {
  srtText: string;              // 保留用于向后兼容和 SRT 导入
  subtitles: DuckSubtitleItem[]; // 字幕列表（新增）
  // ... 其他字段保持不变
}
```

## 向后兼容

### SRT 导入自动转换

当用户导入 SRT 文件时,系统会:
1. 解析 SRT 内容
2. 将每条字幕转换为 `DuckSubtitleItem` 格式
3. 保留原有的 `srtText` 字段(用于 UI 显示和回退)
4. 填充 `subtitles` 数组

### 优先级逻辑

渲染和时长计算的优先级:
1. 如果 `subtitles.length > 0`,使用字幕列表
2. 否则,回退到解析 `srtText`

这确保了:
- 旧项目(只有 `srtText`)仍能正常工作
- 新项目可以完全使用字幕列表
- 两种方式可以混合使用

## 实现细节

### 获取播放器当前时间

```typescript
const getCurrentTime = (): number => {
  if (playerRef.current) {
    const frame = playerRef.current.getCurrentFrame();
    return frame / FPS;
  }
  return 0;
};
```

### Cues 计算逻辑

```typescript
const cues = useMemo(() => {
  // 优先使用字幕列表
  if (config.subtitles.length > 0) {
    return config.subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .map((subtitle, index) => ({
        id: index,
        startSec: subtitle.startTime,
        endSec: subtitle.endTime,
        startFrame: Math.floor(subtitle.startTime * FPS),
        endFrame: Math.floor(subtitle.endTime * FPS),
        text: subtitle.text,
        // ... 其他属性
      }));
  } else {
    // 向后兼容:从 SRT 文本解析
    return parseSrt(config.srtText).map(/* ... */);
  }
}, [config.subtitles, config.srtText, config.subtitleStyles]);
```

### Player 组件 Key 更新

Player 的 key 中添加了 `config.subtitles.length`,确保字幕列表变化时重新渲染:

```typescript
key={`${config.subtitles.length}-${config.srtText.length}-...`}
```

## UI 设计

### 字幕列表项布局

- **标题栏**: 显示序号、文本(截断)、时间范围
- **可折叠**: 点击标题栏展开/收起编辑面板
- **滚动区域**: 列表超过 264px 高度时可滚动
- **删除按钮**: 位于编辑面板底部,红色警示样式

### 空状态提示

当 `subtitles.length === 0` 时显示:
> "暂无字幕,点击上方按钮添加或导入 SRT 文件"

## 使用流程

### 方式一:从零开始手动添加

1. 点击"添加字幕"按钮
2. 编辑字幕文本
3. 播放视频/音频到目标位置
4. 点击"[使用当前时间]"设置开始时间
5. 播放到字幕结束位置
6. 点击"[使用当前时间]"设置结束时间
7. 调整字体、字号、动画等属性
8. 重复 1-7 添加更多字幕

### 方式二:导入 SRT 后微调

1. 点击"导入 SRT 字幕"上传 SRT 文件
2. 系统自动转换为字幕列表
3. 展开需要修改的字幕
4. 调整文本、时间、样式等
5. 添加新字幕或删除不需要的字幕

## 注意事项

1. **时间验证**: 系统不强制要求 `endTime > startTime`,但建议保持合理的时间顺序
2. **字幕排序**: 渲染时会自动按 `startTime` 排序
3. **ID 生成**: 使用 `Date.now()` 生成唯一 ID,添加 index 后缀避免快速连续添加时冲突
4. **播放器刷新**: 修改字幕后 Player 会自动重新渲染(通过 key 变化触发)

## 未来改进建议

1. 添加字幕拖拽排序功能
2. 支持批量编辑(选中多条字幕统一设置样式)
3. 添加字幕时间线可视化编辑器
4. 支持字幕导出为 SRT 文件
5. 添加字幕复制/粘贴功能
6. 支持撤销/重做操作

## 相关文件

- `src/types/workflow.ts` - 类型定义
- `src/modules/DuckSubtitle/DuckSubtitleConfigEditor.tsx` - 配置编辑器
- `src/modules/DuckSubtitle.tsx` - 模块入口
- `src/registry/modules/duckSubtitle.tsx` - 模块注册

// 图片配置面板组件

import type { KanbanImage, KanbanAnimation } from "@/types/workflow";

export interface ImageConfigPanelProps {
  image: KanbanImage;
  onUpdate: (updates: Partial<KanbanImage>) => void;
  onDelete: () => void;
  onGetCurrentTime: () => number;
  onStartPickingPosition?: (imageId: string, type: "initial" | "move") => void;
  isPickingPosition?: boolean;
}

const animationOptions: { id: KanbanAnimation; label: string }[] = [
  { id: "none", label: "无动画" },
  { id: "slam-bounce", label: "猛击弹跳" },
  { id: "spin-scale", label: "旋转缩放" },
  { id: "side-skew", label: "侧滑倾斜" },
  { id: "pop-shake", label: "弹出摇晃" },
  { id: "bounce-sway", label: "弹跳摇摆" },
];

export function ImageConfigPanel({
  image,
  onUpdate,
  onDelete,
  onGetCurrentTime,
  onStartPickingPosition,
  isPickingPosition = false,
}: ImageConfigPanelProps) {
  const handleTogglePositionPicking = (type: "initial" | "move") => {
    if (onStartPickingPosition) {
      onStartPickingPosition(image.id, type);
    }
  };

  const handleSetEnterTime = () => {
    const time = onGetCurrentTime();
    onUpdate({ enterTime: time });
  };

  const handleSetExitTime = () => {
    const time = onGetCurrentTime();
    onUpdate({ exitTime: time });
  };

  const handleSetMoveStartTime = () => {
    const time = onGetCurrentTime();
    onUpdate({
      move: { ...image.move, startTime: time },
    });
  };

  return (
    <div className="p-4 border-t border-neutral-700 bg-neutral-900/50 space-y-4">
      {/* 图片预览 */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          图片预览
        </label>
        <div className="rounded-lg border border-neutral-700 bg-neutral-800 p-2 flex items-center justify-center">
          <img
            src={image.imageData}
            alt={image.fileName}
            className="max-h-32 object-contain"
          />
        </div>
        <div className="mt-1 text-xs text-neutral-500 text-center">
          {image.fileName}
        </div>
      </div>

      {/* 时间设置 */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            进入时间 (秒)
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              value={image.enterTime.toFixed(2)}
              onChange={(e) => onUpdate({ enterTime: parseFloat(e.target.value) || 0 })}
              step="0.1"
              className="flex-1 min-w-0 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={handleSetEnterTime}
              className="px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-400 hover:bg-cyan-500/20 whitespace-nowrap"
              title="获取当前时间"
            >
              当前
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            退出时间 (秒, 0=不退出)
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              value={image.exitTime.toFixed(2)}
              onChange={(e) => onUpdate({ exitTime: parseFloat(e.target.value) || 0 })}
              step="0.1"
              className="flex-1 min-w-0 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={handleSetExitTime}
              className="px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-400 hover:bg-cyan-500/20 whitespace-nowrap"
              title="获取当前时间"
            >
              当前
            </button>
          </div>
        </div>
      </div>

      {/* 尺寸设置 */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          图片尺寸 (像素)
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-neutral-500 mb-1">宽度</label>
            <input
              type="number"
              value={image.width}
              onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 100 })}
              min="10"
              max="2000"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs text-neutral-500 mb-1">高度</label>
            <input
              type="number"
              value={image.height}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 100 })}
              min="10"
              max="2000"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 坐标设置 */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          坐标 (像素)
        </label>
        <div className="flex gap-2 items-center">
          <div className="flex-1 grid grid-cols-2 gap-2">
            <input
              type="number"
              value={image.position.x}
              onChange={(e) =>
                onUpdate({
                  position: { ...image.position, x: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="X"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="number"
              value={image.position.y}
              onChange={(e) =>
                onUpdate({
                  position: { ...image.position, y: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="Y"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => handleTogglePositionPicking("initial")}
            className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
              isPickingPosition
                ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                : "border-neutral-600 bg-neutral-800/50 text-neutral-400 hover:border-cyan-500/50"
            }`}
          >
            点选
          </button>
        </div>
      </div>

      {/* 进入动画 */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-2">
          进入动画
        </label>
        <div className="grid grid-cols-2 gap-2">
          {animationOptions.map((option) => (
            <button
              key={option.id}
              onClick={() => onUpdate({ animation: option.id })}
              className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                image.animation === option.id
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 移动设置 */}
      <div className="border-t border-neutral-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-neutral-400">
            移动动画
          </label>
          <button
            onClick={() =>
              onUpdate({
                move: { ...image.move, enabled: !image.move.enabled },
              })
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              image.move.enabled ? "bg-green-500" : "bg-neutral-700"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                image.move.enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {image.move.enabled && (
          <div className="space-y-3 pl-2 border-l-2 border-green-500/30">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                开始移动时间 (秒)
              </label>
              <div className="flex gap-1">
                <input
                  type="number"
                  value={image.move.startTime.toFixed(2)}
                  onChange={(e) =>
                    onUpdate({
                      move: { ...image.move, startTime: parseFloat(e.target.value) || 0 },
                    })
                  }
                  step="0.1"
                  className="flex-1 min-w-0 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-green-500 focus:outline-none"
                />
                <button
                  onClick={handleSetMoveStartTime}
                  className="px-2 py-1 rounded-lg border border-green-500/30 bg-green-500/10 text-xs text-green-400 hover:bg-green-500/20 whitespace-nowrap"
                  title="获取当前时间"
                >
                  当前
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                移动持续时间 (秒)
              </label>
              <input
                type="number"
                value={image.move.duration.toFixed(2)}
                onChange={(e) =>
                  onUpdate({
                    move: { ...image.move, duration: parseFloat(e.target.value) || 0.5 },
                  })
                }
                step="0.1"
                min="0.1"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-green-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-2">
                移动后尺寸 (像素)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">宽度</label>
                  <input
                    type="number"
                    value={image.move.width}
                    onChange={(e) =>
                      onUpdate({
                        move: { ...image.move, width: parseInt(e.target.value) || 100 },
                      })
                    }
                    min="10"
                    max="2000"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-500 mb-1">高度</label>
                  <input
                    type="number"
                    value={image.move.height}
                    onChange={(e) =>
                      onUpdate({
                        move: { ...image.move, height: parseInt(e.target.value) || 100 },
                      })
                    }
                    min="10"
                    max="2000"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-green-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                移动到的坐标 (像素)
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={image.move.position.x}
                    onChange={(e) =>
                      onUpdate({
                        move: {
                          ...image.move,
                          position: {
                            ...image.move.position,
                            x: parseInt(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    placeholder="X"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-green-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={image.move.position.y}
                    onChange={(e) =>
                      onUpdate({
                        move: {
                          ...image.move,
                          position: {
                            ...image.move.position,
                            y: parseInt(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    placeholder="Y"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-green-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleTogglePositionPicking("move")}
                  className={`px-3 py-1 rounded-lg border text-xs font-medium transition-colors ${
                    isPickingPosition
                      ? "border-green-500 bg-green-500/20 text-green-300"
                      : "border-neutral-600 bg-neutral-800/50 text-neutral-400 hover:border-green-500/50"
                  }`}
                >
                  点选
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-2">
        <button
          onClick={onDelete}
          className="flex-1 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm font-medium text-red-400 transition-all hover:bg-red-500/20"
        >
          删除图片
        </button>
      </div>

      {/* 点选模式提示 */}
      {isPickingPosition && (
        <div className="rounded-lg bg-cyan-500/10 border border-cyan-500/30 p-3">
          <div className="flex items-start gap-2">
            <svg className="h-4 w-4 text-cyan-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-cyan-300">
              <div className="font-medium mb-1">
                设置图片坐标
              </div>
              <div className="text-cyan-400/80">
                点击右侧预览视频画面选择坐标位置
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

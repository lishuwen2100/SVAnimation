// 字幕配置面板组件

import { useState } from "react";
import type { KanbanSubtitle, KanbanSubtitleAnimation } from "@/types/workflow";

export interface SubtitleConfigPanelProps {
  subtitle: KanbanSubtitle;
  onUpdate: (updates: Partial<KanbanSubtitle>) => void;
  onDelete: () => void;
  onGetCurrentTime: () => number;
  onStartPickingPosition?: (subtitleId: string, type: "initial" | "scale") => void;
  isPickingPosition?: boolean;
}

const animationOptions: { id: KanbanSubtitleAnimation; label: string }[] = [
  { id: "none", label: "无动画" },
  { id: "slam-bounce", label: "猛击弹跳" },
  { id: "spin-scale", label: "旋转缩放" },
  { id: "side-skew", label: "侧滑倾斜" },
  { id: "pop-shake", label: "弹出摇晃" },
  { id: "bounce-sway", label: "弹跳摇摆" },
];

export function SubtitleConfigPanel({
  subtitle,
  onUpdate,
  onDelete,
  onGetCurrentTime,
  onStartPickingPosition,
  isPickingPosition = false,
}: SubtitleConfigPanelProps) {
  const handleTogglePositionPicking = (type: "initial" | "scale") => {
    if (onStartPickingPosition) {
      onStartPickingPosition(subtitle.id, type);
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

  return (
    <div className="p-4 border-t border-neutral-700 bg-neutral-900/50 space-y-4">
      {/* 字幕文本 */}
      <div>
        <label className="block text-xs font-medium text-neutral-400 mb-1">
          字幕文本
        </label>
        <input
          type="text"
          value={subtitle.text}
          onChange={(e) => onUpdate({ text: e.target.value })}
          className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
        />
      </div>

      {/* 时间设置 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            进入时间 (秒)
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              value={subtitle.enterTime.toFixed(2)}
              onChange={(e) => onUpdate({ enterTime: parseFloat(e.target.value) || 0 })}
              step="0.1"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={handleSetEnterTime}
              className="px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-400 hover:bg-cyan-500/20"
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
              value={subtitle.exitTime.toFixed(2)}
              onChange={(e) => onUpdate({ exitTime: parseFloat(e.target.value) || 0 })}
              step="0.1"
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={handleSetExitTime}
              className="px-2 py-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 text-xs text-cyan-400 hover:bg-cyan-500/20"
              title="获取当前时间"
            >
              当前
            </button>
          </div>
        </div>
      </div>

      {/* 样式设置 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            字体大小
          </label>
          <input
            type="number"
            value={subtitle.fontSize}
            onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) || 48 })}
            min="12"
            max="200"
            className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-400 mb-1">
            颜色
          </label>
          <div className="flex gap-2">
            <input
              type="color"
              value={subtitle.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-12 h-9 rounded-lg border border-neutral-700 bg-neutral-800 cursor-pointer"
            />
            <input
              type="text"
              value={subtitle.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
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
              value={subtitle.position.x}
              onChange={(e) =>
                onUpdate({
                  position: { ...subtitle.position, x: parseInt(e.target.value) || 0 },
                })
              }
              placeholder="X"
              className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
            />
            <input
              type="number"
              value={subtitle.position.y}
              onChange={(e) =>
                onUpdate({
                  position: { ...subtitle.position, y: parseInt(e.target.value) || 0 },
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
                subtitle.animation === option.id
                  ? "border-purple-500 bg-purple-500/20 text-purple-300"
                  : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* 缩放设置 */}
      <div className="border-t border-neutral-700 pt-4">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-medium text-neutral-400">
            缩放动画
          </label>
          <button
            onClick={() =>
              onUpdate({
                scale: { ...subtitle.scale, enabled: !subtitle.scale.enabled },
              })
            }
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              subtitle.scale.enabled ? "bg-cyan-500" : "bg-neutral-700"
            }`}
          >
            <span
              className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                subtitle.scale.enabled ? "translate-x-5" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {subtitle.scale.enabled && (
          <div className="space-y-3 pl-2 border-l-2 border-cyan-500/30">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                缩放后字体大小
              </label>
              <input
                type="number"
                value={subtitle.scale.fontSize}
                onChange={(e) =>
                  onUpdate({
                    scale: { ...subtitle.scale, fontSize: parseInt(e.target.value) || 48 },
                  })
                }
                min="12"
                max="200"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                缩放后坐标 (像素)
              </label>
              <div className="flex gap-2 items-center">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={subtitle.scale.position.x}
                    onChange={(e) =>
                      onUpdate({
                        scale: {
                          ...subtitle.scale,
                          position: {
                            ...subtitle.scale.position,
                            x: parseInt(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    placeholder="X"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
                  />
                  <input
                    type="number"
                    value={subtitle.scale.position.y}
                    onChange={(e) =>
                      onUpdate({
                        scale: {
                          ...subtitle.scale,
                          position: {
                            ...subtitle.scale.position,
                            y: parseInt(e.target.value) || 0,
                          },
                        },
                      })
                    }
                    placeholder="Y"
                    className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <button
                  onClick={() => handleTogglePositionPicking("scale")}
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

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">
                缩放延迟 (秒)
              </label>
              <input
                type="number"
                value={subtitle.scale.delay}
                onChange={(e) =>
                  onUpdate({
                    scale: { ...subtitle.scale, delay: parseFloat(e.target.value) || 0 },
                  })
                }
                step="0.1"
                min="0"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-2 py-1 text-sm text-neutral-200 focus:border-cyan-500 focus:outline-none"
              />
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
          删除字幕
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
                设置字幕坐标
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

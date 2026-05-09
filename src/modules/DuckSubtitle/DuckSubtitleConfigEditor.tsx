// DuckSubtitle 配置编辑器（状态通过 props 管理）

import { Player } from "@remotion/player";
import { useEffect, useMemo, useRef, useState } from "react";
import { DuckSubtitleComposition } from "./DuckSubtitleComposition";
import type { DuckSubtitleConfig } from "@/types/workflow";
import {
  type SubtitleCue,
  type SubtitleStyle,
  FPS,
  parseSrt,
  resolutionOptions,
  fontFamilyOptions,
  stylePresets,
  enterAnimationOptions,
  clamp,
} from "./utils";

export interface DuckSubtitleConfigEditorProps {
  config: DuckSubtitleConfig;
  onChange: (config: DuckSubtitleConfig) => void;
  onFinish: () => void;
}

export const DuckSubtitleConfigEditor: React.FC<DuckSubtitleConfigEditorProps> = ({
  config,
  onChange,
  onFinish,
}) => {
  // 本地 UI 状态（不需要持久化）
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const [draftRect, setDraftRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isDrawMode, setIsDrawMode] = useState(false);
  const [selectedCueIds, setSelectedCueIds] = useState<Set<number>>(new Set());
  const [expandedCueId, setExpandedCueId] = useState<number | null>(null);
  const [isSelectingPosition, setIsSelectingPosition] = useState(false);
  const [selectingCueId, setSelectingCueId] = useState<number | null>(null);

  const selectedResolution =
    resolutionOptions.find((option) => option.id === config.resolution.id) ?? config.resolution;

  const cues = useMemo(() => {
    const parsedCues = parseSrt(config.srtText);
    return parsedCues.map((cue) => ({
      ...cue,
      fontFamily: config.subtitleStyles[cue.id]?.fontFamily,
      fontSize: config.subtitleStyles[cue.id]?.fontSize,
      animation: config.subtitleStyles[cue.id]?.animation,
      customPosition: config.subtitleStyles[cue.id]?.customPosition,
    }));
  }, [config.srtText, config.subtitleStyles]);

  const durationInFrames = useMemo(() => {
    const subtitleFrames = cues.length > 0 ? cues[cues.length - 1].endFrame + FPS * 2 : FPS * 8;
    const audioFrames = config.audioDuration > 0 ? Math.ceil(config.audioDuration * FPS) : 0;
    return Math.max(subtitleFrames, audioFrames, FPS * 8);
  }, [config.audioDuration, cues]);

  const handleSrtUpload = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    onChange({ ...config, srtText: text });
  };

  const handleAudioUpload = (file: File | null) => {
    if (!file) return;

    if (config.audioSrc) {
      URL.revokeObjectURL(config.audioSrc);
    }

    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement("audio");
    audio.src = objectUrl;
    audio.onloadedmetadata = () => {
      onChange({
        ...config,
        audioSrc: objectUrl,
        audioDuration: Number.isFinite(audio.duration) ? audio.duration : 0,
      });
    };
  };

  useEffect(
    () => () => {
      if (config.audioSrc) URL.revokeObjectURL(config.audioSrc);
    },
    [config.audioSrc]
  );

  const normalizeRegion = (next: { x: number; y: number; width: number; height: number; show: boolean }) => {
    const width = clamp(next.width, 0.1, 0.9);
    const height = clamp(next.height, 0.1, 0.9);
    const x = clamp(next.x, 0, 1 - width);
    const y = clamp(next.y, 0, 1 - height);
    return { ...next, x, y, width, height };
  };

  const updateCenterRegion = (key: "x" | "y" | "width" | "height", value: number) => {
    onChange({
      ...config,
      centerRegion: normalizeRegion({
        ...config.centerRegion,
        [key]: value,
      }),
    });
  };

  const getLocalPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const overlay = overlayRef.current;
    if (!overlay) return null;
    const rect = overlay.getBoundingClientRect();
    return {
      x: clamp(event.clientX - rect.left, 0, rect.width),
      y: clamp(event.clientY - rect.top, 0, rect.height),
      width: rect.width,
      height: rect.height,
    };
  };

  const handleOverlayPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const point = getLocalPoint(event);
    if (!point) return;

    if (isSelectingPosition) {
      if (event.button !== 0) return;
      const normalizedX = (point.x / point.width) * selectedResolution.width;
      const normalizedY = (point.y / point.height) * selectedResolution.height;

      if (selectingCueId !== null) {
        onChange({
          ...config,
          subtitleStyles: {
            ...config.subtitleStyles,
            [selectingCueId]: {
              ...config.subtitleStyles[selectingCueId],
              customPosition: { x: normalizedX, y: normalizedY },
            },
          },
        });
        setSelectingCueId(null);
      } else {
        onChange({
          ...config,
          centerRegion: {
            ...config.centerRegion,
            manualPosition: { x: normalizedX, y: normalizedY },
          },
          positionMode: "manual",
        });
      }
      setIsSelectingPosition(false);
      return;
    }

    if (!isDrawMode || event.button !== 0) return;

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = { x: point.x / point.width, y: point.y / point.height };
    setDraftRect(null);
  };

  const handleOverlayPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !dragStartRef.current) return;

    const point = getLocalPoint(event);
    if (!point) return;

    const currentX = point.x / point.width;
    const currentY = point.y / point.height;
    const startX = dragStartRef.current.x;
    const startY = dragStartRef.current.y;

    setDraftRect({
      x: Math.min(startX, currentX),
      y: Math.min(startY, currentY),
      width: Math.abs(currentX - startX),
      height: Math.abs(currentY - startY),
    });
  };

  const handleOverlayPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isDrawMode || !dragStartRef.current) return;

    if (draftRect && (draftRect.width > 0.02 || draftRect.height > 0.02)) {
      onChange({
        ...config,
        centerRegion: normalizeRegion({
          ...draftRect,
          show: true,
        }),
      });
    }

    dragStartRef.current = null;
    setDraftRect(null);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const toggleCueSelection = (cueId: number) => {
    setSelectedCueIds((prev) => {
      const next = new Set(prev);
      if (next.has(cueId)) {
        next.delete(cueId);
      } else {
        next.add(cueId);
      }
      return next;
    });
  };

  const selectAllCues = () => {
    setSelectedCueIds(new Set(cues.map((cue) => cue.id)));
  };

  const clearSelection = () => {
    setSelectedCueIds(new Set());
  };

  const applyPresetToSelected = (preset: typeof stylePresets[0]) => {
    const updated = { ...config.subtitleStyles };
    for (const cueId of selectedCueIds) {
      updated[cueId] = {
        ...updated[cueId],
        fontFamily: preset.fontFamily,
        fontSize: preset.fontSize,
        animation: preset.animation,
      };
    }
    onChange({ ...config, subtitleStyles: updated });
  };

  const resetStyles = () => {
    if (confirm("确定要重置所有字幕样式吗？")) {
      onChange({ ...config, subtitleStyles: {} });
    }
  };

  const updateCueStyle = (cueId: number, updates: Partial<SubtitleStyle>) => {
    onChange({
      ...config,
      subtitleStyles: {
        ...config.subtitleStyles,
        [cueId]: {
          ...config.subtitleStyles[cueId],
          ...updates,
        },
      },
    });
  };

  return (
    <div className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* 左侧：预览区 */}
        <div className="space-y-6">
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <div
              ref={overlayRef}
              className="relative"
              onPointerDown={handleOverlayPointerDown}
              onPointerMove={handleOverlayPointerMove}
              onPointerUp={handleOverlayPointerUp}
              style={{ cursor: isDrawMode ? "crosshair" : isSelectingPosition ? "crosshair" : "default" }}
            >
              {isSelectingPosition && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 pointer-events-none">
                  <div className="rounded-lg bg-neutral-900/90 px-6 py-4 text-center backdrop-blur-sm">
                    <div className="mb-2 text-lg font-semibold text-white">
                      {selectingCueId !== null ? `点击选择字幕 #${selectingCueId + 1} 的位置` : "点击选择全局字幕位置"}
                    </div>
                    <div className="text-sm text-neutral-400">点击画面中的任意位置确定字幕起始点</div>
                  </div>
                </div>
              )}

              {draftRect && (
                <div
                  className="pointer-events-none absolute z-40 border-2 border-yellow-300 bg-yellow-300/10"
                  style={{
                    left: `${draftRect.x * 100}%`,
                    top: `${draftRect.y * 100}%`,
                    width: `${draftRect.width * 100}%`,
                    height: `${draftRect.height * 100}%`,
                  }}
                />
              )}

              <Player
                key={`${config.srtText.length}-${durationInFrames}-${config.audioSrc ?? "no-audio"}-${
                  config.resolution.id
                }-${config.centerRegion.x}-${config.centerRegion.y}-${config.centerRegion.width}-${
                  config.centerRegion.height
                }-${config.centerRegion.show}-${config.centerRegion.manualPosition?.x ?? "null"}-${
                  config.centerRegion.manualPosition?.y ?? "null"
                }`}
                component={DuckSubtitleComposition}
                inputProps={{
                  cues,
                  audioSrc: config.audioSrc,
                  compositionSize: {
                    width: selectedResolution.width,
                    height: selectedResolution.height,
                  },
                  centerRegion: config.centerRegion,
                }}
                fps={FPS}
                compositionWidth={selectedResolution.width}
                compositionHeight={selectedResolution.height}
                durationInFrames={durationInFrames}
                controls
                style={{
                  width: "100%",
                  aspectRatio: `${selectedResolution.width}/${selectedResolution.height}`,
                }}
              />
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex flex-wrap items-center gap-3">
            <label className="group relative inline-flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-purple-600 to-purple-500 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-purple-500/50 active:scale-[0.98]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>导入 SRT 字幕</span>
              <input
                type="file"
                accept=".srt"
                className="hidden"
                onChange={(e) => handleSrtUpload(e.target.files?.[0] ?? null)}
              />
            </label>

            <label className="group relative inline-flex cursor-pointer items-center gap-2.5 overflow-hidden rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-pink-500/50 active:scale-[0.98]">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>导入 MP3 音频</span>
              <input
                type="file"
                accept=".mp3,.wav,.m4a"
                className="hidden"
                onChange={(e) => handleAudioUpload(e.target.files?.[0] ?? null)}
              />
            </label>

            <button
              onClick={() => {
                onChange({
                  ...config,
                  srtText: config.srtText,
                  subtitleStyles: {},
                });
              }}
              className="inline-flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-amber-500/50 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>恢复演示</span>
            </button>

            <button
              onClick={() => setIsDrawMode((prev) => !prev)}
              className={`inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 font-medium shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isDrawMode
                  ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:shadow-green-500/50"
                  : "bg-gradient-to-r from-yellow-500 to-amber-500 text-white hover:shadow-yellow-500/50"
              }`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              <span>{isDrawMode ? "框选中 (点击关闭)" : "框选中心区域"}</span>
            </button>

            <button
              onClick={onFinish}
              className="ml-auto inline-flex items-center gap-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-2.5 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/50 active:scale-[0.98]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>完成配置</span>
            </button>
          </div>

          {/* 状态信息 */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
              <svg className="h-4 w-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <span className="text-sm font-medium">{cues.length} 条字幕</span>
            </div>

            {config.audioSrc && (
              <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
                <svg className="h-4 w-4 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-sm font-medium">音频: {config.audioDuration.toFixed(1)}s</span>
              </div>
            )}

            <div className="inline-flex items-center gap-2 rounded-md bg-neutral-800/50 px-3 py-1.5 text-neutral-300">
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium">{(durationInFrames / FPS).toFixed(1)}s</span>
            </div>
          </div>
        </div>

        {/* 右侧：配置面板 */}
        <aside className="space-y-4">
          {/* 分辨率 */}
          <details className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-800/50">
              输出分辨率
            </summary>
            <div className="space-y-2 border-t border-neutral-800 px-4 py-3">
              {resolutionOptions.map((option) => (
                <label
                  key={option.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-all ${
                    config.resolution.id === option.id
                      ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                      : "border-neutral-700 text-neutral-300 hover:border-neutral-600 hover:bg-neutral-800/50"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolution"
                    checked={config.resolution.id === option.id}
                    onChange={() =>
                      onChange({
                        ...config,
                        resolution: option,
                      })
                    }
                    className="h-4 w-4 accent-cyan-500"
                  />
                  <span className="text-sm font-medium">{option.label}</span>
                </label>
              ))}
            </div>
          </details>

          {/* 中心区域设置 */}
          <details className="group overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
            <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-100 transition-colors hover:bg-neutral-800/50">
              中心区域设置
            </summary>
            <div className="space-y-3 border-t border-neutral-800 px-4 py-3">
              {(["x", "y", "width", "height"] as const).map((key) => (
                <div key={key}>
                  <label className="mb-1 block text-xs font-medium text-neutral-400">
                    {key === "x" ? "X 位置" : key === "y" ? "Y 位置" : key === "width" ? "宽度" : "高度"}
                    <span className="ml-2 text-yellow-400">{Math.round(config.centerRegion[key] * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={key === "width" || key === "height" ? "10" : "0"}
                    max={key === "width" || key === "height" ? "90" : "100"}
                    step="1"
                    value={Math.round(config.centerRegion[key] * 100)}
                    onChange={(e) => updateCenterRegion(key, Number(e.target.value) / 100)}
                    className="w-full accent-yellow-500"
                  />
                </div>
              ))}

              <div className="flex items-center gap-2 rounded-lg border border-neutral-700 bg-neutral-800/30 px-3 py-2">
                <input
                  type="checkbox"
                  checked={config.centerRegion.show}
                  onChange={(e) =>
                    onChange({
                      ...config,
                      centerRegion: { ...config.centerRegion, show: e.target.checked },
                    })
                  }
                  className="h-4 w-4 accent-yellow-500"
                />
                <span className="text-sm text-neutral-300">显示中心区域边框</span>
              </div>
            </div>
          </details>

          {/* 完成按钮（移动端） */}
          <button
            onClick={onFinish}
            className="lg:hidden w-full inline-flex items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-600 px-5 py-3 font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-blue-500/50 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>完成配置</span>
          </button>
        </aside>
      </div>
    </div>
  );
};

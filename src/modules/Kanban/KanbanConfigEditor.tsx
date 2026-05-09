// Kanban 模块配置编辑器

import { useRef, useState, useEffect } from "react";
import type { KanbanConfig, KanbanSubtitle } from "@/types/workflow";
import { Player } from "@remotion/player";
import { KanbanComposition } from "./KanbanComposition";
import { saveVideo, getVideoUrl, deleteVideo } from "@/utils/videoStorage";
import { SubtitleConfigPanel } from "./SubtitleConfigPanel";

export interface KanbanConfigEditorProps {
  config: KanbanConfig;
  onChange: (config: KanbanConfig) => void;
  onFinish: () => void;
}

const resolutionOptions = [
  { id: "1080p", width: 1920, height: 1080, label: "1920 x 1080 (Full HD)" },
  { id: "720p", width: 1280, height: 720, label: "1280 x 720 (HD)" },
  { id: "vertical", width: 1080, height: 1920, label: "1080 x 1920 (竖屏)" },
];

export function KanbanConfigEditor({
  config,
  onChange,
  onFinish,
}: KanbanConfigEditorProps) {
  const videoInputRef = useRef<HTMLInputElement>(null);
  const playerRef = useRef<any>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const previousVideoIdRef = useRef<string | null>(null);

  // UI 状态
  const [resolutionExpanded, setResolutionExpanded] = useState(false);
  const [subtitlesExpanded, setSubtitlesExpanded] = useState(false);
  const [expandedSubtitleId, setExpandedSubtitleId] = useState<string | null>(null);

  // 坐标点选状态
  const [pickingState, setPickingState] = useState<{
    subtitleId: string;
    type: "initial" | "scale";
  } | null>(null);

  // 加载视频 URL
  useEffect(() => {
    let isMounted = true;
    let objectUrl: string | null = null;

    const loadVideo = async () => {
      if (config.videoId) {
        try {
          const url = await getVideoUrl(config.videoId);
          if (isMounted && url) {
            objectUrl = url;
            setVideoUrl(url);
          }
        } catch (error) {
          console.error("Failed to load video:", error);
        }
      } else {
        setVideoUrl(null);
      }
    };

    loadVideo();

    return () => {
      isMounted = false;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [config.videoId]);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/mp4")) {
      alert("请上传 MP4 格式的视频文件");
      return;
    }

    setIsUploading(true);

    try {
      const tempUrl = URL.createObjectURL(file);
      const videoElement = document.createElement("video");
      videoElement.src = tempUrl;

      videoElement.onloadedmetadata = async () => {
        const duration = videoElement.duration;
        URL.revokeObjectURL(tempUrl);

        try {
          if (previousVideoIdRef.current) {
            await deleteVideo(previousVideoIdRef.current).catch(console.error);
          }

          const videoId = await saveVideo(file, file.name, duration);
          previousVideoIdRef.current = videoId;

          onChange({
            ...config,
            videoId,
            videoFileName: file.name,
            videoDuration: duration,
            videoSize: file.size,
          });

          setIsUploading(false);
        } catch (error) {
          console.error("Failed to save video:", error);
          alert("视频保存失败");
          setIsUploading(false);
        }
      };

      videoElement.onerror = () => {
        URL.revokeObjectURL(tempUrl);
        alert("视频加载失败，请检查文件格式");
        setIsUploading(false);
      };
    } catch (error) {
      console.error("Video upload error:", error);
      alert("视频上传失败");
      setIsUploading(false);
    }
  };

  const handleResolutionChange = (resId: string) => {
    const resolution = resolutionOptions.find((r) => r.id === resId);
    if (resolution) {
      onChange({
        ...config,
        resolution: {
          id: resolution.id,
          width: resolution.width,
          height: resolution.height,
          label: resolution.label,
        },
      });
    }
  };

  // 获取当前视频时间
  const getCurrentTime = (): number => {
    if (playerRef.current) {
      const frame = playerRef.current.getCurrentFrame();
      return frame / 30; // 假设 30 FPS
    }
    return 0;
  };

  // 添加字幕
  const handleAddSubtitle = () => {
    const currentTime = getCurrentTime();
    const newSubtitle: KanbanSubtitle = {
      id: `subtitle-${Date.now()}`,
      text: "新字幕",
      enterTime: currentTime,
      exitTime: 0, // 0 表示一直显示
      fontSize: 48,
      color: "#FFFFFF",
      position: { x: 0, y: 0 }, // 左上角
      animation: "none",
      scale: {
        enabled: false,
        fontSize: 48,
        position: { x: 0, y: 0 },
        delay: 1,
      },
    };

    onChange({
      ...config,
      subtitles: [...config.subtitles, newSubtitle],
    });

    // 展开字幕面板和新字幕
    setSubtitlesExpanded(true);
    setExpandedSubtitleId(newSubtitle.id);
  };

  // 更新字幕
  const handleUpdateSubtitle = (id: string, updates: Partial<KanbanSubtitle>) => {
    onChange({
      ...config,
      subtitles: config.subtitles.map((sub) =>
        sub.id === id ? { ...sub, ...updates } : sub
      ),
    });
  };

  // 删除字幕
  const handleDeleteSubtitle = (id: string) => {
    onChange({
      ...config,
      subtitles: config.subtitles.filter((sub) => sub.id !== id),
    });
  };

  // 开始点选坐标
  const handleStartPickingPosition = (subtitleId: string, type: "initial" | "scale") => {
    setPickingState({ subtitleId, type });
  };

  // 处理视频点击
  const handleVideoClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickingState || !videoContainerRef.current) return;

    const rect = videoContainerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 计算相对于视频实际尺寸的坐标
    const scaleX = config.resolution.width / rect.width;
    const scaleY = config.resolution.height / rect.height;
    const actualX = Math.round(x * scaleX);
    const actualY = Math.round(y * scaleY);

    // 更新字幕坐标
    const subtitle = config.subtitles.find((s) => s.id === pickingState.subtitleId);
    if (subtitle) {
      if (pickingState.type === "initial") {
        handleUpdateSubtitle(pickingState.subtitleId, {
          position: { x: actualX, y: actualY },
        });
      } else {
        handleUpdateSubtitle(pickingState.subtitleId, {
          scale: {
            ...subtitle.scale,
            position: { x: actualX, y: actualY },
          },
        });
      }
    }

    // 退出点选模式
    setPickingState(null);
  };

  const durationInFrames = config.videoDuration > 0
    ? Math.ceil(config.videoDuration * 30)
    : 30 * 8;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* 头部 */}
        <header className="mb-8 flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-black text-neutral-100">
              📋 看板
            </h1>
            <p className="text-neutral-500">视频字幕编辑器</p>
          </div>
          <button
            onClick={onFinish}
            className="rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-2 font-semibold text-white transition-all hover:scale-105 active:scale-95"
          >
            完成
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左侧控制面板 */}
          <div className="lg:col-span-1 space-y-6">
            {/* 视频上传 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-bold text-neutral-200">
                视频导入
              </h2>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4"
                onChange={handleVideoUpload}
                className="hidden"
              />
              <button
                onClick={() => videoInputRef.current?.click()}
                disabled={isUploading}
                className="w-full rounded-lg border border-cyan-500/30 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-4 py-3 font-semibold text-cyan-300 transition-all hover:border-cyan-500/50 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center justify-center gap-2">
                  {isUploading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      上传中...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      {config.videoId ? "重新上传 MP4" : "上传 MP4 视频"}
                    </>
                  )}
                </div>
              </button>
              {config.videoId && (
                <div className="mt-3 space-y-1 text-sm text-neutral-400">
                  {config.videoFileName && (
                    <div className="truncate" title={config.videoFileName}>
                      文件: {config.videoFileName}
                    </div>
                  )}
                  <div>时长: {config.videoDuration.toFixed(2)} 秒</div>
                  {config.videoSize && (
                    <div>大小: {(config.videoSize / (1024 * 1024)).toFixed(2)} MB</div>
                  )}
                </div>
              )}
            </section>

            {/* 分辨率选择（可折叠） */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => setResolutionExpanded(!resolutionExpanded)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-neutral-800/30 transition-colors"
              >
                <h2 className="text-lg font-bold text-neutral-200">分辨率</h2>
                <svg
                  className={`h-5 w-5 text-neutral-400 transition-transform ${resolutionExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {resolutionExpanded && (
                <div className="px-6 pb-6 space-y-2">
                  {resolutionOptions.map((res) => (
                    <button
                      key={res.id}
                      onClick={() => handleResolutionChange(res.id)}
                      className={`w-full rounded-lg border px-4 py-3 text-left transition-all ${
                        config.resolution.id === res.id
                          ? "border-purple-500 bg-purple-500/20 text-purple-300"
                          : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600"
                      }`}
                    >
                      {res.label}
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* 字幕设定（可折叠） */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 backdrop-blur-sm overflow-hidden">
              <button
                onClick={() => setSubtitlesExpanded(!subtitlesExpanded)}
                className="w-full p-6 text-left flex items-center justify-between hover:bg-neutral-800/30 transition-colors"
              >
                <div>
                  <h2 className="text-lg font-bold text-neutral-200">字幕设定</h2>
                  <p className="text-sm text-neutral-500 mt-1">
                    共 {config.subtitles.length} 条字幕
                  </p>
                </div>
                <svg
                  className={`h-5 w-5 text-neutral-400 transition-transform ${subtitlesExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {subtitlesExpanded && (
                <div className="px-6 pb-6 space-y-4">
                  {/* 添加字幕按钮 */}
                  <button
                    onClick={handleAddSubtitle}
                    className="w-full rounded-lg border border-dashed border-neutral-600 bg-neutral-800/30 px-4 py-3 font-semibold text-neutral-400 transition-all hover:border-neutral-500 hover:bg-neutral-800/50 hover:text-neutral-300"
                  >
                    + 添加字幕
                  </button>

                  {/* 字幕列表 */}
                  {config.subtitles.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      暂无字幕，点击上方按钮添加
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {config.subtitles.map((subtitle, index) => (
                        <div
                          key={subtitle.id}
                          className="rounded-lg border border-neutral-700 bg-neutral-800/50 overflow-hidden"
                        >
                          {/* 字幕标题栏 */}
                          <button
                            onClick={() =>
                              setExpandedSubtitleId(
                                expandedSubtitleId === subtitle.id ? null : subtitle.id
                              )
                            }
                            className="w-full p-3 text-left flex items-center justify-between hover:bg-neutral-700/30 transition-colors"
                          >
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-neutral-200 truncate">
                                字幕 {index + 1}: {subtitle.text}
                              </div>
                              <div className="text-xs text-neutral-500 mt-1">
                                {subtitle.enterTime.toFixed(2)}s
                                {subtitle.exitTime > 0 ? ` - ${subtitle.exitTime.toFixed(2)}s` : " - 结束"}
                              </div>
                            </div>
                            <svg
                              className={`h-4 w-4 text-neutral-400 transition-transform ml-2 flex-shrink-0 ${
                                expandedSubtitleId === subtitle.id ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {/* 字幕配置面板 */}
                          {expandedSubtitleId === subtitle.id && (
                            <SubtitleConfigPanel
                              subtitle={subtitle}
                              onUpdate={(updates) => handleUpdateSubtitle(subtitle.id, updates)}
                              onDelete={() => handleDeleteSubtitle(subtitle.id)}
                              onGetCurrentTime={getCurrentTime}
                              onStartPickingPosition={handleStartPickingPosition}
                              isPickingPosition={
                                pickingState?.subtitleId === subtitle.id
                              }
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* 右侧预览 */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-neutral-200">
                  预览
                </h2>
                {pickingState && (
                  <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <svg className="h-4 w-4 text-cyan-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
                    </svg>
                    <span className="text-xs font-medium text-cyan-300">
                      点击画面选择坐标
                    </span>
                  </div>
                )}
              </div>
              <div
                ref={videoContainerRef}
                className={`relative overflow-hidden rounded-lg bg-black ${
                  pickingState ? "cursor-crosshair ring-2 ring-cyan-500 ring-opacity-50" : ""
                }`}
                onClick={pickingState ? handleVideoClick : undefined}
              >
                <Player
                  ref={playerRef}
                  key={`${config.videoId}-${config.resolution.id}`}
                  component={KanbanComposition}
                  inputProps={{
                    videoSrc: videoUrl,
                    compositionSize: {
                      width: config.resolution.width,
                      height: config.resolution.height,
                    },
                    subtitles: config.subtitles,
                  }}
                  durationInFrames={durationInFrames}
                  fps={30}
                  compositionWidth={config.resolution.width}
                  compositionHeight={config.resolution.height}
                  style={{
                    width: "100%",
                    aspectRatio: `${config.resolution.width} / ${config.resolution.height}`,
                    pointerEvents: pickingState ? "none" : "auto",
                  }}
                  controls={!pickingState}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

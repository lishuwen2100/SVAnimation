// Kanban 模块配置编辑器

import { useRef, useState, useEffect } from "react";
import type { KanbanConfig } from "@/types/workflow";
import { Player } from "@remotion/player";
import { KanbanComposition } from "./KanbanComposition";
import { saveVideo, getVideoUrl, deleteVideo } from "@/utils/videoStorage";

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
  const [isUploading, setIsUploading] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const previousVideoIdRef = useRef<string | null>(null);

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
      // 清理 Blob URL
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
      // 创建临时 URL 获取视频时长
      const tempUrl = URL.createObjectURL(file);
      const videoElement = document.createElement("video");
      videoElement.src = tempUrl;

      videoElement.onloadedmetadata = async () => {
        const duration = videoElement.duration;
        URL.revokeObjectURL(tempUrl); // 释放临时 URL

        try {
          // 删除旧视频
          if (previousVideoIdRef.current) {
            await deleteVideo(previousVideoIdRef.current).catch(console.error);
          }

          // 保存新视频到 IndexedDB
          const videoId = await saveVideo(file, file.name, duration);
          previousVideoIdRef.current = videoId;

          // 更新配置
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
            <p className="text-neutral-500">导入并播放 MP4 视频文件</p>
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
                      <svg
                        className="h-5 w-5 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      上传中...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
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
                    <div>
                      大小: {(config.videoSize / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 分辨率选择 */}
            <section className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-bold text-neutral-200">
                分辨率
              </h2>
              <div className="space-y-2">
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
            </section>
          </div>

          {/* 右侧预览 */}
          <div className="lg:col-span-2">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 backdrop-blur-sm">
              <h2 className="mb-4 text-lg font-bold text-neutral-200">
                预览
              </h2>
              <div className="relative overflow-hidden rounded-lg bg-black">
                <Player
                  key={`${config.videoId}-${config.resolution.id}`}
                  component={KanbanComposition}
                  inputProps={{
                    videoSrc: videoUrl,
                    compositionSize: {
                      width: config.resolution.width,
                      height: config.resolution.height,
                    },
                  }}
                  durationInFrames={durationInFrames}
                  fps={30}
                  compositionWidth={config.resolution.width}
                  compositionHeight={config.resolution.height}
                  style={{
                    width: "100%",
                    aspectRatio: `${config.resolution.width} / ${config.resolution.height}`,
                  }}
                  controls
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

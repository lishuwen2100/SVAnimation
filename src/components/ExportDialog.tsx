// 导出对话框组件

import { useState, useMemo } from "react";
import type { Workflow, NodeTimelineEntry } from "@/types/workflow";
import {
  generateExportCommand,
  downloadWorkflowJson,
  exportVideosForRendering,
  downloadVideo,
  prepareWorkflowForRender,
  copyToClipboard,
  type ExportOptions,
  type VideoInfo,
} from "@/utils/exportHelpers";

export interface ExportDialogProps {
  workflow: Workflow;
  timeline: NodeTimelineEntry[];
  onClose: () => void;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  workflow,
  timeline,
  onClose,
}) => {
  const [options, setOptions] = useState<ExportOptions>({
    width: 1920,
    height: 1080,
    fps: 30,
    outputName: "output.mp4",
  });

  const [muted, setMuted] = useState(false);

  const [exportCommand, setExportCommand] = useState<string>("");
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  // 分辨率预设
  const resolutionPresets = [
    { label: "1080p (1920×1080)", width: 1920, height: 1080 },
    { label: "720p (1280×720)", width: 1280, height: 720 },
    { label: "竖屏 (1080×1920)", width: 1080, height: 1920 },
  ];

  // 计算总时长
  const totalDuration = useMemo(() => {
    if (timeline.length === 0) return 0;
    return timeline[timeline.length - 1].endFrame / options.fps;
  }, [timeline, options.fps]);

  // 生成导出配置
  const handleGenerate = async () => {
    setIsExporting(true);

    try {
      // 1. 导出所有视频
      const exportedVideos = await exportVideosForRendering(workflow);
      setVideos(exportedVideos);

      // 2. 构建视频路径映射
      const videoPathMap: Record<string, string> = {};
      exportedVideos.forEach((video) => {
        videoPathMap[video.id] = `./videos/${video.fileName}`;
      });

      // 3. 准备工作流配置
      const preparedWorkflow = prepareWorkflowForRender(workflow, videoPathMap);

      // 4. 下载工作流 JSON
      const jsonFileName = `${workflow.name}-export.json`;
      downloadWorkflowJson(preparedWorkflow, options, jsonFileName);

      // 5. 生成命令
      let command = generateExportCommand(workflow.name, options);
      if (muted) {
        command += " -- --muted";
      }
      setExportCommand(command);
    } catch (error) {
      console.error("Export preparation failed:", error);
      alert("生成导出配置失败，请检查控制台");
    } finally {
      setIsExporting(false);
    }
  };

  // 下载视频文件
  const handleDownloadVideo = (video: VideoInfo) => {
    downloadVideo(video);
  };

  // 下载所有视频
  const handleDownloadAllVideos = () => {
    videos.forEach((video) => {
      setTimeout(() => downloadVideo(video), 100);
    });
  };

  // 复制命令
  const handleCopyCommand = async () => {
    const success = await copyToClipboard(exportCommand);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      alert("复制失败，请手动复制");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-100">导出视频</h2>
            <p className="mt-1 text-sm text-neutral-400">
              工作流: {workflow.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="space-y-6 p-6">
          {/* 导出配置 */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-neutral-300">导出配置</h3>

            {/* 分辨率 */}
            <div>
              <label className="mb-2 block text-sm text-neutral-400">分辨率</label>
              <div className="grid grid-cols-3 gap-2">
                {resolutionPresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() =>
                      setOptions({ ...options, width: preset.width, height: preset.height })
                    }
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      options.width === preset.width && options.height === preset.height
                        ? "border-purple-500 bg-purple-500/20 text-purple-300"
                        : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 帧率 */}
            <div>
              <label className="mb-2 block text-sm text-neutral-400">帧率 (FPS)</label>
              <div className="flex gap-2">
                {[30, 60].map((fps) => (
                  <button
                    key={fps}
                    onClick={() => setOptions({ ...options, fps })}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-all ${
                      options.fps === fps
                        ? "border-cyan-500 bg-cyan-500/20 text-cyan-300"
                        : "border-neutral-700 bg-neutral-800/50 text-neutral-400 hover:border-neutral-600"
                    }`}
                  >
                    {fps} FPS
                  </button>
                ))}
              </div>
            </div>

            {/* 输出文件名 */}
            <div>
              <label className="mb-2 block text-sm text-neutral-400">输出文件名</label>
              <input
                type="text"
                value={options.outputName}
                onChange={(e) => setOptions({ ...options, outputName: e.target.value })}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800 px-3 py-2 text-sm text-neutral-100 focus:border-purple-500 focus:outline-none"
                placeholder="output.mp4"
              />
            </div>

            {/* 静音选项 */}
            <div>
              <label className="flex items-center gap-2 text-sm text-neutral-400">
                <input
                  type="checkbox"
                  checked={muted}
                  onChange={(e) => setMuted(e.target.checked)}
                  className="rounded border-neutral-700 bg-neutral-800 text-purple-500 focus:ring-purple-500"
                />
                <span>静音导出（推荐 macOS 15 以下用户使用）</span>
              </label>
              {muted && (
                <p className="mt-1 text-xs text-yellow-400">
                  💡 将生成无音频的视频，可后期使用视频编辑软件添加音频
                </p>
              )}
            </div>

            {/* 统计信息 */}
            <div className="rounded-lg border border-neutral-800 bg-neutral-800/30 p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-neutral-500">节点数量:</span>
                  <span className="ml-2 font-medium text-neutral-300">{timeline.length}</span>
                </div>
                <div>
                  <span className="text-neutral-500">总时长:</span>
                  <span className="ml-2 font-medium text-neutral-300">
                    {totalDuration.toFixed(1)}s
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">分辨率:</span>
                  <span className="ml-2 font-medium text-neutral-300">
                    {options.width}×{options.height}
                  </span>
                </div>
                <div>
                  <span className="text-neutral-500">预计渲染时间:</span>
                  <span className="ml-2 font-medium text-neutral-300">
                    {(totalDuration * 0.5).toFixed(0)}-{(totalDuration * 1.5).toFixed(0)}分钟
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 生成按钮 */}
          {!exportCommand && (
            <button
              onClick={handleGenerate}
              disabled={isExporting}
              className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3 font-medium text-white transition-all hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
            >
              {isExporting ? "生成中..." : "生成导出配置"}
            </button>
          )}

          {/* 导出步骤说明 */}
          {exportCommand && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-neutral-300">导出步骤</h3>

              {/* 步骤 1: 下载配置文件 */}
              <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-sm font-bold text-white">
                    ✓
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-green-300">步骤 1: 配置文件已下载</h4>
                    <p className="mt-1 text-sm text-green-200/80">
                      {workflow.name}-export.json 已自动下载
                    </p>
                  </div>
                </div>
              </div>

              {/* 步骤 2: 下载视频文件 */}
              {videos.length > 0 && (
                <div className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-sm font-bold text-white">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-neutral-300">步骤 2: 下载视频文件</h4>
                      <p className="mt-1 text-sm text-neutral-400">
                        需要下载 {videos.length} 个视频文件
                      </p>
                      <div className="mt-3 space-y-2">
                        {videos.map((video) => (
                          <div
                            key={video.id}
                            className="flex items-center justify-between rounded border border-neutral-700 bg-neutral-800 px-3 py-2"
                          >
                            <span className="text-sm text-neutral-300">{video.fileName}</span>
                            <button
                              onClick={() => handleDownloadVideo(video)}
                              className="text-sm text-cyan-400 hover:text-cyan-300"
                            >
                              下载
                            </button>
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={handleDownloadAllVideos}
                        className="mt-3 w-full rounded-lg border border-cyan-500 bg-cyan-500/10 px-3 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20"
                      >
                        下载全部视频
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤 3: 放置视频文件 */}
              {videos.length > 0 && (
                <div className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-yellow-500 text-sm font-bold text-white">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-neutral-300">步骤 3: 放置视频文件</h4>
                      <p className="mt-1 text-sm text-neutral-400">
                        在项目根目录创建 <code className="rounded bg-neutral-700 px-1">videos/</code> 文件夹，
                        将下载的视频文件放入其中
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 步骤 4: 执行导出命令 */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-500 text-sm font-bold text-white">
                    {videos.length > 0 ? "4" : "2"}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-neutral-300">
                      步骤 {videos.length > 0 ? "4" : "2"}: 执行导出命令
                    </h4>
                    <p className="mt-1 text-sm text-neutral-400">在项目根目录的终端执行以下命令</p>
                    <div className="mt-3 rounded-lg border border-neutral-700 bg-neutral-900 p-3">
                      <code className="text-sm text-purple-300">{exportCommand}</code>
                    </div>
                    <button
                      onClick={handleCopyCommand}
                      className="mt-3 w-full rounded-lg border border-purple-500 bg-purple-500/10 px-3 py-2 text-sm font-medium text-purple-300 hover:bg-purple-500/20"
                    >
                      {copied ? "✓ 已复制" : "复制命令"}
                    </button>
                  </div>
                </div>
              </div>

              {/* 提示 */}
              <div className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4">
                <h4 className="text-sm font-medium text-neutral-300">💡 提示</h4>
                <ul className="mt-2 space-y-1 text-sm text-neutral-400">
                  <li>• 渲染时间取决于视频长度和电脑性能</li>
                  <li>• 5-10 分钟的视频可能需要 5-15 分钟渲染</li>
                  <li>• 渲染过程中可以看到实时进度</li>
                  <li>• 渲染完成后会在当前目录生成 {options.outputName}</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 工作流导入对话框

import { useState } from "react";
import type { WorkflowImportResult, ExternalDependency } from "@/utils/workflowImportExport";
import { importWorkflowFromJson, uploadDependencyFile } from "@/utils/workflowImportExport";
import type { Workflow } from "@/types/workflow";

export interface ImportWorkflowDialogProps {
  onClose: () => void;
  onImportSuccess: (workflow: Workflow) => void;
}

export const ImportWorkflowDialog: React.FC<ImportWorkflowDialogProps> = ({
  onClose,
  onImportSuccess,
}) => {
  const [importResult, setImportResult] = useState<WorkflowImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [uploadingDeps, setUploadingDeps] = useState<Set<string>>(new Set());

  // 处理文件选择
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const jsonText = await file.text();
      const result = await importWorkflowFromJson(jsonText);
      setImportResult(result);

      if (result.success && result.missingDependencies.length === 0) {
        // 导入完全成功，直接回调
        onImportSuccess(result.workflow);
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert(`导入失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setIsImporting(false);
    }
  };

  // 上传缺失的依赖文件
  const handleDependencyUpload = async (
    dependency: ExternalDependency,
    file: File
  ) => {
    if (!importResult) return;

    const depId = dependency.id;
    setUploadingDeps((prev) => new Set(prev).add(depId));

    try {
      const result = await uploadDependencyFile(
        importResult.workflow,
        dependency,
        file
      );

      if (result.success) {
        // 更新依赖状态
        const updatedDeps = importResult.missingDependencies.filter(
          (dep) => dep.id !== depId
        );
        setImportResult({
          ...importResult,
          missingDependencies: updatedDeps,
          success: updatedDeps.length === 0,
          message:
            updatedDeps.length === 0
              ? "所有依赖已上传完成"
              : `还有 ${updatedDeps.length} 个依赖需要上传`,
        });

        // 如果所有依赖都已上传，触发成功回调
        if (updatedDeps.length === 0) {
          onImportSuccess(importResult.workflow);
        }
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      alert(`上传失败: ${error instanceof Error ? error.message : "未知错误"}`);
    } finally {
      setUploadingDeps((prev) => {
        const next = new Set(prev);
        next.delete(depId);
        return next;
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl">
        {/* 头部 */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-800 bg-neutral-900 px-6 py-4">
          <h2 className="text-lg font-bold text-neutral-100">导入工作流</h2>
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
          {!importResult && (
            <div className="space-y-4">
              <p className="text-sm text-neutral-400">
                选择一个工作流 JSON 文件进行导入
              </p>

              <label className="flex cursor-pointer flex-col items-center gap-4 rounded-lg border-2 border-dashed border-neutral-700 bg-neutral-800/30 p-8 transition-colors hover:border-cyan-500 hover:bg-neutral-800/50">
                <div className="text-5xl">📂</div>
                <div className="text-center">
                  <p className="font-medium text-neutral-300">
                    点击选择文件或拖拽到此处
                  </p>
                  <p className="mt-1 text-sm text-neutral-500">
                    支持 .json 格式的工作流文件
                  </p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileSelect}
                  disabled={isImporting}
                  className="hidden"
                />
              </label>

              {isImporting && (
                <div className="text-center text-sm text-cyan-400">
                  正在导入工作流...
                </div>
              )}
            </div>
          )}

          {importResult && (
            <div className="space-y-4">
              {/* 导入结果状态 */}
              <div
                className={`rounded-lg border p-4 ${
                  importResult.success
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-yellow-500/30 bg-yellow-500/10"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl">
                    {importResult.success ? "✅" : "⚠️"}
                  </div>
                  <div className="flex-1">
                    <h3
                      className={`font-medium ${
                        importResult.success ? "text-green-300" : "text-yellow-300"
                      }`}
                    >
                      {importResult.message}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-400">
                      工作流: {importResult.workflow.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* 缺失的依赖列表 */}
              {importResult.missingDependencies.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-neutral-300">
                    需要上传的外部依赖文件 ({importResult.missingDependencies.length})
                  </h3>

                  {importResult.missingDependencies.map((dep) => (
                    <div
                      key={dep.id}
                      className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4"
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">
                              {dep.type === "video" ? "🎬" : "🎵"}
                            </span>
                            <span className="font-medium text-neutral-300">
                              {dep.fileName}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-neutral-500">
                            节点: {dep.nodeName}
                          </p>
                          {dep.duration && (
                            <p className="text-xs text-neutral-600">
                              时长: {dep.duration.toFixed(1)}s
                            </p>
                          )}
                        </div>
                      </div>

                      <label
                        className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-cyan-500 px-3 py-2 text-sm font-medium text-cyan-300 transition-all hover:bg-cyan-500/10 ${
                          uploadingDeps.has(dep.id) ? "opacity-50" : ""
                        }`}
                      >
                        {uploadingDeps.has(dep.id) ? (
                          <>⏳ 上传中...</>
                        ) : (
                          <>
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                              />
                            </svg>
                            <span>选择文件上传</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept={
                            dep.type === "video"
                              ? "video/*"
                              : "audio/*"
                          }
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleDependencyUpload(dep, file);
                            }
                          }}
                          disabled={uploadingDeps.has(dep.id)}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ))}

                  <div className="rounded-lg border border-neutral-700 bg-neutral-800/30 p-4">
                    <h4 className="text-sm font-medium text-neutral-300">💡 提示</h4>
                    <ul className="mt-2 space-y-1 text-sm text-neutral-400">
                      <li>• 请上传与原工作流相同的视频和音频文件</li>
                      <li>• 文件会自动关联到对应的节点</li>
                      <li>• 上传完所有依赖后，工作流将自动完成导入</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* 完成按钮 */}
              {importResult.success && importResult.missingDependencies.length === 0 && (
                <button
                  onClick={onClose}
                  className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-4 py-3 font-medium text-white transition-all hover:from-green-600 hover:to-emerald-600"
                >
                  完成导入
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

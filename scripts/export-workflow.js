#!/usr/bin/env node

/**
 * SVAnimation 视频导出脚本
 *
 * 使用方法:
 *   node scripts/export-workflow.js <workflow.json> [output.mp4] [options]
 *
 * 示例:
 *   node scripts/export-workflow.js workflow-export.json output.mp4
 *   node scripts/export-workflow.js workflow-export.json output.mp4 --width=1920 --height=1080 --fps=60
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 解析命令行参数
const args = process.argv.slice(2);
const workflowJsonPath = args[0];
const outputPath = args[1] || 'output.mp4';

// 提取其他选项
const options = {};
args.slice(2).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value;
  }
});

// 显示帮助信息
if (!workflowJsonPath || workflowJsonPath === '--help' || workflowJsonPath === '-h') {
  console.log('');
  console.log('📹 SVAnimation 视频导出工具');
  console.log('');
  console.log('使用方法:');
  console.log('  node scripts/export-workflow.js <workflow.json> [output.mp4] [options]');
  console.log('');
  console.log('参数:');
  console.log('  workflow.json  工作流配置文件（必需）');
  console.log('  output.mp4     输出文件名（可选，默认 output.mp4）');
  console.log('');
  console.log('选项:');
  console.log('  --width=<数字>   视频宽度（默认：1920）');
  console.log('  --height=<数字>  视频高度（默认：1080）');
  console.log('  --fps=<数字>     帧率（默认：30）');
  console.log('');
  console.log('示例:');
  console.log('  node scripts/export-workflow.js workflow-export.json output.mp4');
  console.log('  node scripts/export-workflow.js workflow-export.json video.mp4 --fps=60');
  console.log('  node scripts/export-workflow.js workflow-export.json hd.mp4 --width=1280 --height=720');
  console.log('');
  process.exit(0);
}

// 验证工作流文件
if (!fs.existsSync(workflowJsonPath)) {
  console.error(`❌ 错误: 工作流文件不存在: ${workflowJsonPath}`);
  console.error('');
  console.error('提示: 使用 --help 查看使用方法');
  process.exit(1);
}

// 读取工作流配置
let workflowData;
try {
  const content = fs.readFileSync(workflowJsonPath, 'utf-8');
  workflowData = JSON.parse(content);
} catch (error) {
  console.error(`❌ 错误: 无法解析工作流文件: ${error.message}`);
  process.exit(1);
}

console.log('');
console.log('📹 SVAnimation 视频导出');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`📁 工作流文件: ${workflowJsonPath}`);
console.log(`💾 输出文件: ${outputPath}`);
console.log(`🎬 工作流名称: ${workflowData.workflow?.name || '未命名'}`);
console.log(`📊 节点数量: ${workflowData.workflow?.nodes?.length || 0}`);

// 构建渲染命令
const width = options.width || workflowData.width || 1920;
const height = options.height || workflowData.height || 1080;
const fps = options.fps || workflowData.fps || 30;

console.log(`📐 分辨率: ${width}x${height}`);
console.log(`⚡ 帧率: ${fps} FPS`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('');
console.log('⏳ 开始渲染...');
console.log('');

// 构建 props JSON
const propsData = JSON.stringify({
  workflow: workflowData.workflow,
  fps: parseInt(fps),
  width: parseInt(width),
  height: parseInt(height)
});

// 构建额外的 Remotion 选项
const remotionOptions = [];
if (options.muted !== undefined) {
  remotionOptions.push('--muted');
}

// 调用 Remotion CLI
const renderCommand = `npx remotion render src/render/RenderEntry.tsx workflow-output "${outputPath}" --props='${propsData}' ${remotionOptions.join(' ')}`;

try {
  execSync(renderCommand, { stdio: 'inherit' });
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ 导出完成！');
  console.log(`📹 视频文件: ${path.resolve(outputPath)}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
} catch (error) {
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('❌ 导出失败');
  console.log(`错误信息: ${error.message}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  process.exit(1);
}

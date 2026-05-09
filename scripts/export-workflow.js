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

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

// 验证参数
if (!workflowJsonPath) {
  console.error('❌ 错误: 缺少工作流配置文件参数');
  console.error('');
  console.error('使用方法:');
  console.error('  node scripts/export-workflow.js <workflow.json> [output.mp4]');
  console.error('');
  console.error('示例:');
  console.error('  node scripts/export-workflow.js workflow-export.json output.mp4');
  console.error('  node scripts/export-workflow.js workflow-export.json video.mp4 --fps=60');
  process.exit(1);
}

// 验证工作流文件
if (!fs.existsSync(workflowJsonPath)) {
  console.error(`❌ 错误: 工作流文件不存在: ${workflowJsonPath}`);
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

// 调用 Remotion CLI
const renderCommand = `npx remotion render src/render/RenderEntry.tsx workflow-output "${outputPath}" --props='${propsData}'`;

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

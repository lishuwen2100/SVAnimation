import { Config } from "@remotion/cli/config";
import path from "path";
import { fileURLToPath } from "url";

// ES 模块中获取 __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 设置视频帧格式为 JPEG（性能更好）
Config.setVideoImageFormat("jpeg");

// 允许覆盖已存在的输出文件
Config.setOverwriteOutput(true);

// 设置默认编解码器
Config.setCodec("h264");

// 配置 Webpack 别名（解决 @/ 路径）
Config.overrideWebpackConfig((config) => {
  return {
    ...config,
    resolve: {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});

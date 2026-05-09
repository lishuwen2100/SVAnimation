import { Config } from "@remotion/cli/config";
import { resolve } from "path";

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
        "@": resolve(process.cwd(), "src"),
      },
    },
  };
});

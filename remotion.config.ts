import { Config } from "@remotion/cli/config";

// 设置视频帧格式为 JPEG（性能更好）
Config.setVideoImageFormat("jpeg");

// 允许覆盖已存在的输出文件
Config.setOverwriteOutput(true);

// 设置默认编解码器
Config.setCodec("h264");

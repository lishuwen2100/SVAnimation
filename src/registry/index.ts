// 模块注册初始化

import { registerModule } from "./moduleRegistry";
import { duckSubtitleModule } from "./modules/duckSubtitle";

// 注册所有模块
export function initializeModules() {
  registerModule(duckSubtitleModule);
}

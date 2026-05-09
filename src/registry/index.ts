// 模块注册初始化

import { registerModule } from "./moduleRegistry";
import { duckSubtitleModule } from "./modules/duckSubtitle";
import { kanbanModule } from "./modules/kanban";

// 注册所有模块
export function initializeModules() {
  registerModule(duckSubtitleModule);
  registerModule(kanbanModule);
}

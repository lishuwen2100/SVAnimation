// 模块注册系统

import type { ModuleDefinition, ModuleType } from "@/types/workflow";

/**
 * 全局模块注册表
 */
const moduleRegistry = new Map<ModuleType, ModuleDefinition>();

/**
 * 注册模块
 * @param definition 模块定义
 */
export const registerModule = (definition: ModuleDefinition): void => {
  moduleRegistry.set(definition.type, definition);
};

/**
 * 获取模块定义
 * @param type 模块类型
 * @returns 模块定义
 * @throws 如果模块未注册
 */
export const getModule = (type: ModuleType): ModuleDefinition => {
  const module = moduleRegistry.get(type);
  if (!module) {
    throw new Error(`Module "${type}" is not registered`);
  }
  return module;
};

/**
 * 获取所有已注册的模块
 * @returns 模块定义数组
 */
export const getAllModules = (): ModuleDefinition[] => {
  return Array.from(moduleRegistry.values());
};

/**
 * 检查模块是否已注册
 * @param type 模块类型
 * @returns 是否已注册
 */
export const hasModule = (type: ModuleType): boolean => {
  return moduleRegistry.has(type);
};

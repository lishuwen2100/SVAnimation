// 工作流状态管理 Context

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Workflow, WorkflowNode, ModuleType, NodeTimelineEntry } from "@/types/workflow";
import { getModule } from "@/registry/moduleRegistry";

/**
 * 生成 UUID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

/**
 * WorkflowContext 值类型
 */
interface WorkflowContextValue {
  // 工作流列表
  workflows: Workflow[];
  currentWorkflowId: string | null;
  currentWorkflow: Workflow | null;

  // 工作流操作
  createWorkflow: (name: string) => string;
  deleteWorkflow: (id: string) => void;
  selectWorkflow: (id: string) => void;
  renameWorkflow: (id: string, name: string) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;

  // 节点操作
  addNode: (type: ModuleType, name: string) => string;
  deleteNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<WorkflowNode>) => void;
  reorderNodes: (nodeIds: string[]) => void;

  // 计算时间轴
  computeTimeline: (fps: number) => NodeTimelineEntry[];
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null);

/**
 * localStorage 键名
 */
const STORAGE_KEY = "svanimation-workflows";
const CURRENT_WORKFLOW_KEY = "svanimation-current-workflow";

/**
 * 从 localStorage 加载数据
 */
const loadFromStorage = (): { workflows: Workflow[]; currentWorkflowId: string | null } => {
  try {
    const workflowsData = localStorage.getItem(STORAGE_KEY);
    const currentId = localStorage.getItem(CURRENT_WORKFLOW_KEY);

    return {
      workflows: workflowsData ? JSON.parse(workflowsData) : [],
      currentWorkflowId: currentId || null,
    };
  } catch (error) {
    console.error("Failed to load workflows from localStorage:", error);
    return { workflows: [], currentWorkflowId: null };
  }
};

/**
 * 保存到 localStorage
 */
const saveToStorage = (workflows: Workflow[], currentWorkflowId: string | null): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(workflows));
    if (currentWorkflowId) {
      localStorage.setItem(CURRENT_WORKFLOW_KEY, currentWorkflowId);
    } else {
      localStorage.removeItem(CURRENT_WORKFLOW_KEY);
    }
  } catch (error) {
    console.error("Failed to save workflows to localStorage:", error);
  }
};

/**
 * WorkflowProvider 组件
 */
export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [currentWorkflowId, setCurrentWorkflowId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 初始化：从 localStorage 加载
  useEffect(() => {
    const { workflows: loadedWorkflows, currentWorkflowId: loadedId } = loadFromStorage();
    setWorkflows(loadedWorkflows);
    setCurrentWorkflowId(loadedId);
    setIsInitialized(true);
  }, []);

  // 自动保存：每次状态变化时同步到 localStorage（跳过初始化阶段）
  useEffect(() => {
    if (!isInitialized) return;
    saveToStorage(workflows, currentWorkflowId);
  }, [workflows, currentWorkflowId, isInitialized]);

  /**
   * 创建工作流
   */
  const createWorkflow = useCallback((name: string): string => {
    const id = generateId();
    const now = Date.now();

    const newWorkflow: Workflow = {
      id,
      name,
      nodes: [],
      createdAt: now,
      updatedAt: now,
    };

    setWorkflows((prev) => [...prev, newWorkflow]);
    setCurrentWorkflowId(id);

    return id;
  }, []);

  /**
   * 删除工作流
   */
  const deleteWorkflow = useCallback((id: string): void => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));

    // 如果删除的是当前工作流，清空选择
    if (currentWorkflowId === id) {
      setCurrentWorkflowId(null);
    }
  }, [currentWorkflowId]);

  /**
   * 选择工作流
   */
  const selectWorkflow = useCallback((id: string): void => {
    setCurrentWorkflowId(id);
  }, []);

  /**
   * 重命名工作流
   */
  const renameWorkflow = useCallback((id: string, name: string): void => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, name, updatedAt: Date.now() }
          : w
      )
    );
  }, []);

  /**
   * 更新工作流
   */
  const updateWorkflow = useCallback((id: string, updates: Partial<Workflow>): void => {
    setWorkflows((prev) =>
      prev.map((w) =>
        w.id === id
          ? { ...w, ...updates, updatedAt: Date.now() }
          : w
      )
    );
  }, []);

  /**
   * 添加节点
   */
  const addNode = useCallback((type: ModuleType, name: string): string => {
    if (!currentWorkflowId) {
      throw new Error("No workflow selected");
    }

    const nodeId = generateId();
    const now = Date.now();
    const module = getModule(type);

    const newNode: WorkflowNode = {
      id: nodeId,
      type,
      name,
      order: 0, // 将在下面重新计算
      enabled: true,
      config: module.getDefaultConfig(),
      createdAt: now,
      updatedAt: now,
    };

    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== currentWorkflowId) return w;

        // 计算新节点的 order（最大值 + 1）
        const maxOrder = w.nodes.reduce((max, node) => Math.max(max, node.order), -1);
        newNode.order = maxOrder + 1;

        return {
          ...w,
          nodes: [...w.nodes, newNode],
          updatedAt: now,
        };
      })
    );

    return nodeId;
  }, [currentWorkflowId]);

  /**
   * 删除节点
   */
  const deleteNode = useCallback((nodeId: string): void => {
    if (!currentWorkflowId) return;

    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== currentWorkflowId) return w;

        return {
          ...w,
          nodes: w.nodes.filter((n) => n.id !== nodeId),
          updatedAt: Date.now(),
        };
      })
    );
  }, [currentWorkflowId]);

  /**
   * 更新节点
   */
  const updateNode = useCallback((nodeId: string, updates: Partial<WorkflowNode>): void => {
    if (!currentWorkflowId) return;

    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== currentWorkflowId) return w;

        return {
          ...w,
          nodes: w.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, ...updates, updatedAt: Date.now() }
              : n
          ),
          updatedAt: Date.now(),
        };
      })
    );
  }, [currentWorkflowId]);

  /**
   * 重新排序节点
   */
  const reorderNodes = useCallback((nodeIds: string[]): void => {
    if (!currentWorkflowId) return;

    setWorkflows((prev) =>
      prev.map((w) => {
        if (w.id !== currentWorkflowId) return w;

        // 创建 ID 到新 order 的映射
        const orderMap = new Map(nodeIds.map((id, index) => [id, index]));

        return {
          ...w,
          nodes: w.nodes.map((n) => ({
            ...n,
            order: orderMap.get(n.id) ?? n.order,
          })),
          updatedAt: Date.now(),
        };
      })
    );
  }, [currentWorkflowId]);

  /**
   * 计算时间轴
   */
  const computeTimeline = useCallback((fps: number): NodeTimelineEntry[] => {
    if (!currentWorkflowId) return [];

    const workflow = workflows.find((w) => w.id === currentWorkflowId);
    if (!workflow) return [];

    // 筛选启用的节点并按 order 排序
    const enabledNodes = workflow.nodes
      .filter((n) => n.enabled)
      .sort((a, b) => a.order - b.order);

    const timeline: NodeTimelineEntry[] = [];
    let currentFrame = 0;

    for (const node of enabledNodes) {
      try {
        const module = getModule(node.type);
        const duration = module.getDuration(node.config, fps);

        timeline.push({
          nodeId: node.id,
          startFrame: currentFrame,
          endFrame: currentFrame + duration,
          composition: module.CompositionComponent,
          inputProps: module.convertConfigToProps(node.config),
        });

        currentFrame += duration;
      } catch (error) {
        console.error(`Failed to compute timeline for node ${node.id}:`, error);
      }
    }

    return timeline;
  }, [currentWorkflowId, workflows]);

  // 获取当前工作流
  const currentWorkflow = workflows.find((w) => w.id === currentWorkflowId) || null;

  const value: WorkflowContextValue = {
    workflows,
    currentWorkflowId,
    currentWorkflow,
    createWorkflow,
    deleteWorkflow,
    selectWorkflow,
    renameWorkflow,
    updateWorkflow,
    addNode,
    deleteNode,
    updateNode,
    reorderNodes,
    computeTimeline,
  };

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>;
};

/**
 * useWorkflow Hook
 */
export const useWorkflow = (): WorkflowContextValue => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error("useWorkflow must be used within WorkflowProvider");
  }
  return context;
};

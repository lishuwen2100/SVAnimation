import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./styles/fonts.css";
import App from "./App";
import { WorkflowProvider } from "./contexts/WorkflowContext";
import { initializeModules } from "./registry";

// 初始化模块注册
initializeModules();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorkflowProvider>
      <App />
    </WorkflowProvider>
  </StrictMode>
);

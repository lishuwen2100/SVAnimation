import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { WorkflowProvider } from "./contexts/WorkflowContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorkflowProvider>
      <App />
    </WorkflowProvider>
  </StrictMode>
);

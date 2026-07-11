import React from "react";
import { createRoot } from "react-dom/client";
import { DevToolsWorkbench } from "../../app/dev-tools-workbench";
import { normalizeToolId, type ToolId } from "../../app/tools";
import "../../app/globals.css";

const params = new URLSearchParams(window.location.search);
const initialTool = normalizeToolId(params.get("tool"));

function updateToolUrl(toolId: ToolId) {
  const url = new URL(window.location.href);
  url.searchParams.set("tool", toolId);
  window.history.replaceState(null, "", url);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevToolsWorkbench initialTool={initialTool} onToolChange={updateToolUrl} />
  </React.StrictMode>,
);

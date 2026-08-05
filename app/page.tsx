"use client";

import { useCallback, useEffect, useState } from "react";
import { DevToolsWorkbench } from "./dev-tools-workbench";
import { PwaClient } from "./pwa-client";
import { DEFAULT_TOOL_ID, normalizeToolId, type ToolId } from "./tools";

export default function Home() {
  const [toolId, setToolId] = useState<ToolId>(DEFAULT_TOOL_ID);

  useEffect(() => {
    const syncFromUrl = () => setToolId(normalizeToolId(new URLSearchParams(window.location.search).get("tool")));
    syncFromUrl();
    window.addEventListener("popstate", syncFromUrl);
    return () => window.removeEventListener("popstate", syncFromUrl);
  }, []);

  const selectTool = useCallback((nextToolId: ToolId) => {
    setToolId(nextToolId);
    const url = new URL(window.location.href);
    url.searchParams.set("tool", nextToolId);
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  return <><DevToolsWorkbench initialTool={toolId} onToolChange={selectTool} /><PwaClient /></>;
}

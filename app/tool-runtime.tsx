"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { ToolId, ToolValueType } from "./tools";

export type ToolTransfer = {
  id: string;
  sourceToolId: ToolId | null;
  targetToolId: ToolId;
  value: string;
  valueType: ToolValueType;
};

export type ToolRuntimeValue = {
  incoming: ToolTransfer | null;
  sendToTool: (sourceToolId: ToolId | null, targetToolId: ToolId, value: string, valueType: ToolValueType) => void;
  consumeTransfer: (id: string) => void;
};

const ToolRuntimeContext = createContext<ToolRuntimeValue | null>(null);

export function ToolRuntimeProvider({ value, children }: { value: ToolRuntimeValue; children: ReactNode }) {
  return <ToolRuntimeContext.Provider value={value}>{children}</ToolRuntimeContext.Provider>;
}

export function useToolRuntime() {
  const runtime = useContext(ToolRuntimeContext);
  if (!runtime) throw new Error("ToolRuntimeProvider is missing");
  return runtime;
}

export function useIncomingToolValue(toolId: ToolId, onReceive: (transfer: ToolTransfer) => void) {
  const { incoming, consumeTransfer } = useToolRuntime();
  useEffect(() => {
    if (!incoming || incoming.targetToolId !== toolId) return;
    onReceive(incoming);
    consumeTransfer(incoming.id);
  }, [consumeTransfer, incoming, onReceive, toolId]);
}

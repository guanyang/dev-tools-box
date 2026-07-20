"use client";

import { useState } from "react";
import { getCompatibleTargets, type ToolId, type ToolValueType } from "../tools";
import { useToolRuntime } from "../tool-runtime";
import { CopyToast, useCopyText } from "./copy-feedback";

export function OutputActions({ sourceToolId, value, valueType, filename, downloadUrl }: {
  sourceToolId: ToolId;
  value: string;
  valueType: ToolValueType;
  filename: string;
  downloadUrl?: string;
}) {
  const targets = getCompatibleTargets(sourceToolId, valueType);
  const [target, setTarget] = useState<ToolId | "">(targets[0]?.id ?? "");
  const selectedTarget = targets.some((tool) => tool.id === target) ? target : targets[0]?.id ?? "";
  const { sendToTool } = useToolRuntime();
  const { copyStatus, copyText } = useCopyText();

  function download() {
    const url = downloadUrl ?? URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    if (!downloadUrl) URL.revokeObjectURL(url);
  }

  return <>
    <div className="output-actions" aria-label="结果操作">
      <button type="button" disabled={!value} onClick={() => copyText(value)}>复制</button>
      <button type="button" disabled={!value} onClick={download}>下载</button>
      <label>发送到
        <select value={selectedTarget} disabled={!value || targets.length === 0} onChange={(event) => setTarget(event.target.value as ToolId)}>
          {targets.map((tool) => <option value={tool.id} key={tool.id}>{tool.label}</option>)}
        </select>
      </label>
      <button type="button" disabled={!value || !selectedTarget} onClick={() => selectedTarget && sendToTool(sourceToolId, selectedTarget, value, valueType)}>打开</button>
    </div>
    <CopyToast status={copyStatus} />
  </>;
}

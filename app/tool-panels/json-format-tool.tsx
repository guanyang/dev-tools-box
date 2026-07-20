"use client";

import { useCallback, useRef, useState } from "react";
import { useIncomingToolValue } from "../tool-runtime";
import { runWorkerTask, shouldUseWorker } from "../worker-client";
import { JsonEditor, JsonHighlight } from "./json-editor";
import { OutputActions } from "./output-actions";

const sampleJson = `{"name":"devkit","features":["format","diff","password"],"active":true}`;

export default function JsonFormatTool() {
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [formattedJson, setFormattedJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const controller = useRef<AbortController | null>(null);
  useIncomingToolValue("json-format", useCallback((transfer) => setJsonInput(transfer.value), []));

  async function transform(space: number | undefined) {
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true);
    setProgress(0);
    try {
      setFormattedJson(await runWorkerTask({ type: "json-transform", input: jsonInput, space }, { signal: controller.current.signal, onProgress: setProgress }));
      setJsonError("");
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") return;
      setJsonError(caught instanceof Error ? caught.message : "JSON 处理失败");
      setFormattedJson("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel">
      <div className="action-bar">
        <button type="button" disabled={busy} onClick={() => void transform(2)}>格式化</button>
        <button type="button" disabled={busy} onClick={() => void transform(undefined)}>压缩</button>
        {busy && <button type="button" onClick={() => controller.current?.abort()}>取消任务</button>}
        <span className="task-status">{busy ? `Worker 处理中 ${progress}%` : shouldUseWorker(jsonInput) ? "大输入将由 Worker 处理" : ""}</span>
      </div>
      <div className="editor-grid">
        <div className="editor-block">
          <span>输入 JSON</span>
          <JsonEditor label="输入 JSON" value={jsonInput} onChange={setJsonInput} />
        </div>
        <div className="editor-block">
          <span>输出</span>
          {jsonError ? (
            <pre className="json-code-view error-output">{jsonError}</pre>
          ) : formattedJson ? (
            <JsonHighlight code={formattedJson} />
          ) : (
            <pre className="json-code-view empty-output">格式化或压缩后的结果将显示在这里</pre>
          )}
        </div>
      </div>
      <OutputActions sourceToolId="json-format" value={formattedJson} valueType="json" filename="formatted.json" />
    </section>
  );
}

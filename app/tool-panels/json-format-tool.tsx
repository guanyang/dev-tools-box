"use client";

import { useCallback, useRef, useState } from "react";
import { useIncomingToolValue } from "../tool-runtime";
import { runWorkerTask, shouldUseWorker } from "../worker-client";
import { ResizableSplit } from "./immersive-workspace";
import { JsonEditor, JsonHighlight } from "./json-editor";
import { OutputActions } from "./output-actions";

const sampleJson = `{"name":"devkit","features":["format","diff","password"],"active":true}`;

export default function JsonFormatTool() {
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [formattedJson, setFormattedJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [columnSplit, setColumnSplit] = useState(50);
  const [lineWrapping, setLineWrapping] = useState(true);
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
      setJsonError(caught instanceof Error && !caught.message.toLowerCase().includes("json")
        ? "JSON 处理失败，请稍后重试。"
        : "JSON 无法解析，请检查括号、引号和逗号是否完整。");
      setFormattedJson("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel immersive-tool json-format-workspace">
      <div className="immersive-toolbar">
        <div className="action-bar">
        <button type="button" disabled={busy} onClick={() => void transform(2)}>格式化</button>
        <button type="button" disabled={busy} onClick={() => void transform(undefined)}>压缩</button>
        {busy && <button type="button" onClick={() => controller.current?.abort()}>取消任务</button>}
        <span className="task-status">{busy ? `Worker 处理中 ${progress}%` : shouldUseWorker(jsonInput) ? "大输入将由 Worker 处理" : ""}</span>
        </div>
        <div className="workspace-controls" aria-label="编辑器选项">
          <button aria-pressed={lineWrapping} className="workspace-control" onClick={() => setLineWrapping((current) => !current)} type="button">自动换行</button>
          <button className="workspace-control" onClick={() => setColumnSplit(50)} type="button">重置布局</button>
        </div>
      </div>
      <ResizableSplit
        axis="columns"
        position={columnSplit}
        setPosition={setColumnSplit}
        startLabel="输入 JSON"
        endLabel="输出 JSON"
        start={(
          <div className="editor-block immersive-editor">
            <div className="editor-block-header"><span>输入 JSON</span></div>
            <JsonEditor height="100%" label="输入 JSON" lineWrapping={lineWrapping} value={jsonInput} onChange={setJsonInput} />
          </div>
        )}
        end={(
          <div className="editor-block immersive-editor">
            <div className="editor-block-header">
              <span>输出</span>
              <OutputActions sourceToolId="json-format" value={formattedJson} valueType="json" filename="formatted.json" />
            </div>
            {jsonError ? (
              <pre className="json-code-view error-output" role="alert">{jsonError}</pre>
            ) : formattedJson ? (
              <JsonHighlight code={formattedJson} />
            ) : (
              <pre className="json-code-view empty-output">格式化或压缩后的结果将显示在这里</pre>
            )}
          </div>
        )}
      />
    </section>
  );
}

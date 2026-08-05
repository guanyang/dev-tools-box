"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { makeJsonDiff, mergeJsonPathValue, transformJson } from "../tool-logic/json";
import { useIncomingToolValue } from "../tool-runtime";
import { ResizableSplit, SplitViewControls, type SplitViewMode, useSynchronizedScroll } from "./immersive-workspace";
import { JsonEditor, JsonHighlight } from "./json-editor";

const sampleJsonLeft = `{"service":"api","timeout":3000,"retries":2,"flags":{"beta":false}}`;
const sampleJsonRight = `{"service":"api","timeout":5000,"retries":2,"flags":{"beta":true},"region":"us-east-1"}`;

export default function JsonDiffTool() {
  const [jsonLeft, setJsonLeft] = useState(sampleJsonLeft);
  const [jsonRight, setJsonRight] = useState(sampleJsonRight);
  const [columnSplit, setColumnSplit] = useState(50);
  const [rowSplit, setRowSplit] = useState(46);
  const [viewMode, setViewMode] = useState<SplitViewMode>("split");
  const [lineWrapping, setLineWrapping] = useState(true);
  const [syncScrolling, setSyncScrolling] = useState(true);
  const panelRef = useRef<HTMLElement>(null);
  useSynchronizedScroll(panelRef, ".cm-scroller", syncScrolling);
  const jsonDiff = useMemo(() => makeJsonDiff(jsonLeft, jsonRight), [jsonLeft, jsonRight]);

  useIncomingToolValue("json-diff", useCallback((transfer) => {
    setJsonLeft(transfer.value);
  }, []));

  function transform(input: string, setInput: (value: string) => void, space: number | undefined) {
    const result = transformJson(input, space);
    if (!result.error) setInput(result.value as string);
  }

  function mergeJsonPath(path: string, direction: "left-to-right" | "right-to-left") {
    const result = mergeJsonPathValue(jsonLeft, jsonRight, path, direction);
    if (result.error) return;
    if (direction === "left-to-right") setJsonRight(result.value);
    else setJsonLeft(result.value);
  }

  return (
    <section className="tool-panel immersive-tool" ref={panelRef}>
      <div className="immersive-toolbar">
        <div className="workspace-controls" aria-label="编辑器选项">
          <button aria-pressed={lineWrapping} className="workspace-control" onClick={() => setLineWrapping((current) => !current)} type="button">自动换行</button>
          <button aria-pressed={syncScrolling} className="workspace-control" onClick={() => setSyncScrolling((current) => !current)} type="button">同步滚动</button>
        </div>
        <SplitViewControls mode={viewMode} setMode={setViewMode} startLabel="输入" endLabel="差异" onReset={() => {
          setColumnSplit(50);
          setRowSplit(46);
          setViewMode("split");
        }} />
      </div>
      <ResizableSplit
        axis="rows"
        position={rowSplit}
        setPosition={setRowSplit}
        startLabel="输入区"
        endLabel="差异区"
        mode={viewMode}
        start={(
          <ResizableSplit
            axis="columns"
            position={columnSplit}
            setPosition={setColumnSplit}
            startLabel="左侧 JSON"
            endLabel="右侧 JSON"
            start={<JsonInput label="左侧 JSON" lineWrapping={lineWrapping} value={jsonLeft} setValue={setJsonLeft} transform={transform} />}
            end={<JsonInput label="右侧 JSON" lineWrapping={lineWrapping} value={jsonRight} setValue={setJsonRight} transform={transform} />}
          />
        )}
        end={jsonDiff.error ? <div className="error-banner" role="alert">{jsonDiff.error}</div> : (
          <div className="immersive-result-pane">
            <div className="metric-row">
              <span>{jsonDiff.lines.filter((line) => line.status !== "same").length} 处差异</span>
              <button type="button" onClick={() => transform(jsonLeft, setJsonRight, 2)}>全部用左侧</button>
              <button type="button" onClick={() => transform(jsonRight, setJsonLeft, 2)}>全部用右侧</button>
            </div>
            <div className="json-diff-table" role="table" aria-label="JSON 差异结果">
              <div className="json-diff-head"><span>路径</span><span>左侧值</span><span>右侧值</span><span>合并</span></div>
              {jsonDiff.lines.map((line) => (
                <div className={`json-diff-row ${line.status}`} key={line.path}>
                  <code>{line.path}</code><JsonHighlight code={line.left} compact /><JsonHighlight code={line.right} compact />
                  <div className="merge-actions">{line.status !== "same" && <>
                    <button type="button" aria-label={`${line.path} 使用左侧值`} onClick={() => mergeJsonPath(line.path, "left-to-right")}>用左侧覆盖右侧</button>
                    <button type="button" aria-label={`${line.path} 使用右侧值`} onClick={() => mergeJsonPath(line.path, "right-to-left")}>用右侧覆盖左侧</button>
                  </>}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      />
    </section>
  );
}

function JsonInput({ label, lineWrapping, value, setValue, transform }: {
  label: string;
  lineWrapping: boolean;
  value: string;
  setValue: (value: string) => void;
  transform: (input: string, setInput: (value: string) => void, space: number | undefined) => void;
}) {
  return (
    <div className="editor-block immersive-editor">
      <div className="editor-block-header"><span>{label}</span><div className="mini-actions">
        <button type="button" onClick={() => transform(value, setValue, 2)}>格式化</button>
        <button type="button" onClick={() => transform(value, setValue, undefined)}>压缩</button>
      </div></div>
      <JsonEditor height="100%" label={label} lineWrapping={lineWrapping} value={value} onChange={setValue} />
    </div>
  );
}

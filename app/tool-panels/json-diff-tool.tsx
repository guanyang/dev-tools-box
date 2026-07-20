"use client";

import { useCallback, useMemo, useState } from "react";
import { makeJsonDiff, mergeJsonPathValue, transformJson } from "../tool-logic/json";
import { useIncomingToolValue } from "../tool-runtime";
import { JsonEditor, JsonHighlight } from "./json-editor";

const sampleJsonLeft = `{"service":"api","timeout":3000,"retries":2,"flags":{"beta":false}}`;
const sampleJsonRight = `{"service":"api","timeout":5000,"retries":2,"flags":{"beta":true},"region":"us-east-1"}`;

export default function JsonDiffTool() {
  const [jsonLeft, setJsonLeft] = useState(sampleJsonLeft);
  const [jsonRight, setJsonRight] = useState(sampleJsonRight);
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
    <section className="tool-panel">
      <div className="editor-grid">
        {[["左侧 JSON", jsonLeft, setJsonLeft], ["右侧 JSON", jsonRight, setJsonRight]].map(([label, value, setter]) => (
          <div className="editor-block" key={label as string}>
            <div className="editor-block-header"><span>{label as string}</span><div className="mini-actions">
              <button type="button" onClick={() => transform(value as string, setter as (value: string) => void, 2)}>格式化</button>
              <button type="button" onClick={() => transform(value as string, setter as (value: string) => void, undefined)}>压缩</button>
            </div></div>
            <JsonEditor label={label as string} value={value as string} onChange={setter as (value: string) => void} />
          </div>
        ))}
      </div>
      {jsonDiff.error ? <div className="error-banner">{jsonDiff.error}</div> : (
        <>
          <div className="metric-row">
            <button type="button" onClick={() => transform(jsonLeft, setJsonRight, 2)}>全部用左侧</button>
            <button type="button" onClick={() => transform(jsonRight, setJsonLeft, 2)}>全部用右侧</button>
          </div>
          <div className="json-diff-table" role="table" aria-label="JSON 差异结果">
            <div className="json-diff-head"><span>路径</span><span>左侧值</span><span>右侧值</span><span>合并</span></div>
            {jsonDiff.lines.map((line) => (
              <div className={`json-diff-row ${line.status}`} key={line.path}>
                <code>{line.path}</code><JsonHighlight code={line.left} compact /><JsonHighlight code={line.right} compact />
                <div className="merge-actions">{line.status !== "same" && <>
                  <button type="button" aria-label={`${line.path} 使用左侧值`} onClick={() => mergeJsonPath(line.path, "left-to-right")}>左合右</button>
                  <button type="button" aria-label={`${line.path} 使用右侧值`} onClick={() => mergeJsonPath(line.path, "right-to-left")}>右合左</button>
                </>}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

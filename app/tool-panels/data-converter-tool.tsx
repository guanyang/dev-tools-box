"use client";

import { useState } from "react";
import { convertData, queryJsonPath, type DataFormat } from "../tool-logic/data-format";
import { CopyToast, useCopyText } from "./shared";

const sampleJson = `{
  "service": "api",
  "users": [
    { "name": "Ada", "active": true },
    { "name": "Lin", "active": false }
  ]
}`;

export default function DataConverterTool() {
  const [sourceFormat, setSourceFormat] = useState<DataFormat>("json");
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState("");
  const [path, setPath] = useState("$.users[*].name");
  const [queryResult, setQueryResult] = useState("");
  const [error, setError] = useState("");
  const { copyStatus, copyText } = useCopyText();
  const targetFormat: DataFormat = sourceFormat === "json" ? "yaml" : "json";

  function convert() {
    try { setOutput(convertData(input, sourceFormat, targetFormat)); setError(""); }
    catch (caught) { setOutput(""); setError(caught instanceof Error ? caught.message : "转换失败"); }
  }

  function swap() {
    if (output) {
      setInput(output);
      setOutput(input);
    }
    setSourceFormat(targetFormat);
    setQueryResult("");
    setError("");
  }

  function query() {
    try { setQueryResult(JSON.stringify(queryJsonPath(input, path), null, 2)); setError(""); }
    catch (caught) { setQueryResult(""); setError(caught instanceof Error ? caught.message : "JSONPath 查询失败"); }
  }

  return (
    <section className="tool-panel">
      <div className="action-bar">
        <button type="button" onClick={convert}>{sourceFormat.toUpperCase()} → {targetFormat.toUpperCase()}</button>
        <button type="button" onClick={swap}>交换方向</button>
        <button type="button" disabled={!output} onClick={() => copyText(output)}>复制结果</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="editor-grid">
        <label className="editor-block"><span>输入 {sourceFormat.toUpperCase()}</span><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label>
        <label className="editor-block"><span>输出 {targetFormat.toUpperCase()}</span><textarea readOnly value={output} placeholder="转换结果将显示在这里" /></label>
      </div>
      <section className="subtool-card jsonpath-card">
        <header><h3>JSONPath 查询</h3><span>仅对当前 JSON 输入执行</span></header>
        <div className="inline-form"><label className="text-control grow"><span>JSONPath</span><input value={path} onChange={(event) => setPath(event.target.value)} disabled={sourceFormat !== "json"} /></label><button className="primary-action" type="button" disabled={sourceFormat !== "json"} onClick={query}>执行查询</button></div>
        {queryResult && <pre className="json-code-view query-output">{queryResult}</pre>}
      </section>
      <CopyToast status={copyStatus} />
    </section>
  );
}

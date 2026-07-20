"use client";

import { useState } from "react";
import { transformJson } from "../tool-logic/json";
import { CopyToast, useCopyText } from "./copy-feedback";
import { JsonEditor, JsonHighlight } from "./json-editor";

const sampleJson = `{"name":"devkit","features":["format","diff","password"],"active":true}`;

export default function JsonFormatTool() {
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [formattedJson, setFormattedJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const { copyStatus, copyText } = useCopyText();

  function transform(space: number | undefined) {
    const result = transformJson(jsonInput, space);
    if (result.error) {
      setJsonError(result.error);
      setFormattedJson("");
      return;
    }
    setJsonError("");
    setFormattedJson(result.value as string);
  }

  return (
    <section className="tool-panel">
      <div className="action-bar">
        <button type="button" onClick={() => transform(2)}>格式化</button>
        <button type="button" onClick={() => transform(undefined)}>压缩</button>
        <button type="button" onClick={() => copyText(formattedJson)}>复制结果</button>
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
      <CopyToast status={copyStatus} />
    </section>
  );
}

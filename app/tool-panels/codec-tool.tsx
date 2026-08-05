"use client";

import { useCallback, useState } from "react";
import { codecMethods, runCodec } from "../codec";
import { useIncomingToolValue } from "../tool-runtime";
import { CopyToast, useCopyText } from "./copy-feedback";
import { OutputActions } from "./output-actions";

const codecGroups = [
  { id: "encode" as const, label: "编码与计算", caption: "ENCODE · 12 种" },
  { id: "decode" as const, label: "解码与解析", caption: "DECODE · 12 种" },
];

export default function CodecTool() {
  const [methodId, setMethodId] = useState("unicode-encode");
  const [methodQuery, setMethodQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<"all" | "encode" | "decode">("all");
  const [input, setInput] = useState("你好，Developer Tools!");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { copyStatus, copyText } = useCopyText();
  const activeCodec = codecMethods.find((method) => method.id === methodId) ?? codecMethods[0];
  const normalizedQuery = methodQuery.trim().toLocaleLowerCase();
  const visibleMethods = codecMethods.filter((method) => (
    (groupFilter === "all" || method.group === groupFilter)
    && (!normalizedQuery || `${method.label} ${method.description}`.toLocaleLowerCase().includes(normalizedQuery))
  ));
  useIncomingToolValue("codec", useCallback((transfer) => {
    setInput(transfer.value);
    setMethodId(transfer.valueType === "base64" ? "base64-decode" : transfer.valueType === "url" ? "url-params" : "base64-encode");
  }, []));

  async function executeCodec() {
    setBusy(true);
    setError("");
    try {
      setOutput(await runCodec(methodId, input));
    } catch (caught) {
      setOutput("");
      setError(caught instanceof Error ? caught.message : "转换失败，请检查输入内容");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel codec-panel">
      <div className="codec-current"><div><span>当前方式</span><strong>{activeCodec.label}</strong></div><small>{activeCodec.description} · 24 种转换方式</small></div>
      <div className="codec-method-tools">
        <label className="tool-search codec-method-search"><input type="search" value={methodQuery} onChange={(event) => setMethodQuery(event.target.value)} placeholder="搜索转换方式" /></label>
        <div className="codec-group-filter" aria-label="转换方式分类">
          {([
            ["all", "全部"],
            ["encode", "编码与计算"],
            ["decode", "解码与解析"],
          ] as const).map(([id, label]) => <button className={groupFilter === id ? "selected" : ""} type="button" aria-pressed={groupFilter === id} key={id} onClick={() => setGroupFilter(id)}>{label}</button>)}
        </div>
      </div>
      <div className="codec-method-groups">
        {codecGroups.map((group) => {
          const methods = visibleMethods.filter((method) => method.group === group.id);
          return methods.length > 0 && (
          <section className="codec-method-group" key={group.id}>
            <header><h3>{group.label}</h3><span>{group.caption.split("·")[0]}· {methods.length} 种</span></header>
            <div className="codec-method-grid">
              {methods.map((method) => (
                <button className={method.id === methodId ? "selected" : ""} type="button" key={method.id} aria-pressed={method.id === methodId} onClick={() => { setMethodId(method.id); setOutput(""); setError(""); }}>
                  <strong>{method.label}</strong><small>{method.description}</small>
                </button>
              ))}
            </div>
          </section>
          );
        })}
        {visibleMethods.length === 0 && <p className="codec-method-empty">没有匹配的转换方式</p>}
      </div>
      <div className="action-bar codec-actions">
        <button type="button" disabled={busy} onClick={executeCodec}>{busy ? "处理中..." : "执行转换"}</button>
        <button type="button" disabled={!output} onClick={() => copyText(output)}>复制结果</button>
        <button type="button" disabled={!output} onClick={() => { setInput(output); setOutput(input); setError(""); }}>交换内容</button>
        <button type="button" onClick={() => { setInput(""); setOutput(""); setError(""); }}>清空</button>
      </div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="editor-grid">
        <label className="editor-block"><span>输入内容</span><textarea aria-label="编解码输入内容" value={input} onChange={(event) => setInput(event.target.value)} /></label>
        <label className="editor-block"><span>转换结果</span><textarea aria-label="编解码转换结果" readOnly value={output} placeholder="执行转换后在这里查看结果" /></label>
      </div>
      <OutputActions sourceToolId="codec" value={output} valueType={methodId === "base64-encode" ? "base64" : "text"} filename="codec-output.txt" />
      <CopyToast status={copyStatus} />
    </section>
  );
}

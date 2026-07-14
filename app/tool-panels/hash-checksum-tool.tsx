"use client";

import { useState } from "react";
import { hashBlob, hashText, hmacText, type HashAlgorithm } from "../tool-logic/hash";
import { CopyToast, useCopyText } from "./shared";

type HashMode = "text" | "file" | "hmac";

export default function HashChecksumTool() {
  const [mode, setMode] = useState<HashMode>("text");
  const [algorithm, setAlgorithm] = useState<HashAlgorithm>("SHA-256");
  const [input, setInput] = useState("DevTools Box");
  const [secret, setSecret] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { copyStatus, copyText } = useCopyText();

  async function calculate() {
    setBusy(true);
    setError("");
    try {
      if (mode === "file") {
        if (!file) throw new Error("请先选择文件");
        setResult(await hashBlob(file, algorithm));
      } else if (mode === "hmac") {
        if (!secret) throw new Error("请输入 HMAC 密钥");
        setResult(await hmacText(input, secret, algorithm));
      } else setResult(await hashText(input, algorithm));
    } catch (caught) {
      setResult("");
      setError(caught instanceof Error ? caught.message : "计算失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="tool-panel compact-tool-panel">
      <div className="inline-form">
        <label className="select-control"><span>输入类型</span><select value={mode} onChange={(event) => { setMode(event.target.value as HashMode); setResult(""); }}><option value="text">文本摘要</option><option value="file">文件校验</option><option value="hmac">HMAC</option></select></label>
        <label className="select-control"><span>算法</span><select value={algorithm} onChange={(event) => setAlgorithm(event.target.value as HashAlgorithm)}><option>SHA-256</option><option>SHA-512</option></select></label>
      </div>
      {mode === "file" ? (
        <label className="file-drop"><span>{file ? `${file.name} · ${file.size.toLocaleString()} bytes` : "选择需要本地校验的文件"}</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      ) : (
        <label className="editor-block"><span>输入文本</span><textarea value={input} onChange={(event) => setInput(event.target.value)} /></label>
      )}
      {mode === "hmac" && <label className="text-control"><span>HMAC 密钥</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" /></label>}
      <div className="action-bar"><button type="button" disabled={busy} onClick={calculate}>{busy ? "计算中..." : "计算摘要"}</button><button type="button" disabled={!result} onClick={() => copyText(result)}>复制结果</button></div>
      {error && <div className="error-banner">{error}</div>}
      <div className="result-card"><span>{algorithm} 结果</span><code>{result || "计算结果将显示在这里"}</code></div>
      <CopyToast status={copyStatus} />
    </section>
  );
}

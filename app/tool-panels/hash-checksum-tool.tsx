"use client";

import { useState } from "react";
import { hashBlob, hashText, hmacText, type HashAlgorithm } from "../tool-logic/hash";
import { CopyToast, useCopyText } from "./copy-feedback";

type HashMode = "text" | "file" | "hmac";

const algorithmOptions: Array<{ value: HashAlgorithm; label: string }> = [
  { value: "MD5", label: "MD5（旧校验）" },
  { value: "SHA-1", label: "SHA-1（旧校验）" },
  { value: "SHA-256", label: "SHA-256" },
  { value: "SHA-384", label: "SHA-384" },
  { value: "SHA-512", label: "SHA-512" },
];

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
  const availableAlgorithms = mode === "hmac"
    ? algorithmOptions.filter((option) => option.value !== "MD5")
    : algorithmOptions;
  const usesLegacyAlgorithm = algorithm === "MD5" || algorithm === "SHA-1";

  function changeMode(nextMode: HashMode) {
    setMode(nextMode);
    if (nextMode === "hmac" && algorithm === "MD5") setAlgorithm("SHA-256");
    setResult("");
    setError("");
  }

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
        <label className="select-control"><span>输入类型</span><select value={mode} onChange={(event) => changeMode(event.target.value as HashMode)}><option value="text">文本摘要</option><option value="file">文件校验</option><option value="hmac">HMAC</option></select></label>
        <label className="select-control"><span>算法</span><select value={algorithm} onChange={(event) => { setAlgorithm(event.target.value as HashAlgorithm); setResult(""); setError(""); }}>{availableAlgorithms.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
      </div>
      {usesLegacyAlgorithm && <div className="compatibility-note" role="note">{algorithm} 仅用于兼容旧校验值，不适合密码存储或数字签名。</div>}
      {mode === "file" ? (
        <label className="file-drop"><span>{file ? `${file.name} · ${file.size.toLocaleString()} bytes` : "选择需要本地校验的文件"}</span><input type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      ) : (
        <label className="editor-block"><span>输入文本</span><textarea value={input} onChange={(event) => setInput(event.target.value)} /></label>
      )}
      {mode === "hmac" && <label className="text-control"><span>HMAC 密钥</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} autoComplete="off" /></label>}
      <div className="action-bar"><button type="button" disabled={busy} onClick={calculate}>{busy ? "计算中..." : "计算摘要"}</button><button type="button" disabled={!result} onClick={() => copyText(result)}>复制结果</button></div>
      {error && <div className="error-banner" role="alert">{error}</div>}
      <div className="result-card"><span>{algorithm} 结果</span><code>{result || "计算结果将显示在这里"}</code></div>
      <CopyToast status={copyStatus} />
    </section>
  );
}

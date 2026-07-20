"use client";

import { useState } from "react";
import { normalizeIntegerInput } from "../tool-logic/common";
import { analyzePasswordStrength, generatePasswords, passwordCharsets, type PasswordCharset } from "../tool-logic/password";
import { CopyToast, useCopyText } from "./copy-feedback";

const charsetOptions: Array<{ key: PasswordCharset; label: string; description: string }> = [
  { key: "uppercase", label: "大写字母", description: "A-Z" },
  { key: "lowercase", label: "小写字母", description: "a-z" },
  { key: "numbers", label: "数字", description: "0-9" },
  { key: "symbols", label: "特殊符号", description: "! @ # $ % 等" },
];

export default function PasswordTool() {
  const [passwordLength, setPasswordLength] = useState("20");
  const [passwordCount, setPasswordCount] = useState("1");
  const [enabledSets, setEnabledSets] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: true });
  const [passwords, setPasswords] = useState<string[]>([]);
  const [passwordToAnalyze, setPasswordToAnalyze] = useState("");
  const { copyStatus, copyText } = useCopyText();
  const pool = Object.entries(enabledSets)
    .filter(([, enabled]) => enabled)
    .map(([key]) => passwordCharsets[key as PasswordCharset])
    .join("");

  function generatePassword() {
    if (!pool) return setPasswords([]);
    const length = normalizeIntegerInput(passwordLength, 1, 256);
    const count = normalizeIntegerInput(passwordCount, 1, 1000);
    setPasswordLength(String(length));
    setPasswordCount(String(count));
    setPasswords(generatePasswords(length, count, pool));
  }

  return (
    <section className="tool-panel password-panel">
      <div className="password-controls">
        <div className="password-settings">
          <label className="number-control">
            <span>密码长度</span>
            <input type="number" min="1" max="256" inputMode="numeric" value={passwordLength} onChange={(event) => setPasswordLength(event.target.value)} onBlur={() => setPasswordLength(String(normalizeIntegerInput(passwordLength, 1, 256)))} />
          </label>
          <label className="number-control">
            <span>生成数量</span>
            <input type="number" min="1" max="1000" inputMode="numeric" value={passwordCount} onChange={(event) => setPasswordCount(event.target.value)} onBlur={() => setPasswordCount(String(normalizeIntegerInput(passwordCount, 1, 1000)))} />
          </label>
        </div>
        <div className="checkbox-grid">
          {charsetOptions.map((option) => (
            <label key={option.key}>
              <input type="checkbox" checked={enabledSets[option.key]} onChange={(event) => setEnabledSets((current) => ({ ...current, [option.key]: event.target.checked }))} />
              <span className="charset-copy"><strong>{option.label}</strong><small>{option.description}</small></span>
            </label>
          ))}
        </div>
        <button className="primary-action" type="button" disabled={!pool} onClick={generatePassword}>生成 {normalizeIntegerInput(passwordCount, 1, 1000)} 个密码</button>
      </div>
      <div className="password-results-header">
        <span>生成结果{passwords.length > 0 ? `（${passwords.length} 个）` : ""}</span>
        <button type="button" disabled={passwords.length === 0} onClick={() => copyText(passwords.join("\n"), `已复制全部 ${passwords.length} 个密码`)}>全部复制</button>
      </div>
      <div className="password-results" aria-live="polite">
        {passwords.length > 0 ? passwords.map((password, index) => (
          <div className="password-output" key={index}><code>{password}</code><button type="button" onClick={() => copyText(password)}>复制</button></div>
        )) : (
          <div className="password-output"><code>点击生成按钮创建随机密码</code><button type="button" disabled>复制</button></div>
        )}
      </div>
      <section className="subtool-card password-analysis">
        <header><h3>密码强度分析</h3><span>仅在当前页面内存中计算，不保存输入</span></header>
        <label className="text-control"><span>待分析密码</span><input type="password" autoComplete="off" value={passwordToAnalyze} onChange={(event) => setPasswordToAnalyze(event.target.value)} /></label>
        {passwordToAnalyze && (() => { const result = analyzePasswordStrength(passwordToAnalyze); return <div className="strength-result"><strong>{result.label} · {result.entropyBits} bits</strong><progress max="4" value={result.score} /><span>{result.warnings.join("；") || "字符长度和组合良好"}</span></div>; })()}
      </section>
      <CopyToast status={copyStatus} />
    </section>
  );
}

"use client";

import { useState } from "react";
import { normalizeIntegerInput } from "../tool-logic/common";
import { generateToken, generateUlid, generateUuidV4, generateUuidV7 } from "../tool-logic/id";
import { CopyToast, useCopyText } from "./copy-feedback";

type IdKind = "uuid-v4" | "uuid-v7" | "ulid" | "token";

const idKinds: Array<{ id: IdKind; label: string; description: string }> = [
  { id: "uuid-v4", label: "UUID v4", description: "完全随机" },
  { id: "uuid-v7", label: "UUID v7", description: "时间有序" },
  { id: "ulid", label: "ULID", description: "可排序字符串" },
  { id: "token", label: "安全 Token", description: "URL 安全" },
];

export default function IdGeneratorTool() {
  const [kind, setKind] = useState<IdKind>("uuid-v7");
  const [count, setCount] = useState("5");
  const [tokenLength, setTokenLength] = useState("32");
  const [values, setValues] = useState<string[]>([]);
  const { copyStatus, copyText } = useCopyText();

  function generate() {
    const total = normalizeIntegerInput(count, 1, 1000);
    const length = normalizeIntegerInput(tokenLength, 1, 4096);
    setCount(String(total));
    setTokenLength(String(length));
    const factories: Record<IdKind, () => string> = {
      "uuid-v4": generateUuidV4,
      "uuid-v7": generateUuidV7,
      ulid: generateUlid,
      token: () => generateToken(length),
    };
    setValues(Array.from({ length: total }, factories[kind]));
  }

  return (
    <section className="tool-panel compact-tool-panel">
      <div className="choice-grid">
        {idKinds.map((item) => (
          <button className={kind === item.id ? "choice-card selected" : "choice-card"} type="button" key={item.id} onClick={() => setKind(item.id)}>
            <strong>{item.label}</strong><small>{item.description}</small>
          </button>
        ))}
      </div>
      <div className="inline-form">
        <label className="number-control"><span>生成数量</span><input type="number" min="1" max="1000" value={count} onChange={(event) => setCount(event.target.value)} /></label>
        {kind === "token" && <label className="number-control"><span>Token 长度</span><input type="number" min="1" max="4096" value={tokenLength} onChange={(event) => setTokenLength(event.target.value)} /></label>}
        <button className="primary-action" type="button" onClick={generate}>批量生成</button>
        <button className="secondary-action" type="button" disabled={values.length === 0} onClick={() => copyText(values.join("\n"), `已复制 ${values.length} 个结果`)}>全部复制</button>
      </div>
      <div className="password-results" aria-live="polite">
        {values.length ? values.map((value, index) => (
          <div className="password-output" key={`${value}-${index}`}><code>{value}</code><button type="button" onClick={() => copyText(value)}>复制</button></div>
        )) : <div className="empty-card">选择类型后点击批量生成。</div>}
      </div>
      <CopyToast status={copyStatus} />
    </section>
  );
}

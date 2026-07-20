"use client";

import { useCallback, useState } from "react";
import { inspectJwt, verifyJwt, type JwtInspection } from "../tool-logic/jwt";
import { useIncomingToolValue } from "../tool-runtime";
import { OutputActions } from "./output-actions";

const sampleJwk = `{
  "kty": "oct",
  "k": "eW91ci0yNTYtYml0LXNlY3JldA",
  "alg": "HS256"
}`;

export default function JwtInspectorTool() {
  const [token, setToken] = useState("");
  const [jwk, setJwk] = useState(sampleJwk);
  const [inspection, setInspection] = useState<JwtInspection | null>(null);
  const [verification, setVerification] = useState("");
  const [error, setError] = useState("");
  useIncomingToolValue("jwt-inspector", useCallback((transfer) => setToken(transfer.value), []));

  function inspect() {
    try { setInspection(inspectJwt(token)); setError(""); }
    catch (caught) { setInspection(null); setError(caught instanceof Error ? caught.message : "JWT 解析失败"); }
  }

  async function verify() {
    try {
      const result = await verifyJwt(token, JSON.parse(jwk) as JsonWebKey);
      setVerification(`${result.message}（${result.algorithm}）`);
      setError("");
    } catch (caught) { setVerification(""); setError(caught instanceof Error ? caught.message : "签名校验失败"); }
  }

  const output = inspection ? JSON.stringify({ header: inspection.header, payload: inspection.payload }, null, 2) : "";
  return <section className="tool-panel">
    <div className="privacy-note">敏感工具：输入仅保留在当前页面内存，不写入历史或 URL。</div>
    {error && <div className="error-banner">{error}</div>}
    <div className="action-bar"><button type="button" onClick={inspect}>解析声明</button><button type="button" onClick={() => void verify()}>使用 JWK 校验签名</button></div>
    <div className="editor-grid">
      <label className="editor-block"><span>JWT Token</span><textarea value={token} onChange={(event) => setToken(event.target.value)} placeholder="粘贴三段式 JWT" spellCheck={false} /></label>
      <label className="editor-block"><span>JWK</span><textarea value={jwk} onChange={(event) => setJwk(event.target.value)} spellCheck={false} /></label>
    </div>
    {verification && <div className={verification.startsWith("签名有效") ? "success-banner" : "error-banner"}>{verification}</div>}
    {inspection && <section className="subtool-card"><header><h3>声明内容</h3><span>{inspection.warnings.length ? inspection.warnings.join("；") : "未发现时间或算法警告"}</span></header><pre className="json-code-view query-output">{output}</pre><OutputActions sourceToolId="jwt-inspector" value={output} valueType="json" filename="jwt-claims.json" /></section>}
  </section>;
}

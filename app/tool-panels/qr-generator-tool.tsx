"use client";

import { useCallback, useState } from "react";
import { generateQrDataUrl } from "../tool-logic/qr";
import { useIncomingToolValue } from "../tool-runtime";
import { OutputActions } from "./output-actions";

export default function QrGeneratorTool() {
  const [input, setInput] = useState("https://tools.xcloudapi.com/");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  useIncomingToolValue("qr-generator", useCallback((transfer) => setInput(transfer.value), []));

  async function generate() {
    try { setDataUrl(await generateQrDataUrl(input)); setError(""); }
    catch (caught) { setDataUrl(""); setError(caught instanceof Error ? caught.message : "QR Code 生成失败"); }
  }

  return <section className="tool-panel compact-tool-panel">
    {error && <div className="error-banner">{error}</div>}
    <label className="editor-block"><span>文本、URL 或上一步输出</span><textarea className="qr-input" value={input} onChange={(event) => setInput(event.target.value)} /></label>
    <div className="action-bar"><button type="button" onClick={() => void generate()}>生成 QR Code</button></div>
    {dataUrl && <section className="subtool-card qr-result">
      <header><h3>生成结果</h3><span>图片仅在本地生成</span></header>
      {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL has no remote image to optimize */}
      <img src={dataUrl} alt="生成的 QR Code" width="320" height="320" />
      <OutputActions sourceToolId="qr-generator" value={dataUrl} valueType="image" filename="qrcode.png" downloadUrl={dataUrl} />
    </section>}
  </section>;
}

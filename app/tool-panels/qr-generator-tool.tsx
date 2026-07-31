"use client";

import { useCallback, useRef, useState } from "react";
import {
  BARCODE_FORMATS,
  generateBarcodeDataUrl,
  generateQrDataUrl,
  getBarcodeFormat,
  type BarcodeFormat,
} from "../tool-logic/code-generator";
import { useIncomingToolValue } from "../tool-runtime";
import { OutputActions } from "./output-actions";

type CodeGeneratorTab = "qr" | "barcode";

const tabs: Array<{ id: CodeGeneratorTab; label: string }> = [
  { id: "qr", label: "二维码" },
  { id: "barcode", label: "条形码" },
];

const qrSizes = [128, 256, 320, 512, 1024];
const allowedIconTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxIconBytes = 2 * 1024 * 1024;

export default function CodeGeneratorTool() {
  const [activeTab, setActiveTab] = useState<CodeGeneratorTab>("qr");
  const [qrInput, setQrInput] = useState("https://tools.xcloudapi.com/");
  const [qrSize, setQrSize] = useState(320);
  const [qrDarkColor, setQrDarkColor] = useState("#000000");
  const [qrLightColor, setQrLightColor] = useState("#ffffff");
  const [iconDataUrl, setIconDataUrl] = useState("");
  const [iconName, setIconName] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("ORDER-2026-001");
  const [barcodeFormat, setBarcodeFormat] = useState<BarcodeFormat>("CODE128");
  const [barcodeDataUrl, setBarcodeDataUrl] = useState("");
  const [encodedBarcodeValue, setEncodedBarcodeValue] = useState("");
  const [error, setError] = useState("");
  const iconInputRef = useRef<HTMLInputElement>(null);
  const barcodeInfo = getBarcodeFormat(barcodeFormat);

  useIncomingToolValue("qr-generator", useCallback((transfer) => {
    setActiveTab("qr");
    setQrInput(transfer.value);
    setQrDataUrl("");
    setError("");
  }, []));

  function selectTab(tab: CodeGeneratorTab) {
    setActiveTab(tab);
    setError("");
  }

  async function generateQr() {
    try {
      setQrDataUrl(await generateQrDataUrl(qrInput, {
        size: qrSize,
        darkColor: qrDarkColor,
        lightColor: qrLightColor,
        iconDataUrl: iconDataUrl || undefined,
      }));
      setError("");
    } catch (caught) {
      setQrDataUrl("");
      setError(caught instanceof Error ? caught.message : "二维码生成失败");
    }
  }

  function generateBarcode() {
    try {
      const result = generateBarcodeDataUrl(barcodeInput, barcodeFormat);
      setBarcodeDataUrl(result.dataUrl);
      setEncodedBarcodeValue(result.encodedValue);
      setError("");
    } catch (caught) {
      setBarcodeDataUrl("");
      setEncodedBarcodeValue("");
      setError(caught instanceof Error ? caught.message : "条形码生成失败");
    }
  }

  function selectIcon(file: File | undefined) {
    if (!file) return;
    if (!allowedIconTypes.has(file.type)) {
      setError("图标仅支持 PNG、JPEG 或 WebP 图片");
      return;
    }
    if (file.size > maxIconBytes) {
      setError("图标文件不能超过 2 MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setIconDataUrl(String(reader.result));
      setIconName(file.name);
      setQrDataUrl("");
      setError("");
    };
    reader.onerror = () => setError("图标读取失败，请重新选择图片");
    reader.readAsDataURL(file);
  }

  function removeIcon() {
    setIconDataUrl("");
    setIconName("");
    setQrDataUrl("");
    if (iconInputRef.current) iconInputRef.current.value = "";
  }

  return (
    <section className="tool-panel compact-tool-panel">
      <div className="subtool-tabs" role="tablist" aria-label="码生成类型">
        {tabs.map((tab) => (
          <button
            id={`code-generator-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-controls={`code-generator-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            key={tab.id}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {activeTab === "qr" && (
        <section
          id="code-generator-panel-qr"
          className="subtool-card"
          role="tabpanel"
          aria-labelledby="code-generator-tab-qr"
        >
          <header><h3>二维码生成</h3><span>颜色、尺寸和图标均在本地处理</span></header>
          <label className="editor-block">
            <span>文本、URL 或上一步输出</span>
            <textarea
              className="qr-input"
              value={qrInput}
              onChange={(event) => { setQrInput(event.target.value); setQrDataUrl(""); }}
            />
          </label>

          <div className="code-option-grid">
            <label className="select-control">
              <span>尺寸</span>
              <select value={qrSize} onChange={(event) => { setQrSize(Number(event.target.value)); setQrDataUrl(""); }}>
                {qrSizes.map((size) => <option value={size} key={size}>{size} × {size} px</option>)}
              </select>
            </label>
            <label className="color-control">
              <span>前景色</span>
              <span><input aria-label="二维码前景色" type="color" value={qrDarkColor} onChange={(event) => { setQrDarkColor(event.target.value); setQrDataUrl(""); }} /><code>{qrDarkColor}</code></span>
            </label>
            <label className="color-control">
              <span>背景色</span>
              <span><input aria-label="二维码背景色" type="color" value={qrLightColor} onChange={(event) => { setQrLightColor(event.target.value); setQrDataUrl(""); }} /><code>{qrLightColor}</code></span>
            </label>
          </div>

          <div className="icon-upload">
            <label className="file-control">
              <span>中心图标（可选）</span>
              <input
                ref={iconInputRef}
                aria-label="上传二维码图标"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => selectIcon(event.target.files?.[0])}
              />
            </label>
            {iconDataUrl ? (
              <div className="icon-selection">
                {/* eslint-disable-next-line @next/next/no-img-element -- user-selected local data URL */}
                <img src={iconDataUrl} alt="" width="48" height="48" />
                <span><strong>{iconName}</strong><small>自动居中，二维码纠错等级提升为 H</small></span>
                <button type="button" onClick={removeIcon}>移除图标</button>
              </div>
            ) : <span className="empty-option">默认无图标，可上传 PNG、JPEG 或 WebP，最大 2 MB</span>}
          </div>

          <div className="action-bar"><button type="button" onClick={() => void generateQr()}>生成二维码</button></div>
          {qrDataUrl && (
            <section className="subtool-card code-result qr-result">
              <header><h3>生成结果</h3><span>{qrSize} × {qrSize} px · 图片仅在本地生成</span></header>
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL has no remote image to optimize */}
              <img src={qrDataUrl} alt="生成的二维码" width={qrSize} height={qrSize} />
              <OutputActions sourceToolId="qr-generator" value={qrDataUrl} valueType="image" filename="qrcode.png" downloadUrl={qrDataUrl} />
            </section>
          )}
        </section>
      )}

      {activeTab === "barcode" && (
        <section
          id="code-generator-panel-barcode"
          className="subtool-card"
          role="tabpanel"
          aria-labelledby="code-generator-tab-barcode"
        >
          <header><h3>条形码生成</h3><span>支持 6 种常用一维码格式</span></header>
          <label className="select-control">
            <span>条形码格式</span>
            <select
              value={barcodeFormat}
              onChange={(event) => {
                const nextFormat = event.target.value as BarcodeFormat;
                setBarcodeFormat(nextFormat);
                setBarcodeInput(getBarcodeFormat(nextFormat).example);
                setBarcodeDataUrl("");
                setEncodedBarcodeValue("");
                setError("");
              }}
            >
              {BARCODE_FORMATS.map((format) => <option value={format.value} key={format.value}>{format.label}</option>)}
            </select>
          </label>
          <div className="code-format-help" role="note">
            <strong>{barcodeInfo.label} 格式要求</strong>
            <span>{barcodeInfo.requirement}</span>
            <code>示例：{barcodeInfo.example}</code>
          </div>
          <label className="text-control">
            <span>条形码内容</span>
            <input
              value={barcodeInput}
              placeholder={barcodeInfo.placeholder}
              onChange={(event) => {
                setBarcodeInput(event.target.value);
                setBarcodeDataUrl("");
                setEncodedBarcodeValue("");
              }}
            />
          </label>
          <div className="action-bar"><button type="button" onClick={generateBarcode}>生成条形码</button></div>
          {barcodeDataUrl && (
            <section className="subtool-card code-result barcode-result">
              <header><h3>生成结果</h3><span>{barcodeInfo.label} · 图片仅在本地生成</span></header>
              {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL has no remote image to optimize */}
              <img src={barcodeDataUrl} alt={`生成的 ${barcodeInfo.label} 条形码`} />
              <div className="result-card"><span>实际编码值</span><code>{encodedBarcodeValue}</code></div>
              <OutputActions sourceToolId="qr-generator" value={barcodeDataUrl} valueType="image" filename={`${barcodeFormat.toLowerCase()}.png`} downloadUrl={barcodeDataUrl} />
            </section>
          )}
        </section>
      )}
    </section>
  );
}

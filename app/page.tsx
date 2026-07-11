"use client";

import { useMemo, useRef, useState } from "react";
import {
  Binary,
  Braces,
  FileDiff,
  GitCompareArrows,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { Highlight, themes } from "prism-react-renderer";
import { codecMethods, runCodec } from "./codec";

type ToolId = "doc-diff" | "json-format" | "json-diff" | "password" | "codec";
type DiffStatus = "same" | "changed" | "added" | "removed";

type DiffLine = {
  left: string;
  right: string;
  status: DiffStatus;
};

type JsonDiffLine = {
  path: string;
  left: string;
  right: string;
  status: DiffStatus;
};

type JsonPathToken = string | number;

const tools: Array<{
  id: ToolId;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    id: "doc-diff",
    label: "文档差异比对",
    description: "逐行比较两段文本，快速定位新增、删除和修改。",
    icon: FileDiff,
  },
  {
    id: "json-format",
    label: "JSON 格式化",
    description: "解析、校验并输出可读的 JSON 结构。",
    icon: Braces,
  },
  {
    id: "json-diff",
    label: "JSON 差异比对",
    description: "按路径比较 JSON 值，忽略对象键顺序。",
    icon: GitCompareArrows,
  },
  {
    id: "password",
    label: "随机密码生成",
    description: "生成可复制的强密码，并支持字符集和长度控制。",
    icon: KeyRound,
  },
  {
    id: "codec",
    label: "信息编解码工具",
    description: "提供 24 种常用编码、解码、摘要和解析方式。",
    icon: Binary,
  },
];

const codecGroups = [
  { id: "encode" as const, label: "编码与计算", caption: "ENCODE · 12 种" },
  { id: "decode" as const, label: "解码与解析", caption: "DECODE · 12 种" },
];

const sampleTextLeft = `Release Notes
Version: 1.8.0

- Added export for CSV reports
- Improved JSON parser errors
- Deprecated legacy token endpoint`;

const sampleTextRight = `Release Notes
Version: 1.9.0

- Added export for CSV and XLSX reports
- Improved JSON parser errors
- Added audit log preview`;

const sampleJson = `{"name":"devkit","features":["format","diff","password"],"active":true}`;
const sampleJsonLeft = `{"service":"api","timeout":3000,"retries":2,"flags":{"beta":false}}`;
const sampleJsonRight = `{"service":"api","timeout":5000,"retries":2,"flags":{"beta":true},"region":"us-east-1"}`;

const charsets = {
  uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  lowercase: "abcdefghijklmnopqrstuvwxyz",
  numbers: "0123456789",
  symbols: "!@#$%^&*()-_=+[]{};:,.?",
};

const charsetOptions: Array<{
  key: keyof typeof charsets;
  label: string;
  description: string;
}> = [
  { key: "uppercase", label: "大写字母", description: "A-Z" },
  { key: "lowercase", label: "小写字母", description: "a-z" },
  { key: "numbers", label: "数字", description: "0-9" },
  { key: "symbols", label: "特殊符号", description: "! @ # $ % 等" },
];

const jsonEditorExtensions = [json()];

function formatValue(value: unknown): string {
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

function parseJson(input: string): { value: unknown; error: string } {
  try {
    return { value: JSON.parse(input), error: "" };
  } catch (error) {
    return {
      value: null,
      error: error instanceof Error ? error.message : "Invalid JSON",
    };
  }
}

function makeTextDiff(left: string, right: string): DiffLine[] {
  const leftLines = left.split(/\r?\n/);
  const rightLines = right.split(/\r?\n/);
  const max = Math.max(leftLines.length, rightLines.length);

  return Array.from({ length: max }, (_, index) => {
    const leftLine = leftLines[index] ?? "";
    const rightLine = rightLines[index] ?? "";

    if (leftLine === rightLine) {
      return { left: leftLine, right: rightLine, status: "same" };
    }
    if (index >= leftLines.length) {
      return { left: "", right: rightLine, status: "added" };
    }
    if (index >= rightLines.length) {
      return { left: leftLine, right: "", status: "removed" };
    }
    return { left: leftLine, right: rightLine, status: "changed" };
  });
}

function flattenJson(value: unknown, path = "$", rows = new Map<string, string>()) {
  if (Array.isArray(value)) {
    if (value.length === 0) rows.set(path, "[]");
    value.forEach((item, index) => flattenJson(item, `${path}[${index}]`, rows));
    return rows;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    if (entries.length === 0) rows.set(path, "{}");
    entries.forEach(([key, item]) => flattenJson(item, `${path}.${key}`, rows));
    return rows;
  }

  rows.set(path, formatValue(value));
  return rows;
}

function flattenJsonValues(value: unknown, path = "$", rows = new Map<string, unknown>()) {
  if (Array.isArray(value)) {
    if (value.length === 0) rows.set(path, []);
    value.forEach((item, index) => flattenJsonValues(item, `${path}[${index}]`, rows));
    return rows;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) =>
      a.localeCompare(b),
    );
    if (entries.length === 0) rows.set(path, {});
    entries.forEach(([key, item]) => flattenJsonValues(item, `${path}.${key}`, rows));
    return rows;
  }

  rows.set(path, value);
  return rows;
}

function makeJsonDiff(leftInput: string, rightInput: string) {
  const leftParsed = parseJson(leftInput);
  const rightParsed = parseJson(rightInput);

  if (leftParsed.error || rightParsed.error) {
    return {
      lines: [] as JsonDiffLine[],
      error: leftParsed.error
        ? `左侧 JSON：${leftParsed.error}`
        : `右侧 JSON：${rightParsed.error}`,
    };
  }

  const leftMap = flattenJson(leftParsed.value);
  const rightMap = flattenJson(rightParsed.value);
  const paths = Array.from(new Set([...leftMap.keys(), ...rightMap.keys()])).sort();

  return {
    error: "",
    lines: paths.map((path) => {
      const left = leftMap.get(path) ?? "";
      const right = rightMap.get(path) ?? "";

      if (left === right) return { path, left, right, status: "same" as const };
      if (!leftMap.has(path)) return { path, left, right, status: "added" as const };
      if (!rightMap.has(path)) return { path, left, right, status: "removed" as const };
      return { path, left, right, status: "changed" as const };
    }),
  };
}

function parseJsonPath(path: string): JsonPathToken[] {
  const tokens: JsonPathToken[] = [];
  let index = 1;

  while (index < path.length) {
    if (path[index] === ".") {
      const start = index + 1;
      let end = start;
      while (end < path.length && path[end] !== "." && path[end] !== "[") end += 1;
      tokens.push(path.slice(start, end));
      index = end;
      continue;
    }

    if (path[index] === "[") {
      const end = path.indexOf("]", index);
      if (end === -1) break;
      tokens.push(Number(path.slice(index + 1, end)));
      index = end + 1;
      continue;
    }

    index += 1;
  }

  return tokens;
}

function cloneJsonValue(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function setJsonPathValue(
  target: unknown,
  tokens: JsonPathToken[],
  value: unknown,
): unknown {
  if (tokens.length === 0) return cloneJsonValue(value);

  const [head, ...rest] = tokens;
  const base = Array.isArray(target)
    ? [...target]
    : isRecord(target)
      ? { ...target }
      : typeof head === "number"
        ? []
        : {};

  if (Array.isArray(base) && typeof head === "number") {
    base[head] = setJsonPathValue(base[head], rest, value);
    return base;
  }

  const key = String(head);
  return {
    ...(base as Record<string, unknown>),
    [key]: setJsonPathValue((base as Record<string, unknown>)[key], rest, value),
  };
}

function deleteJsonPathValue(target: unknown, tokens: JsonPathToken[]): unknown {
  if (tokens.length === 0) return null;
  if (!Array.isArray(target) && !isRecord(target)) return target;

  const [head, ...rest] = tokens;

  if (Array.isArray(target)) {
    const next = [...target];
    if (typeof head !== "number") return next;
    if (rest.length === 0) {
      next.splice(head, 1);
      return next;
    }
    next[head] = deleteJsonPathValue(next[head], rest);
    return next;
  }

  const key = String(head);
  const next = { ...target };
  if (rest.length === 0) {
    delete next[key];
    return next;
  }
  next[key] = deleteJsonPathValue(next[key], rest);
  return next;
}

function makePassword(length: number, pool: string) {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => pool[value % pool.length]).join("");
}

function normalizeIntegerInput(value: string, min: number, max: number) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function JsonHighlight({ code, compact = false }: { code: string; compact?: boolean }) {
  return (
    <Highlight theme={themes.github} code={code || " "} language="json">
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`json-code-view ${compact ? "compact" : ""} ${className}`}
          style={{ ...style, background: "transparent" }}
        >
          <code>
            {tokens.map((line, lineIndex) => (
              <span {...getLineProps({ line })} key={lineIndex}>
                {line.map((token, tokenIndex) => (
                  <span {...getTokenProps({ token })} key={tokenIndex} />
                ))}
                {lineIndex < tokens.length - 1 ? "\n" : null}
              </span>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}

function JsonEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <CodeMirror
      aria-label={label}
      basicSetup={{
        bracketMatching: true,
        closeBrackets: true,
        foldGutter: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        lineNumbers: true,
      }}
      className="json-editor"
      extensions={jsonEditorExtensions}
      height="290px"
      onChange={onChange}
      theme="light"
      value={value}
    />
  );
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolId>("doc-diff");
  const [isRailExpanded, setIsRailExpanded] = useState(false);
  const [docLeft, setDocLeft] = useState(sampleTextLeft);
  const [docRight, setDocRight] = useState(sampleTextRight);
  const [jsonInput, setJsonInput] = useState(sampleJson);
  const [formattedJson, setFormattedJson] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [jsonLeft, setJsonLeft] = useState(sampleJsonLeft);
  const [jsonRight, setJsonRight] = useState(sampleJsonRight);
  const [passwordLength, setPasswordLength] = useState("20");
  const [passwordCount, setPasswordCount] = useState("1");
  const [enabledSets, setEnabledSets] = useState({
    uppercase: true,
    lowercase: true,
    numbers: true,
    symbols: true,
  });
  const [passwords, setPasswords] = useState<string[]>([]);
  const [codecMethodId, setCodecMethodId] = useState("unicode-encode");
  const [codecInput, setCodecInput] = useState("你好，Developer Tools!");
  const [codecOutput, setCodecOutput] = useState("");
  const [codecError, setCodecError] = useState("");
  const [codecBusy, setCodecBusy] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  const copyTimerRef = useRef<number | null>(null);

  const docDiff = useMemo(() => makeTextDiff(docLeft, docRight), [docLeft, docRight]);
  const jsonDiff = useMemo(() => makeJsonDiff(jsonLeft, jsonRight), [jsonLeft, jsonRight]);
  const activeCodec = codecMethods.find((method) => method.id === codecMethodId) ?? codecMethods[0];

  const diffCounts = useMemo(
    () => ({
      changed: docDiff.filter((line) => line.status === "changed").length,
      added: docDiff.filter((line) => line.status === "added").length,
      removed: docDiff.filter((line) => line.status === "removed").length,
    }),
    [docDiff],
  );

  const pool = Object.entries(enabledSets)
    .filter(([, enabled]) => enabled)
    .map(([key]) => charsets[key as keyof typeof charsets])
    .join("");

  function formatJson() {
    const parsed = parseJson(jsonInput);
    if (parsed.error) {
      setJsonError(parsed.error);
      setFormattedJson("");
      return;
    }

    setJsonError("");
    setFormattedJson(JSON.stringify(parsed.value, null, 2));
  }

  function minifyJson() {
    const parsed = parseJson(jsonInput);
    if (parsed.error) {
      setJsonError(parsed.error);
      setFormattedJson("");
      return;
    }

    setJsonError("");
    setFormattedJson(JSON.stringify(parsed.value));
  }

  function transformJsonEditor(
    input: string,
    setInput: (value: string) => void,
    space: number | undefined,
  ) {
    const parsed = parseJson(input);
    if (parsed.error) return;

    setInput(JSON.stringify(parsed.value, null, space));
  }

  function mergeDocLine(index: number, direction: "left-to-right" | "right-to-left") {
    const leftLines = docLeft.split(/\r?\n/);
    const rightLines = docRight.split(/\r?\n/);
    const sourceLines = direction === "left-to-right" ? leftLines : rightLines;
    const targetLines = direction === "left-to-right" ? rightLines : leftLines;

    if (index >= sourceLines.length) {
      targetLines.splice(index, 1);
    } else {
      targetLines[index] = sourceLines[index];
    }

    if (direction === "left-to-right") {
      setDocRight(targetLines.join("\n"));
    } else {
      setDocLeft(targetLines.join("\n"));
    }
  }

  function mergeJsonPath(path: string, direction: "left-to-right" | "right-to-left") {
    const leftParsed = parseJson(jsonLeft);
    const rightParsed = parseJson(jsonRight);
    if (leftParsed.error || rightParsed.error) return;

    const sourceValue = direction === "left-to-right" ? leftParsed.value : rightParsed.value;
    const targetValue = direction === "left-to-right" ? rightParsed.value : leftParsed.value;
    const sourceMap = flattenJsonValues(sourceValue);
    const tokens = parseJsonPath(path);
    const nextValue = sourceMap.has(path)
      ? setJsonPathValue(targetValue, tokens, sourceMap.get(path))
      : deleteJsonPathValue(targetValue, tokens);
    const nextJson = JSON.stringify(nextValue, null, 2);

    if (direction === "left-to-right") {
      setJsonRight(nextJson);
    } else {
      setJsonLeft(nextJson);
    }
  }

  function generatePassword() {
    if (!pool) {
      setPasswords([]);
      return;
    }
    const length = normalizeIntegerInput(passwordLength, 1, 256);
    const count = normalizeIntegerInput(passwordCount, 1, 1000);
    setPasswordLength(String(length));
    setPasswordCount(String(count));
    setPasswords(
      Array.from({ length: count }, () => makePassword(length, pool)),
    );
  }

  async function copyText(text: string, status = "已复制") {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopyStatus(status);
    if (copyTimerRef.current !== null) window.clearTimeout(copyTimerRef.current);
    copyTimerRef.current = window.setTimeout(() => {
      setCopyStatus("");
      copyTimerRef.current = null;
    }, 1400);
  }

  async function executeCodec() {
    setCodecBusy(true);
    setCodecError("");
    try {
      setCodecOutput(await runCodec(codecMethodId, codecInput));
    } catch (error) {
      setCodecOutput("");
      setCodecError(error instanceof Error ? error.message : "转换失败，请检查输入内容");
    } finally {
      setCodecBusy(false);
    }
  }

  function selectCodec(methodId: string) {
    setCodecMethodId(methodId);
    setCodecOutput("");
    setCodecError("");
  }

  return (
    <main className={isRailExpanded ? "app-shell rail-expanded" : "app-shell"}>
      <aside className="tool-rail" aria-label="开发者工具">
        <div className="brand-block">
          <div className="brand-mark">DT</div>
          <div className="rail-copy">
            <p className="eyebrow">Developer Tools</p>
            <h1>开发者工具箱</h1>
          </div>
        </div>

        <button
          className="rail-toggle"
          type="button"
          aria-controls="tool-navigation"
          aria-expanded={isRailExpanded}
          aria-label={isRailExpanded ? "收起工具栏" : "展开工具栏"}
          title={isRailExpanded ? "收起工具栏" : "展开工具栏"}
          onClick={() => setIsRailExpanded((expanded) => !expanded)}
        >
          <span aria-hidden="true">{isRailExpanded ? "‹" : "›"}</span>
        </button>

        <nav className="tool-nav" id="tool-navigation">
          {tools.map((tool) => (
            <button
              className={activeTool === tool.id ? "tool-tab active" : "tool-tab"}
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              aria-label={tool.label}
              title={isRailExpanded ? undefined : tool.label}
              type="button"
            >
              <span className="tool-icon">
                <tool.icon aria-hidden="true" size={24} strokeWidth={1.9} />
              </span>
              <span className="tool-copy">
                <strong>{tool.label}</strong>
                <small>{tool.description}</small>
              </span>
            </button>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <p className="eyebrow">Browser-only utility suite</p>
            <h2>{tools.find((tool) => tool.id === activeTool)?.label}</h2>
          </div>
          <div className="status-pills">
            <span>离线可用</span>
            <span>无上传</span>
          </div>
        </header>

        {activeTool === "doc-diff" && (
          <section className="tool-panel">
            <div className="editor-grid">
              <label className="editor-block">
                <span>原始文档</span>
                <textarea value={docLeft} onChange={(event) => setDocLeft(event.target.value)} />
              </label>
              <label className="editor-block">
                <span>新文档</span>
                <textarea value={docRight} onChange={(event) => setDocRight(event.target.value)} />
              </label>
            </div>

            <div className="metric-row">
              <span>{diffCounts.changed} 修改</span>
              <span>{diffCounts.added} 新增</span>
              <span>{diffCounts.removed} 删除</span>
              <button type="button" onClick={() => setDocRight(docLeft)}>
                全部用左侧
              </button>
              <button type="button" onClick={() => setDocLeft(docRight)}>
                全部用右侧
              </button>
            </div>

            <div className="diff-table" role="table" aria-label="文档差异结果">
              {docDiff.map((line, index) => (
                <div className={`diff-row ${line.status}`} key={`${line.status}-${index}`}>
                  <div className="line-number">{index + 1}</div>
                  <pre>{line.left || " "}</pre>
                  <pre>{line.right || " "}</pre>
                  <div className="merge-actions">
                    {line.status !== "same" && (
                      <>
                        <button
                          type="button"
                          aria-label={`第 ${index + 1} 行使用左侧内容`}
                          onClick={() => mergeDocLine(index, "left-to-right")}
                        >
                          左合右
                        </button>
                        <button
                          type="button"
                          aria-label={`第 ${index + 1} 行使用右侧内容`}
                          onClick={() => mergeDocLine(index, "right-to-left")}
                        >
                          右合左
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTool === "json-format" && (
          <section className="tool-panel">
            <div className="action-bar">
              <button type="button" onClick={formatJson}>格式化</button>
              <button type="button" onClick={minifyJson}>压缩</button>
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
          </section>
        )}

        {activeTool === "json-diff" && (
          <section className="tool-panel">
            <div className="editor-grid">
              <div className="editor-block">
                <div className="editor-block-header">
                  <span>左侧 JSON</span>
                  <div className="mini-actions">
                    <button
                      type="button"
                      onClick={() => transformJsonEditor(jsonLeft, setJsonLeft, 2)}
                    >
                      格式化
                    </button>
                    <button
                      type="button"
                      onClick={() => transformJsonEditor(jsonLeft, setJsonLeft, undefined)}
                    >
                      压缩
                    </button>
                  </div>
                </div>
                <JsonEditor label="左侧 JSON" value={jsonLeft} onChange={setJsonLeft} />
              </div>
              <div className="editor-block">
                <div className="editor-block-header">
                  <span>右侧 JSON</span>
                  <div className="mini-actions">
                    <button
                      type="button"
                      onClick={() => transformJsonEditor(jsonRight, setJsonRight, 2)}
                    >
                      格式化
                    </button>
                    <button
                      type="button"
                      onClick={() => transformJsonEditor(jsonRight, setJsonRight, undefined)}
                    >
                      压缩
                    </button>
                  </div>
                </div>
                <JsonEditor label="右侧 JSON" value={jsonRight} onChange={setJsonRight} />
              </div>
            </div>

            {jsonDiff.error ? (
              <div className="error-banner">{jsonDiff.error}</div>
            ) : (
              <>
                <div className="metric-row">
                  <button type="button" onClick={() => transformJsonEditor(jsonLeft, setJsonRight, 2)}>
                    全部用左侧
                  </button>
                  <button type="button" onClick={() => transformJsonEditor(jsonRight, setJsonLeft, 2)}>
                    全部用右侧
                  </button>
                </div>

                <div className="json-diff-table" role="table" aria-label="JSON 差异结果">
                  <div className="json-diff-head">
                    <span>路径</span>
                    <span>左侧值</span>
                    <span>右侧值</span>
                    <span>合并</span>
                  </div>
                  {jsonDiff.lines.map((line) => (
                    <div className={`json-diff-row ${line.status}`} key={line.path}>
                      <code>{line.path}</code>
                      <JsonHighlight code={line.left} compact />
                      <JsonHighlight code={line.right} compact />
                      <div className="merge-actions">
                        {line.status !== "same" && (
                          <>
                            <button
                              type="button"
                              aria-label={`${line.path} 使用左侧值`}
                              onClick={() => mergeJsonPath(line.path, "left-to-right")}
                            >
                              左合右
                            </button>
                            <button
                              type="button"
                              aria-label={`${line.path} 使用右侧值`}
                              onClick={() => mergeJsonPath(line.path, "right-to-left")}
                            >
                              右合左
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {activeTool === "password" && (
          <section className="tool-panel password-panel">
            <div className="password-controls">
              <div className="password-settings">
                <label className="number-control">
                  <span>密码长度</span>
                  <input
                    type="number"
                    min="1"
                    max="256"
                    inputMode="numeric"
                    value={passwordLength}
                    onChange={(event) => setPasswordLength(event.target.value)}
                    onBlur={() =>
                      setPasswordLength(
                        String(normalizeIntegerInput(passwordLength, 1, 256)),
                      )
                    }
                  />
                </label>

                <label className="number-control">
                  <span>生成数量</span>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    inputMode="numeric"
                    value={passwordCount}
                    onChange={(event) => setPasswordCount(event.target.value)}
                    onBlur={() =>
                      setPasswordCount(
                        String(normalizeIntegerInput(passwordCount, 1, 1000)),
                      )
                    }
                  />
                </label>
              </div>

              <div className="checkbox-grid">
                {charsetOptions.map((option) => (
                  <label key={option.key}>
                    <input
                      type="checkbox"
                      checked={enabledSets[option.key]}
                      onChange={(event) =>
                        setEnabledSets((current) => ({
                          ...current,
                          [option.key]: event.target.checked,
                        }))
                      }
                    />
                    <span className="charset-copy">
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                    </span>
                  </label>
                ))}
              </div>

              <button className="primary-action" type="button" disabled={!pool} onClick={generatePassword}>
                生成 {normalizeIntegerInput(passwordCount, 1, 1000)} 个密码
              </button>
            </div>

            <div className="password-results-header">
              <span>生成结果{passwords.length > 0 ? `（${passwords.length} 个）` : ""}</span>
              <button
                type="button"
                disabled={passwords.length === 0}
                onClick={() =>
                  copyText(passwords.join("\n"), `已复制全部 ${passwords.length} 个密码`)
                }
              >
                全部复制
              </button>
            </div>
            <div className="password-results" aria-live="polite">
              {passwords.length > 0 ? (
                passwords.map((generatedPassword, index) => (
                  <div className="password-output" key={index}>
                    <code>{generatedPassword}</code>
                    <button type="button" onClick={() => copyText(generatedPassword)}>
                      复制
                    </button>
                  </div>
                ))
              ) : (
                <div className="password-output">
                  <code>点击生成按钮创建随机密码</code>
                  <button type="button" disabled>
                    复制
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {activeTool === "codec" && (
          <section className="tool-panel codec-panel">
            <div className="codec-current">
              <div>
                <span>当前方式</span>
                <strong>{activeCodec.label}</strong>
              </div>
              <small>{activeCodec.description} · 24 种转换方式</small>
            </div>

            <div className="codec-method-groups">
              {codecGroups.map((group) => (
                <section className="codec-method-group" key={group.id}>
                  <header>
                    <h3>{group.label}</h3>
                    <span>{group.caption}</span>
                  </header>
                  <div className="codec-method-grid">
                    {codecMethods
                      .filter((method) => method.group === group.id)
                      .map((method) => (
                        <button
                          className={method.id === codecMethodId ? "selected" : ""}
                          type="button"
                          key={method.id}
                          aria-pressed={method.id === codecMethodId}
                          onClick={() => selectCodec(method.id)}
                        >
                          <strong>{method.label}</strong>
                          <small>{method.description}</small>
                        </button>
                      ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="action-bar codec-actions">
              <button type="button" disabled={codecBusy} onClick={executeCodec}>
                {codecBusy ? "处理中..." : "执行转换"}
              </button>
              <button type="button" disabled={!codecOutput} onClick={() => copyText(codecOutput)}>
                复制结果
              </button>
              <button
                type="button"
                disabled={!codecOutput}
                onClick={() => {
                  setCodecInput(codecOutput);
                  setCodecOutput(codecInput);
                  setCodecError("");
                }}
              >
                交换内容
              </button>
              <button
                type="button"
                onClick={() => {
                  setCodecInput("");
                  setCodecOutput("");
                  setCodecError("");
                }}
              >
                清空
              </button>
            </div>

            {codecError && <div className="error-banner">{codecError}</div>}

            <div className="editor-grid">
              <label className="editor-block">
                <span>输入内容</span>
                <textarea
                  aria-label="编解码输入内容"
                  value={codecInput}
                  onChange={(event) => setCodecInput(event.target.value)}
                />
              </label>
              <label className="editor-block">
                <span>转换结果</span>
                <textarea
                  aria-label="编解码转换结果"
                  readOnly
                  value={codecOutput}
                  placeholder="执行转换后在这里查看结果"
                />
              </label>
            </div>
          </section>
        )}
      </section>
      <div
        className={copyStatus ? "copy-toast visible" : "copy-toast"}
        role="status"
        aria-atomic="true"
        aria-live="polite"
      >
        {copyStatus}
      </div>
    </main>
  );
}

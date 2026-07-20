"use client";

import { useCallback, useRef, useState } from "react";
import { formatSql, queryJsonPath, validateJsonSchema, type DataFormat, type SqlDialect, type SqlKeywordCase } from "../tool-logic/data-format";
import { useIncomingToolValue } from "../tool-runtime";
import { runWorkerTask, shouldUseWorker } from "../worker-client";
import { CopyToast, useCopyText } from "./copy-feedback";
import { OutputActions } from "./output-actions";

const formats: DataFormat[] = ["json", "yaml", "xml", "toml", "csv"];
const dialects: Array<{ value: SqlDialect; label: string }> = [
  { value: "sql", label: "Standard SQL" },
  { value: "mysql", label: "MySQL" },
  { value: "postgresql", label: "PostgreSQL" },
  { value: "sqlite", label: "SQLite" },
  { value: "tsql", label: "SQL Server" },
  { value: "plsql", label: "PL/SQL" },
];

const sampleJson = `{
  "service": "api",
  "users": [
    { "name": "Ada", "active": true },
    { "name": "Lin", "active": false }
  ]
}`;

export default function DataConverterTool() {
  const [mode, setMode] = useState<"convert" | "schema" | "sql">("convert");
  const [sourceFormat, setSourceFormat] = useState<DataFormat>("json");
  const [targetFormat, setTargetFormat] = useState<DataFormat>("yaml");
  const [input, setInput] = useState(sampleJson);
  const [output, setOutput] = useState("");
  const [path, setPath] = useState("$.users[*].name");
  const [queryResult, setQueryResult] = useState("");
  const [error, setError] = useState("");
  const [schema, setSchema] = useState(`{
  "type": "object",
  "required": ["service"],
  "properties": { "service": { "type": "string" } }
}`);
  const [schemaResult, setSchemaResult] = useState("");
  const [sql, setSql] = useState("select u.id,u.name,count(o.id) as orders from users u left join orders o on o.user_id=u.id where u.active=true group by u.id,u.name order by orders desc;");
  const [sqlOutput, setSqlOutput] = useState("");
  const [dialect, setDialect] = useState<SqlDialect>("sql");
  const [keywordCase, setKeywordCase] = useState<SqlKeywordCase>("upper");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const { copyStatus, copyText } = useCopyText();
  useIncomingToolValue("data-converter", useCallback((transfer) => {
    setInput(transfer.value);
    if (["json", "yaml", "xml", "toml", "csv"].includes(transfer.valueType)) setSourceFormat(transfer.valueType as DataFormat);
    setMode("convert");
  }, []));

  async function convert() {
    controller.current?.abort();
    controller.current = new AbortController();
    setBusy(true);
    setProgress(0);
    try { setOutput(await runWorkerTask({ type: "data-convert", input, from: sourceFormat, to: targetFormat }, { signal: controller.current.signal, onProgress: setProgress })); setError(""); }
    catch (caught) { if (!(caught instanceof DOMException && caught.name === "AbortError")) { setOutput(""); setError(caught instanceof Error ? caught.message : "转换失败"); } }
    finally { setBusy(false); }
  }

  function swap() {
    if (output) {
      setInput(output);
      setOutput(input);
    }
    setSourceFormat(targetFormat);
    setTargetFormat(sourceFormat);
    setQueryResult("");
    setError("");
  }

  function validateSchema() {
    try {
      const result = validateJsonSchema(input, schema);
      setSchemaResult(result.valid ? "校验通过：数据符合 Schema" : result.errors.join("\n"));
      setError("");
    } catch (caught) { setSchemaResult(""); setError(caught instanceof Error ? caught.message : "Schema 校验失败"); }
  }

  function runSqlFormatter() {
    try { setSqlOutput(formatSql(sql, dialect, keywordCase)); setError(""); }
    catch (caught) { setSqlOutput(""); setError(caught instanceof Error ? caught.message : "SQL 格式化失败"); }
  }

  function query() {
    try { setQueryResult(JSON.stringify(queryJsonPath(input, path), null, 2)); setError(""); }
    catch (caught) { setQueryResult(""); setError(caught instanceof Error ? caught.message : "JSONPath 查询失败"); }
  }

  return (
    <section className="tool-panel">
      <div className="subtool-tabs" role="tablist" aria-label="数据工具模式">
        <button type="button" role="tab" aria-selected={mode === "convert"} onClick={() => setMode("convert")}>格式转换</button>
        <button type="button" role="tab" aria-selected={mode === "schema"} onClick={() => setMode("schema")}>JSON Schema</button>
        <button type="button" role="tab" aria-selected={mode === "sql"} onClick={() => setMode("sql")}>SQL 格式化</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {mode === "convert" && <>
        <div className="action-bar">
          <label>来源 <select value={sourceFormat} onChange={(event) => setSourceFormat(event.target.value as DataFormat)}>{formats.map((format) => <option key={format}>{format}</option>)}</select></label>
          <span aria-hidden="true">→</span>
          <label>目标 <select value={targetFormat} onChange={(event) => setTargetFormat(event.target.value as DataFormat)}>{formats.map((format) => <option key={format}>{format}</option>)}</select></label>
          <button type="button" disabled={busy || sourceFormat === targetFormat} onClick={() => void convert()}>转换</button>
          {busy && <button type="button" onClick={() => controller.current?.abort()}>取消任务</button>}
          <button type="button" onClick={swap}>交换方向</button>
          <span className="task-status">{busy ? `Worker 处理中 ${progress}%` : shouldUseWorker(input) ? "大输入将由 Worker 处理" : ""}</span>
        </div>
        <div className="editor-grid">
          <label className="editor-block"><span>输入 {sourceFormat.toUpperCase()}</span><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label>
          <label className="editor-block"><span>输出 {targetFormat.toUpperCase()}</span><textarea readOnly value={output} placeholder="转换结果将显示在这里" /></label>
        </div>
        <OutputActions sourceToolId="data-converter" value={output} valueType={targetFormat} filename={`converted.${targetFormat}`} />
        <section className="subtool-card jsonpath-card">
          <header><h3>JSONPath 查询</h3><span>仅对当前 JSON 输入执行</span></header>
          <div className="inline-form"><label className="text-control grow"><span>JSONPath</span><input value={path} onChange={(event) => setPath(event.target.value)} disabled={sourceFormat !== "json"} /></label><button className="primary-action" type="button" disabled={sourceFormat !== "json"} onClick={query}>执行查询</button></div>
          {queryResult && <pre className="json-code-view query-output">{queryResult}</pre>}
        </section>
      </>}
      {mode === "schema" && <>
        <div className="action-bar"><button type="button" onClick={validateSchema}>校验数据</button><button type="button" disabled={!schemaResult} onClick={() => copyText(schemaResult)}>复制结果</button></div>
        <div className="editor-grid">
          <label className="editor-block"><span>JSON 数据</span><textarea value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} /></label>
          <label className="editor-block"><span>JSON Schema</span><textarea value={schema} onChange={(event) => setSchema(event.target.value)} spellCheck={false} /></label>
        </div>
        {schemaResult && <pre className={schemaResult.startsWith("校验通过") ? "success-banner" : "error-banner"}>{schemaResult}</pre>}
      </>}
      {mode === "sql" && <>
        <div className="action-bar">
          <label>方言 <select value={dialect} onChange={(event) => setDialect(event.target.value as SqlDialect)}>{dialects.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>
          <label>关键字 <select value={keywordCase} onChange={(event) => setKeywordCase(event.target.value as SqlKeywordCase)}><option value="upper">大写</option><option value="lower">小写</option><option value="preserve">保持</option></select></label>
          <button type="button" onClick={runSqlFormatter}>格式化</button><button type="button" disabled={!sqlOutput} onClick={() => copyText(sqlOutput)}>复制结果</button>
        </div>
        <div className="editor-grid">
          <label className="editor-block"><span>输入 SQL</span><textarea value={sql} onChange={(event) => setSql(event.target.value)} spellCheck={false} /></label>
          <label className="editor-block"><span>格式化结果</span><textarea readOnly value={sqlOutput} placeholder="格式化结果将显示在这里" /></label>
        </div>
      </>}
      <CopyToast status={copyStatus} />
    </section>
  );
}

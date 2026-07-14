"use client";

import { useMemo, useState } from "react";
import { runRegex } from "../tool-logic/regex";

const flagOptions = ["g", "i", "m", "s", "u"];

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState("(?<name>[a-z]+)=(\\d+)");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("foo=12 bar=7");
  const [replacement, setReplacement] = useState("$<name>:$2");
  const result = useMemo(() => {
    try { return { ...runRegex(pattern, flags, input, replacement), error: "" }; }
    catch (caught) { return { matches: [], replaced: "", error: caught instanceof Error ? caught.message : "正则表达式无效" }; }
  }, [pattern, flags, input, replacement]);

  function toggleFlag(flag: string) {
    setFlags((current) => current.includes(flag) ? current.replace(flag, "") : `${current}${flag}`);
  }

  return (
    <section className="tool-panel">
      <div className="regex-pattern-row">
        <label className="text-control grow"><span>正则表达式</span><input value={pattern} onChange={(event) => setPattern(event.target.value)} spellCheck={false} /></label>
        <div className="flag-control"><span>Flags</span><div>{flagOptions.map((flag) => <button className={flags.includes(flag) ? "selected" : ""} type="button" key={flag} onClick={() => toggleFlag(flag)}>{flag}</button>)}</div></div>
      </div>
      {result.error && <div className="error-banner">{result.error}</div>}
      <div className="editor-grid">
        <label className="editor-block"><span>测试文本</span><textarea value={input} onChange={(event) => setInput(event.target.value)} /></label>
        <div className="editor-block"><span>匹配结果（{result.matches.length}）</span><div className="match-list">{result.matches.length ? result.matches.map((match, index) => <article key={`${match.index}-${index}`}><header><strong>#{index + 1}</strong><code>位置 {match.index}</code></header><code>{match.value || "（空匹配）"}</code>{match.captures.length > 0 && <small>捕获：{match.captures.map((value) => value ?? "未匹配").join(" · ")}</small>}{Object.keys(match.groups).length > 0 && <small>命名组：{JSON.stringify(match.groups)}</small>}</article>) : <div className="empty-card">没有匹配结果。</div>}</div></div>
      </div>
      <div className="editor-grid replacement-grid">
        <label className="text-control"><span>替换表达式</span><input value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>
        <label className="editor-block"><span>替换预览</span><textarea readOnly value={result.replaced} /></label>
      </div>
    </section>
  );
}

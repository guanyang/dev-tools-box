"use client";

import { useMemo, useState } from "react";
import { runRegex } from "../tool-logic/regex";

const flagOptions = [
  { id: "g", label: "全局匹配", shortLabel: "全局", description: "查找全部匹配，而不是只返回第一处" },
  { id: "i", label: "忽略大小写", shortLabel: "忽略大小写", description: "匹配时不区分英文字母大小写" },
  { id: "m", label: "多行模式", shortLabel: "多行", description: "让 ^ 和 $ 分别匹配每一行的开头与结尾" },
  { id: "s", label: "点号跨行", shortLabel: "跨行", description: "让 . 也能匹配换行符" },
  { id: "u", label: "Unicode 模式", shortLabel: "Unicode", description: "按完整 Unicode 字符处理转义与字符" },
] as const;

const regexPresets = [
  { id: "email", label: "邮箱地址", description: "常见用户名与域名格式", pattern: "[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", flags: "gi" },
  { id: "mobile", label: "中国大陆手机号", description: "支持可选的 +86 国家码", pattern: "(?:\\+?86[- ]?)?1[3-9]\\d{9}", flags: "g" },
  { id: "url", label: "HTTP(S) URL", description: "提取以 http 或 https 开头的链接", pattern: "https?:\\/\\/[^\\s<>\"']+", flags: "gi" },
  { id: "ipv4", label: "IPv4 地址", description: "限制每段数值为 0–255", pattern: "(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)){3}", flags: "g" },
  { id: "date", label: "日期 YYYY-MM-DD", description: "校验年月日的基本格式范围", pattern: "\\b\\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\\d|3[01])\\b", flags: "g" },
  { id: "time", label: "时间 HH:mm:ss", description: "24 小时制，秒数可省略", pattern: "(?:[01]\\d|2[0-3]):[0-5]\\d(?::[0-5]\\d)?", flags: "g" },
  { id: "uuid", label: "UUID", description: "匹配标准 8-4-4-4-12 格式", pattern: "\\b[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\\b", flags: "gi" },
  { id: "semver", label: "语义化版本", description: "支持预发布与构建元数据", pattern: "\\bv?(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-[0-9A-Za-z.-]+)?(?:\\+[0-9A-Za-z.-]+)?\\b", flags: "g" },
  { id: "hex-color", label: "十六进制颜色", description: "支持 3、6、8 位色值", pattern: "#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})\\b", flags: "gi" },
  { id: "chinese", label: "中文字符", description: "匹配常用汉字与扩展 A 区", pattern: "[\\u3400-\\u4DBF\\u4E00-\\u9FFF]+", flags: "gu" },
] as const;

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState("(?<name>[a-z]+)=(\\d+)");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("foo=12 bar=7");
  const [replacement, setReplacement] = useState("$<name>:$2");
  const activePreset = regexPresets.find((preset) => preset.pattern === pattern && preset.flags === flags);
  const result = useMemo(() => {
    try { return { ...runRegex(pattern, flags, input, replacement), error: "" }; }
    catch { return { matches: [], replaced: "", error: "正则表达式无效，请检查括号、转义符和量词是否完整。" }; }
  }, [pattern, flags, input, replacement]);

  function toggleFlag(flag: string) {
    setFlags((current) => current.includes(flag) ? current.replace(flag, "") : `${current}${flag}`);
  }

  function applyPreset(presetId: string) {
    const preset = regexPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setPattern(preset.pattern);
    setFlags(preset.flags);
    setReplacement("");
  }

  return (
    <section className="tool-panel regex-panel">
      <section className="regex-config-bar" aria-label="正则配置">
        <label className="text-control regex-pattern-control"><span>正则表达式</span><input value={pattern} onChange={(event) => setPattern(event.target.value)} spellCheck={false} /></label>
        <div className="flag-control"><span>Flags</span><div role="group" aria-label="正则 Flags">{flagOptions.map((flag) => <button className={flags.includes(flag.id) ? "selected" : ""} type="button" title={flag.description} key={flag.id} aria-label={`${flag.id} ${flag.label}：${flag.description}`} aria-pressed={flags.includes(flag.id)} onClick={() => toggleFlag(flag.id)}><code>{flag.id}</code><span>{flag.shortLabel}</span></button>)}</div></div>
        <label className="select-control regex-preset-control"><span>常用正则</span><select aria-label="常用正则" value={activePreset?.id ?? ""} onChange={(event) => applyPreset(event.target.value)}><option value="" disabled>选择模板…</option>{regexPresets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select><small>{activePreset?.description ?? "选择后填充表达式与 Flags"}</small></label>
      </section>
      {result.error && <div className="error-banner" role="alert">{result.error}</div>}
      <div className="editor-grid regex-test-grid">
        <label className="editor-block"><span>测试文本</span><textarea value={input} onChange={(event) => setInput(event.target.value)} /></label>
        <div className="editor-block"><span>匹配结果（{result.matches.length}）</span><div className="match-list">{result.matches.length ? result.matches.map((match, index) => <article key={`${match.index}-${index}`}><header><strong>#{index + 1}</strong><code>位置 {match.index}</code></header><code>{match.value || "（空匹配）"}</code>{match.captures.length > 0 && <small>捕获：{match.captures.map((value) => value ?? "未匹配").join(" · ")}</small>}{Object.keys(match.groups).length > 0 && <small>命名组：{JSON.stringify(match.groups)}</small>}</article>) : <div className="empty-card">没有匹配结果。</div>}</div></div>
      </div>
      <div className="editor-grid replacement-grid regex-replacement-grid">
        <label className="text-control"><span>替换表达式</span><input value={replacement} onChange={(event) => setReplacement(event.target.value)} /></label>
        <label className="editor-block"><span>替换预览</span><textarea readOnly value={result.replaced} /></label>
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import {
  COMMON_TIME_ZONES,
  calculateDateTimeDifference,
  describeCron,
  formatInTimeZone,
  formatTimeZoneLabel,
  nextCronRuns,
  normalizeUnixTimestamp,
  shiftLocalDateTime,
  zonedDateTimeToDate,
  type CronFieldCount,
  type DateTimeDifference,
  type DateTimeDuration,
} from "../tool-logic/time-cron";

type TimeCronTab = "timestamp" | "timezone" | "cron" | "calculate";

const tabs: Array<{ id: TimeCronTab; label: string }> = [
  { id: "timestamp", label: "时间戳转换" },
  { id: "timezone", label: "时区转换" },
  { id: "cron", label: "Cron 后续时间" },
  { id: "calculate", label: "时间计算" },
];

const cronFormats: Array<{
  fieldCount: CronFieldCount;
  label: string;
  fieldOrder: string;
  sample: string;
  fields: Array<{ name: string; range: string; description: string }>;
}> = [
  {
    fieldCount: 5,
    label: "5 段（标准）",
    fieldOrder: "分 时 日 月 周",
    sample: "*/15 9-18 * * 1-5",
    fields: [
      { name: "分", range: "0–59", description: "执行分钟" },
      { name: "时", range: "0–23", description: "24 小时制" },
      { name: "日", range: "1–31", description: "月内日期" },
      { name: "月", range: "1–12", description: "月份" },
      { name: "周", range: "0–7", description: "0、7 均为周日" },
    ],
  },
  {
    fieldCount: 6,
    label: "6 段（含秒）",
    fieldOrder: "秒 分 时 日 月 周",
    sample: "0 */15 9-18 * * 1-5",
    fields: [
      { name: "秒", range: "0–59", description: "执行秒数" },
      { name: "分", range: "0–59", description: "执行分钟" },
      { name: "时", range: "0–23", description: "24 小时制" },
      { name: "日", range: "1–31", description: "月内日期" },
      { name: "月", range: "1–12", description: "月份" },
      { name: "周", range: "0–7", description: "0、7 均为周日" },
    ],
  },
  {
    fieldCount: 7,
    label: "7 段（含秒和年）",
    fieldOrder: "秒 分 时 日 月 周 年",
    sample: "0 */15 9-18 * * 1-5 *",
    fields: [
      { name: "秒", range: "0–59", description: "执行秒数" },
      { name: "分", range: "0–59", description: "执行分钟" },
      { name: "时", range: "0–23", description: "24 小时制" },
      { name: "日", range: "1–31", description: "月内日期" },
      { name: "月", range: "1–12", description: "月份" },
      { name: "周", range: "0–7", description: "0、7 均为周日" },
      { name: "年", range: "1970–2199", description: "执行年份" },
    ],
  },
];

function currentLocalDateTime(offsetMilliseconds = 0): string {
  const now = new Date(Date.now() + offsetMilliseconds);
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 19);
}

export default function TimeCronTool() {
  const [activeTab, setActiveTab] = useState<TimeCronTab>("timestamp");
  const [timestamp, setTimestamp] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [timeZone, setTimeZone] = useState("Asia/Shanghai");
  const [dateResult, setDateResult] = useState<Date | null>(null);
  const [localDateTime, setLocalDateTime] = useState(currentLocalDateTime);
  const [sourceTimeZone, setSourceTimeZone] = useState("Asia/Shanghai");
  const [targetTimeZone, setTargetTimeZone] = useState("America/New_York");
  const [zoneResult, setZoneResult] = useState<Date | null>(null);
  const [cronFieldCount, setCronFieldCount] = useState<CronFieldCount>(5);
  const [cron, setCron] = useState("*/15 9-18 * * 1-5");
  const [cronTimeZone, setCronTimeZone] = useState("Asia/Shanghai");
  const [cronRuns, setCronRuns] = useState<Date[]>([]);
  const [differenceStart, setDifferenceStart] = useState(currentLocalDateTime);
  const [differenceEnd, setDifferenceEnd] = useState(() => currentLocalDateTime(3_600_000));
  const [differenceResult, setDifferenceResult] = useState<DateTimeDifference | null>(null);
  const [shiftBase, setShiftBase] = useState(currentLocalDateTime);
  const [shiftOperation, setShiftOperation] = useState<"add" | "subtract">("add");
  const [shiftDuration, setShiftDuration] = useState<DateTimeDuration>({
    years: 0,
    months: 0,
    days: 1,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [shiftResult, setShiftResult] = useState("");
  const [error, setError] = useState("");
  const cronFormat = cronFormats.find((format) => format.fieldCount === cronFieldCount)!;
  const cronDescription = useMemo(() => {
    try { return describeCron(cron, cronFieldCount); }
    catch (caught) { return caught instanceof Error ? caught.message : "Cron 解析失败"; }
  }, [cron, cronFieldCount]);

  function convertTimestamp() {
    try { setDateResult(normalizeUnixTimestamp(timestamp)); setError(""); }
    catch (caught) { setDateResult(null); setError(caught instanceof Error ? caught.message : "转换失败"); }
  }

  function calculateCron() {
    try { setCronRuns(nextCronRuns(cron, new Date(), 8, cronTimeZone, cronFieldCount)); setError(""); }
    catch (caught) { setCronRuns([]); setError(caught instanceof Error ? caught.message : "Cron 解析失败"); }
  }

  function convertTimeZone() {
    try { setZoneResult(zonedDateTimeToDate(localDateTime, sourceTimeZone)); setError(""); }
    catch (caught) { setZoneResult(null); setError(caught instanceof Error ? caught.message : "时区转换失败"); }
  }

  function runDifference() {
    try { setDifferenceResult(calculateDateTimeDifference(differenceStart, differenceEnd)); setError(""); }
    catch (caught) { setDifferenceResult(null); setError(caught instanceof Error ? caught.message : "时间差计算失败"); }
  }

  function runShift() {
    try { setShiftResult(shiftLocalDateTime(shiftBase, shiftDuration, shiftOperation)); setError(""); }
    catch (caught) { setShiftResult(""); setError(caught instanceof Error ? caught.message : "时间加减计算失败"); }
  }

  function updateShiftDuration(field: keyof DateTimeDuration, value: string) {
    setShiftDuration((current) => ({ ...current, [field]: Number(value) }));
    setShiftResult("");
    setError("");
  }

  function selectTab(tab: TimeCronTab) {
    setActiveTab(tab);
    setError("");
  }

  function changeCronFieldCount(nextFieldCount: CronFieldCount) {
    const fields = cron.trim().split(/\s+/);
    const nextFormat = cronFormats.find((format) => format.fieldCount === nextFieldCount)!;
    if (fields.length !== cronFieldCount) {
      setCron(nextFormat.sample);
    } else {
      const seconds = cronFieldCount === 5 ? "0" : fields[0];
      const coreFields = cronFieldCount === 5 ? fields : fields.slice(1, 6);
      const year = cronFieldCount === 7 ? fields[6] : "*";
      setCron(nextFieldCount === 5
        ? coreFields.join(" ")
        : nextFieldCount === 6
          ? [seconds, ...coreFields].join(" ")
          : [seconds, ...coreFields, year].join(" "));
    }
    setCronFieldCount(nextFieldCount);
    setCronRuns([]);
    setError("");
  }

  return (
    <section className="tool-panel">
      <div className="subtool-tabs" role="tablist" aria-label="时间与 Cron 功能">
        {tabs.map((tab) => (
          <button
            id={`time-cron-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-controls={`time-cron-panel-${tab.id}`}
            aria-selected={activeTab === tab.id}
            key={tab.id}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {activeTab === "timestamp" && <section
        id="time-cron-panel-timestamp"
        className="subtool-card"
        role="tabpanel"
        aria-labelledby="time-cron-tab-timestamp"
      >
        <header><h3>Unix 时间戳转换</h3><span>自动识别秒/毫秒</span></header>
        <label className="text-control"><span>时间戳</span><input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} /></label>
        <label className="select-control"><span>显示时区</span><select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>{COMMON_TIME_ZONES.map((zone) => <option value={zone} key={zone}>{formatTimeZoneLabel(zone)}</option>)}</select></label>
        <div className="action-bar"><button type="button" onClick={convertTimestamp}>转换</button><button type="button" onClick={() => setTimestamp(String(Math.floor(Date.now() / 1000)))}>使用当前时间</button></div>
        {dateResult && <div className="result-list"><code>{dateResult.toISOString()}</code><code>{formatInTimeZone(dateResult, timeZone)}</code><code>{Math.floor(dateResult.getTime() / 1000)} 秒</code><code>{dateResult.getTime()} 毫秒</code></div>}
      </section>}
      {activeTab === "timezone" && <section
        id="time-cron-panel-timezone"
        className="subtool-card"
        role="tabpanel"
        aria-labelledby="time-cron-tab-timezone"
      >
        <header><h3>源时区 → 目标时区</h3><span>输入源时区的本地时间</span></header>
        <label className="text-control"><span>本地日期时间</span><input type="datetime-local" step="1" value={localDateTime} onChange={(event) => setLocalDateTime(event.target.value)} /></label>
        <div className="inline-form">
          <label className="select-control"><span>源时区</span><select value={sourceTimeZone} onChange={(event) => setSourceTimeZone(event.target.value)}>{COMMON_TIME_ZONES.map((zone) => <option value={zone} key={zone}>{formatTimeZoneLabel(zone)}</option>)}</select></label>
          <label className="select-control"><span>目标时区</span><select value={targetTimeZone} onChange={(event) => setTargetTimeZone(event.target.value)}>{COMMON_TIME_ZONES.map((zone) => <option value={zone} key={zone}>{formatTimeZoneLabel(zone)}</option>)}</select></label>
        </div>
        <div className="action-bar"><button type="button" onClick={convertTimeZone}>转换时区</button></div>
        {zoneResult && <div className="result-list"><code>{formatInTimeZone(zoneResult, sourceTimeZone)}</code><code>→ {formatInTimeZone(zoneResult, targetTimeZone)}</code><code>{zoneResult.toISOString()}</code></div>}
      </section>}
      {activeTab === "cron" && <section
        id="time-cron-panel-cron"
        className="subtool-card"
        role="tabpanel"
        aria-labelledby="time-cron-tab-cron"
      >
        <header><h3>Cron 后续时间</h3><span>{cronFieldCount} 段，按所选时区计算</span></header>
        <div className="inline-form">
          <label className="select-control"><span>Cron 格式</span><select value={cronFieldCount} onChange={(event) => changeCronFieldCount(Number(event.target.value) as CronFieldCount)}>{cronFormats.map((format) => <option value={format.fieldCount} key={format.fieldCount}>{format.label}</option>)}</select></label>
          <label className="select-control"><span>计算时区</span><select value={cronTimeZone} onChange={(event) => { setCronTimeZone(event.target.value); setCronRuns([]); setError(""); }}>{COMMON_TIME_ZONES.map((zone) => <option value={zone} key={zone}>{formatTimeZoneLabel(zone)}</option>)}</select></label>
        </div>
        <label className="text-control"><span>{cronFormat.fieldOrder}</span><input value={cron} onChange={(event) => { setCron(event.target.value); setCronRuns([]); setError(""); }} /></label>
        <div className="cron-field-guide" aria-label={`${cronFieldCount} 段字段说明`}>
          {cronFormat.fields.map((field) => <div key={field.name}><strong>{field.name}</strong><code>{field.range}</code><span>{field.description}</span></div>)}
        </div>
        <div className="cron-syntax-help"><span><code>*</code> 任意值</span><span><code>,</code> 多个值</span><span><code>-</code> 范围</span><span><code>/</code> 步长</span></div>
        <div className="cron-help"><code>{cron || "请输入 Cron 表达式"}</code><span>{cronDescription}</span></div>
        <div className="action-bar"><button type="button" onClick={calculateCron}>计算后续 8 次</button></div>
        {cronRuns.length > 0 && <div className="result-list">{cronRuns.map((date) => <code key={date.toISOString()}>{formatInTimeZone(date, cronTimeZone)} · {date.toISOString()}</code>)}</div>}
      </section>}
      {activeTab === "calculate" && <section
        id="time-cron-panel-calculate"
        className="time-calculation-grid"
        role="tabpanel"
        aria-labelledby="time-cron-tab-calculate"
      >
        <section className="subtool-card">
          <header><h3>时间差计算</h3><span>按本地日历时间精确到秒</span></header>
          <label className="text-control"><span>开始时间</span><input type="datetime-local" step="1" value={differenceStart} onChange={(event) => { setDifferenceStart(event.target.value); setDifferenceResult(null); setError(""); }} /></label>
          <label className="text-control"><span>结束时间</span><input type="datetime-local" step="1" value={differenceEnd} onChange={(event) => { setDifferenceEnd(event.target.value); setDifferenceResult(null); setError(""); }} /></label>
          <div className="action-bar"><button type="button" onClick={runDifference}>计算时间差</button></div>
          {differenceResult && <div className="result-list">
            <code>{differenceResult.direction === 0 ? "两个时间相同" : differenceResult.direction > 0 ? "结束时间晚于开始时间" : "结束时间早于开始时间"}</code>
            <code>{differenceResult.days} 天 {String(differenceResult.hours).padStart(2, "0")} 时 {String(differenceResult.minutes).padStart(2, "0")} 分 {String(differenceResult.seconds).padStart(2, "0")} 秒</code>
            <code>总计 {differenceResult.totalSeconds.toLocaleString("zh-CN")} 秒</code>
          </div>}
        </section>
        <section className="subtool-card">
          <header><h3>时间加减运算</h3><span>年月按日历计算，其他单位按时长计算</span></header>
          <label className="text-control"><span>基准时间</span><input type="datetime-local" step="1" value={shiftBase} onChange={(event) => { setShiftBase(event.target.value); setShiftResult(""); setError(""); }} /></label>
          <label className="select-control"><span>运算方式</span><select value={shiftOperation} onChange={(event) => { setShiftOperation(event.target.value as "add" | "subtract"); setShiftResult(""); setError(""); }}><option value="add">加上</option><option value="subtract">减去</option></select></label>
          <div className="duration-grid">
            {([
              ["years", "年"],
              ["months", "月"],
              ["days", "日"],
              ["hours", "时"],
              ["minutes", "分"],
              ["seconds", "秒"],
            ] as Array<[keyof DateTimeDuration, string]>).map(([field, label]) => (
              <label className="number-control" key={field}><span>{label}</span><input type="number" min="0" step="1" value={shiftDuration[field]} onChange={(event) => updateShiftDuration(field, event.target.value)} /></label>
            ))}
          </div>
          <div className="action-bar"><button type="button" onClick={runShift}>计算结果</button></div>
          {shiftResult && <div className="result-list"><code>{shiftResult.replace("T", " ")}</code></div>}
        </section>
      </section>}
      {error && <div className="error-banner" role="alert">{error}</div>}
    </section>
  );
}

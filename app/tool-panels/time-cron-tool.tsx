"use client";

import { useState } from "react";
import {
  formatInTimeZone,
  nextCronRuns,
  normalizeUnixTimestamp,
  zonedDateTimeToDate,
} from "../tool-logic/time-cron";

const timeZones = ["UTC", "Asia/Shanghai", "Asia/Tokyo", "Europe/London", "America/New_York", "America/Los_Angeles"];

export default function TimeCronTool() {
  const [timestamp, setTimestamp] = useState(() => String(Math.floor(Date.now() / 1000)));
  const [timeZone, setTimeZone] = useState("Asia/Shanghai");
  const [dateResult, setDateResult] = useState<Date | null>(null);
  const [localDateTime, setLocalDateTime] = useState("2026-07-14T18:00");
  const [sourceTimeZone, setSourceTimeZone] = useState("Asia/Shanghai");
  const [targetTimeZone, setTargetTimeZone] = useState("America/New_York");
  const [zoneResult, setZoneResult] = useState<Date | null>(null);
  const [cron, setCron] = useState("*/15 9-18 * * 1-5");
  const [cronRuns, setCronRuns] = useState<Date[]>([]);
  const [error, setError] = useState("");

  function convertTimestamp() {
    try { setDateResult(normalizeUnixTimestamp(timestamp)); setError(""); }
    catch (caught) { setDateResult(null); setError(caught instanceof Error ? caught.message : "转换失败"); }
  }

  function calculateCron() {
    try { setCronRuns(nextCronRuns(cron, new Date(), 8)); setError(""); }
    catch (caught) { setCronRuns([]); setError(caught instanceof Error ? caught.message : "Cron 解析失败"); }
  }

  function convertTimeZone() {
    try { setZoneResult(zonedDateTimeToDate(localDateTime, sourceTimeZone)); setError(""); }
    catch (caught) { setZoneResult(null); setError(caught instanceof Error ? caught.message : "时区转换失败"); }
  }

  return (
    <section className="tool-panel dual-tool-grid">
      <section className="subtool-card">
        <header><h3>Unix 时间戳转换</h3><span>自动识别秒/毫秒</span></header>
        <label className="text-control"><span>时间戳</span><input value={timestamp} onChange={(event) => setTimestamp(event.target.value)} /></label>
        <label className="select-control"><span>显示时区</span><select value={timeZone} onChange={(event) => setTimeZone(event.target.value)}>{timeZones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
        <div className="action-bar"><button type="button" onClick={convertTimestamp}>转换</button><button type="button" onClick={() => setTimestamp(String(Math.floor(Date.now() / 1000)))}>使用当前时间</button></div>
        {dateResult && <div className="result-list"><code>{dateResult.toISOString()}</code><code>{formatInTimeZone(dateResult, timeZone)}</code><code>{Math.floor(dateResult.getTime() / 1000)} 秒</code><code>{dateResult.getTime()} 毫秒</code></div>}
      </section>
      <section className="subtool-card">
        <header><h3>源时区 → 目标时区</h3><span>输入源时区的本地时间</span></header>
        <label className="text-control"><span>本地日期时间</span><input type="datetime-local" step="1" value={localDateTime} onChange={(event) => setLocalDateTime(event.target.value)} /></label>
        <div className="inline-form">
          <label className="select-control"><span>源时区</span><select value={sourceTimeZone} onChange={(event) => setSourceTimeZone(event.target.value)}>{timeZones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
          <label className="select-control"><span>目标时区</span><select value={targetTimeZone} onChange={(event) => setTargetTimeZone(event.target.value)}>{timeZones.map((zone) => <option key={zone}>{zone}</option>)}</select></label>
        </div>
        <div className="action-bar"><button type="button" onClick={convertTimeZone}>转换时区</button></div>
        {zoneResult && <div className="result-list"><code>{formatInTimeZone(zoneResult, sourceTimeZone)}</code><code>→ {formatInTimeZone(zoneResult, targetTimeZone)}</code><code>{zoneResult.toISOString()}</code></div>}
      </section>
      <section className="subtool-card">
        <header><h3>Cron 后续时间</h3><span>5 字段，按 UTC 计算</span></header>
        <label className="text-control"><span>分 时 日 月 周</span><input value={cron} onChange={(event) => setCron(event.target.value)} /></label>
        <div className="cron-help"><code>*/15 9-18 * * 1-5</code><span>工作日 09:00–18:59，每 15 分钟</span></div>
        <div className="action-bar"><button type="button" onClick={calculateCron}>计算后续 8 次</button></div>
        {cronRuns.length > 0 && <div className="result-list">{cronRuns.map((date) => <code key={date.toISOString()}>{date.toISOString()}</code>)}</div>}
      </section>
      {error && <div className="error-banner full-span">{error}</div>}
    </section>
  );
}

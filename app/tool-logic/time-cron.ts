type CronField = {
  values: Set<number>;
  wildcard: boolean;
};

function parseCronField(
  source: string,
  min: number,
  max: number,
  name: string,
  normalizeSeven = false,
): CronField {
  const values = new Set<number>();
  const wildcard = source.startsWith("*");
  for (const segment of source.split(",")) {
    const [base, stepSource] = segment.split("/");
    const step = stepSource === undefined ? 1 : Number(stepSource);
    if (!Number.isInteger(step) || step < 1) throw new Error(`${name} 的步长无效`);

    let start: number;
    let end: number;
    if (base === "*") {
      start = min;
      end = max;
    } else if (base.includes("-")) {
      const parts = base.split("-").map(Number);
      if (parts.length !== 2) throw new Error(`${name} 的范围无效`);
      [start, end] = parts;
    } else {
      start = Number(base);
      end = stepSource === undefined ? start : max;
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < min || end > max || start > end) {
      throw new Error(`${name} 超出 ${min}-${max} 范围`);
    }
    for (let value = start; value <= end; value += step) {
      values.add(normalizeSeven && value === 7 ? 0 : value);
    }
  }
  return { values, wildcard };
}

export function nextCronRuns(expression: string, after = new Date(), count = 5): Date[] {
  const fields = expression.trim().split(/\s+/);
  if (fields.length !== 5) throw new Error("Cron 表达式需要 5 个字段：分 时 日 月 周");
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error("执行次数必须在 1 到 100 之间");
  }

  const minute = parseCronField(fields[0], 0, 59, "分钟");
  const hour = parseCronField(fields[1], 0, 23, "小时");
  const day = parseCronField(fields[2], 1, 31, "日期");
  const month = parseCronField(fields[3], 1, 12, "月份");
  const weekday = parseCronField(fields[4], 0, 7, "星期", true);
  const runs: Date[] = [];
  const candidate = new Date(Math.floor(after.getTime() / 60_000) * 60_000 + 60_000);
  const maxChecks = 60 * 24 * 366 * 5;

  for (let checks = 0; checks < maxChecks && runs.length < count; checks += 1) {
    const dayMatch = day.values.has(candidate.getUTCDate());
    const weekdayMatch = weekday.values.has(candidate.getUTCDay());
    const calendarDayMatches = day.wildcard
      ? weekdayMatch
      : weekday.wildcard
        ? dayMatch
        : dayMatch || weekdayMatch;
    if (
      minute.values.has(candidate.getUTCMinutes()) &&
      hour.values.has(candidate.getUTCHours()) &&
      month.values.has(candidate.getUTCMonth() + 1) &&
      calendarDayMatches
    ) {
      runs.push(new Date(candidate));
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  if (runs.length < count) throw new Error("未来 5 年内没有足够的匹配时间");
  return runs;
}

export function normalizeUnixTimestamp(input: string): Date {
  const value = Number(input.trim());
  if (!Number.isFinite(value)) throw new Error("请输入有效的 Unix 时间戳");
  const milliseconds = Math.abs(value) < 100_000_000_000 ? value * 1000 : value;
  const date = new Date(milliseconds);
  if (Number.isNaN(date.getTime())) throw new Error("时间戳超出有效范围");
  return date;
}

function datePartsInZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function zonedDateTimeToDate(input: string, timeZone: string): Date {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error("本地时间格式应为 YYYY-MM-DDTHH:mm");
  const [, year, month, day, hour, minute, second = "00"] = match;
  const desired = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second);
  let candidate = new Date(desired);

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = datePartsInZone(candidate, timeZone);
    const represented = Date.UTC(
      +parts.year,
      +parts.month - 1,
      +parts.day,
      +parts.hour,
      +parts.minute,
      +parts.second,
    );
    const adjustment = desired - represented;
    if (adjustment === 0) break;
    candidate = new Date(candidate.getTime() + adjustment);
  }

  const verified = datePartsInZone(candidate, timeZone);
  if (
    verified.year !== year || verified.month !== month || verified.day !== day ||
    verified.hour !== hour || verified.minute !== minute || verified.second !== second
  ) {
    throw new Error("该本地时间在所选时区不存在或不唯一");
  }
  return candidate;
}

export function formatInTimeZone(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone,
    dateStyle: "full",
    timeStyle: "long",
    hour12: false,
  }).format(date);
}

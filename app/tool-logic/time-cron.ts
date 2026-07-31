type CronField = {
  values: Set<number>;
  wildcard: boolean;
};

export type CronFieldCount = 5 | 6 | 7;

type ParsedCron = {
  second: CronField;
  minute: CronField;
  hour: CronField;
  day: CronField;
  month: CronField;
  weekday: CronField;
  year: CronField;
  fieldCount: CronFieldCount;
};

export const COMMON_TIME_ZONES = [
  "UTC",
  "Asia/Shanghai",
  "Asia/Hong_Kong",
  "Asia/Taipei",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Bangkok",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Madrid",
  "Europe/Rome",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "America/Vancouver",
  "America/Mexico_City",
  "America/Sao_Paulo",
  "America/Argentina/Buenos_Aires",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Pacific/Auckland",
  "Pacific/Honolulu",
  "Africa/Cairo",
  "Africa/Johannesburg",
] as const;

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

function parseCronExpression(expression: string, expectedFieldCount?: CronFieldCount): ParsedCron {
  const fields = expression.trim() ? expression.trim().split(/\s+/) : [];
  if (expectedFieldCount !== undefined && fields.length !== expectedFieldCount) {
    const labels = expectedFieldCount === 5 ? "分 时 日 月 周" : expectedFieldCount === 6 ? "秒 分 时 日 月 周" : "秒 分 时 日 月 周 年";
    throw new Error(`当前选择 ${expectedFieldCount} 段，表达式需要 ${expectedFieldCount} 个字段：${labels}`);
  }
  if (![5, 6, 7].includes(fields.length)) {
    throw new Error("Cron 表达式需要 5、6 或 7 个字段");
  }

  const fieldCount = fields.length as CronFieldCount;
  const offset = fieldCount === 5 ? 0 : 1;
  return {
    second: parseCronField(fieldCount === 5 ? "0" : fields[0], 0, 59, "秒"),
    minute: parseCronField(fields[offset], 0, 59, "分钟"),
    hour: parseCronField(fields[offset + 1], 0, 23, "小时"),
    day: parseCronField(fields[offset + 2], 1, 31, "日期"),
    month: parseCronField(fields[offset + 3], 1, 12, "月份"),
    weekday: parseCronField(fields[offset + 4], 0, 7, "星期", true),
    year: parseCronField(fieldCount === 7 ? fields[6] : "*", 1970, 2199, "年份"),
    fieldCount,
  };
}

function sortedValues(field: CronField): number[] {
  return [...field.values].sort((left, right) => left - right);
}

function matchesValues(field: CronField, expected: number[]): boolean {
  const values = sortedValues(field);
  return values.length === expected.length && values.every((value, index) => value === expected[index]);
}

function isConsecutive(values: number[]): boolean {
  return values.every((value, index) => index === 0 || value === values[index - 1] + 1);
}

function nextGreaterValue(values: number[], current: number): number | undefined {
  return values.find((value) => value > current);
}

function describeCalendar(day: CronField, month: CronField, weekday: CronField): string {
  const parts: string[] = [];
  if (!month.wildcard) parts.push(`${sortedValues(month).join("、")} 月`);

  const dayDescription = day.wildcard ? "" : `${sortedValues(day).join("、")} 日`;
  let weekdayDescription = "";
  if (!weekday.wildcard) {
    if (matchesValues(weekday, [1, 2, 3, 4, 5])) weekdayDescription = "工作日";
    else if (matchesValues(weekday, [0, 6])) weekdayDescription = "周末";
    else {
      const names = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      weekdayDescription = sortedValues(weekday).map((value) => names[value]).join("、");
    }
  }

  if (dayDescription && weekdayDescription) parts.push(`${dayDescription}或${weekdayDescription}`);
  else if (dayDescription || weekdayDescription) parts.push(dayDescription || weekdayDescription);
  return parts.join(" ");
}

function describeTime(minute: CronField, hour: CronField): { text: string; repeatsAllDay: boolean } {
  const minutes = sortedValues(minute);
  const hours = sortedValues(hour);

  if (hour.wildcard) {
    if (minute.wildcard) return { text: "每分钟", repeatsAllDay: true };
    if (minutes.length > 1 && isConsecutive(minutes)) {
      return { text: `每小时的 ${minutes[0]}–${minutes.at(-1)} 分`, repeatsAllDay: true };
    }
    if (minutes.length === 1) {
      return {
        text: minutes[0] === 0 ? "每小时整点" : `每小时的 ${String(minutes[0]).padStart(2, "0")} 分`,
        repeatsAllDay: true,
      };
    }
    return { text: `每小时的 ${minutes.map((value) => String(value).padStart(2, "0")).join("、")} 分`, repeatsAllDay: true };
  }

  const firstHour = String(hours[0]).padStart(2, "0");
  const lastHour = String(hours.at(-1)).padStart(2, "0");
  if (minute.wildcard && isConsecutive(hours)) {
    return { text: `${firstHour}:00–${lastHour}:59，每分钟`, repeatsAllDay: false };
  }
  if (minutes.length === 1) {
    const minuteText = String(minutes[0]).padStart(2, "0");
    if (hours.length === 1) return { text: `${firstHour}:${minuteText}`, repeatsAllDay: false };
    if (isConsecutive(hours)) {
      return { text: `${firstHour}:${minuteText}–${lastHour}:${minuteText}，每小时`, repeatsAllDay: false };
    }
    return {
      text: hours.map((value) => `${String(value).padStart(2, "0")}:${minuteText}`).join("、"),
      repeatsAllDay: false,
    };
  }
  if (isConsecutive(hours)) {
    return {
      text: `${firstHour}:00–${lastHour}:59，在每小时的 ${minutes.map((value) => String(value).padStart(2, "0")).join("、")} 分`,
      repeatsAllDay: false,
    };
  }
  return {
    text: `${hours.join("、")} 时的 ${minutes.map((value) => String(value).padStart(2, "0")).join("、")} 分`,
    repeatsAllDay: false,
  };
}

export function describeCron(expression: string, expectedFieldCount?: CronFieldCount): string {
  const fields = expression.trim().split(/\s+/);
  const { second, minute, hour, day, month, weekday, year, fieldCount } = parseCronExpression(expression, expectedFieldCount);
  const calendar = describeCalendar(day, month, weekday);
  const minuteIndex = fieldCount === 5 ? 0 : 1;
  const step = fields[minuteIndex].match(/^\*\/(\d+)$/);
  const hours = sortedValues(hour);

  let time = describeTime(minute, hour);
  if (step) {
    const frequency = `每 ${Number(step[1])} 分钟`;
    time = hour.wildcard
      ? { text: frequency, repeatsAllDay: true }
      : {
          text: isConsecutive(hours)
            ? `${String(hours[0]).padStart(2, "0")}:00–${String(hours.at(-1)).padStart(2, "0")}:59，${frequency}`
            : `${hours.join("、")} 时，${frequency}`,
          repeatsAllDay: false,
        };
  }

  let description = calendar ? `${calendar} ${time.text}` : time.repeatsAllDay ? time.text : `每天 ${time.text}`;
  if (fieldCount >= 6) {
    const secondStep = fields[0].match(/^\*\/(\d+)$/);
    const seconds = sortedValues(second);
    const secondDescription = secondStep
      ? `每 ${Number(secondStep[1])} 秒`
      : second.wildcard
        ? "每秒"
        : `第 ${seconds.map((value) => String(value).padStart(2, "0")).join("、")} 秒`;
    description = !calendar && minute.wildcard && hour.wildcard ? secondDescription : `${description}，${secondDescription}`;
  }
  if (fieldCount === 7 && !year.wildcard) description = `${fields[6]} 年 ${description}`;
  return description;
}

export function nextCronRuns(
  expression: string,
  after = new Date(),
  count = 5,
  timeZone = "UTC",
  expectedFieldCount?: CronFieldCount,
): Date[] {
  if (!Number.isInteger(count) || count < 1 || count > 100) {
    throw new Error("执行次数必须在 1 到 100 之间");
  }

  const { second, minute, hour, day, month, weekday, year, fieldCount } = parseCronExpression(expression, expectedFieldCount);
  const runs: Date[] = [];
  const seconds = sortedValues(second);
  const minutes = sortedValues(minute);
  const hours = sortedValues(hour);
  const months = sortedValues(month);
  const years = sortedValues(year);
  const currentLocal = datePartsInZone(after, timeZone);
  const candidate = new Date(Date.UTC(
    +currentLocal.year,
    +currentLocal.month - 1,
    +currentLocal.day,
    +currentLocal.hour,
    +currentLocal.minute,
  ));
  const finalYear = fieldCount === 7 ? years.at(-1)! : candidate.getUTCFullYear() + 5;
  const maxChecks = 1_000_000;

  for (let checks = 0; checks < maxChecks && runs.length < count && candidate.getUTCFullYear() <= finalYear; checks += 1) {
    const candidateYear = candidate.getUTCFullYear();
    if (!year.values.has(candidateYear)) {
      const nextYear = nextGreaterValue(years, candidateYear);
      if (nextYear === undefined) break;
      candidate.setUTCFullYear(nextYear, 0, 1);
      candidate.setUTCHours(0, 0, 0, 0);
      continue;
    }

    const candidateMonth = candidate.getUTCMonth() + 1;
    if (!month.values.has(candidateMonth)) {
      const nextMonth = nextGreaterValue(months, candidateMonth);
      if (nextMonth === undefined) candidate.setUTCFullYear(candidateYear + 1, 0, 1);
      else candidate.setUTCMonth(nextMonth - 1, 1);
      candidate.setUTCHours(0, 0, 0, 0);
      continue;
    }

    const dayMatch = day.values.has(candidate.getUTCDate());
    const weekdayMatch = weekday.values.has(candidate.getUTCDay());
    const calendarDayMatches = day.wildcard
      ? weekdayMatch
      : weekday.wildcard
        ? dayMatch
        : dayMatch || weekdayMatch;
    if (!calendarDayMatches) {
      candidate.setUTCDate(candidate.getUTCDate() + 1);
      candidate.setUTCHours(0, 0, 0, 0);
      continue;
    }

    const candidateHour = candidate.getUTCHours();
    if (!hour.values.has(candidateHour)) {
      const nextHour = nextGreaterValue(hours, candidateHour);
      if (nextHour === undefined) {
        candidate.setUTCDate(candidate.getUTCDate() + 1);
        candidate.setUTCHours(0, 0, 0, 0);
      } else {
        candidate.setUTCHours(nextHour, 0, 0, 0);
      }
      continue;
    }

    const candidateMinute = candidate.getUTCMinutes();
    if (!minute.values.has(candidateMinute)) {
      const nextMinute = nextGreaterValue(minutes, candidateMinute);
      if (nextMinute === undefined) {
        candidate.setUTCHours(candidateHour + 1, 0, 0, 0);
      } else {
        candidate.setUTCMinutes(nextMinute, 0, 0);
      }
      continue;
    }

    for (const candidateSecond of seconds) {
      const localDateTime = [
        `${candidate.getUTCFullYear()}-${String(candidate.getUTCMonth() + 1).padStart(2, "0")}-${String(candidate.getUTCDate()).padStart(2, "0")}`,
        `${String(candidateHour).padStart(2, "0")}:${String(candidateMinute).padStart(2, "0")}:${String(candidateSecond).padStart(2, "0")}`,
      ].join("T");
      try {
        const run = zonedDateTimeToDate(localDateTime, timeZone);
        if (run.getTime() > after.getTime()) runs.push(run);
      } catch (caught) {
        if (!(caught instanceof Error && caught.message === "该本地时间在所选时区不存在或不唯一")) throw caught;
      }
      if (runs.length === count) break;
    }
    candidate.setUTCMinutes(candidate.getUTCMinutes() + 1);
  }
  if (runs.length < count) throw new Error("未来支持的年份范围内没有足够的匹配时间");
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

export type DateTimeDuration = {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export type DateTimeDifference = {
  direction: -1 | 0 | 1;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
};

function parseLocalDateTime(input: string): Date {
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.0{1,3})?)?$/);
  if (!match) throw new Error("本地时间格式应为 YYYY-MM-DDTHH:mm:ss");
  const [, yearSource, monthSource, daySource, hourSource, minuteSource, secondSource = "00"] = match;
  const [year, month, day, hour, minute, second] = [
    yearSource,
    monthSource,
    daySource,
    hourSource,
    minuteSource,
    secondSource,
  ].map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  date.setUTCHours(hour, minute, second, 0);
  if (
    year < 1 || year > 9999 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute ||
    date.getUTCSeconds() !== second
  ) {
    throw new Error("请输入有效的本地日期时间");
  }
  return date;
}

function formatLocalDateTime(date: Date): string {
  const year = String(date.getUTCFullYear()).padStart(4, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  const second = String(date.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`;
}

export function calculateDateTimeDifference(start: string, end: string): DateTimeDifference {
  const differenceMilliseconds = parseLocalDateTime(end).getTime() - parseLocalDateTime(start).getTime();
  let remainder = Math.abs(differenceMilliseconds) / 1000;
  const days = Math.floor(remainder / 86_400);
  remainder %= 86_400;
  const hours = Math.floor(remainder / 3_600);
  remainder %= 3_600;
  const minutes = Math.floor(remainder / 60);
  const seconds = remainder % 60;
  return {
    direction: Math.sign(differenceMilliseconds) as -1 | 0 | 1,
    days,
    hours,
    minutes,
    seconds,
    totalSeconds: Math.abs(differenceMilliseconds) / 1000,
  };
}

export function shiftLocalDateTime(
  input: string,
  duration: DateTimeDuration,
  operation: "add" | "subtract",
): string {
  const values = Object.values(duration);
  if (values.some((value) => !Number.isInteger(value) || value < 0)) {
    throw new Error("时间增量必须是非负整数");
  }

  const source = parseLocalDateTime(input);
  const direction = operation === "add" ? 1 : -1;
  const totalMonth = source.getUTCFullYear() * 12 + source.getUTCMonth() +
    direction * (duration.years * 12 + duration.months);
  const targetYear = Math.floor(totalMonth / 12);
  const targetMonth = ((totalMonth % 12) + 12) % 12;
  if (targetYear < 1 || targetYear > 9999) throw new Error("计算结果超出 0001–9999 年范围");

  const lastDayOfTargetMonth = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const result = new Date(0);
  result.setUTCFullYear(targetYear, targetMonth, Math.min(source.getUTCDate(), lastDayOfTargetMonth));
  result.setUTCHours(source.getUTCHours(), source.getUTCMinutes(), source.getUTCSeconds(), 0);
  result.setUTCSeconds(
    result.getUTCSeconds() +
    direction * (
      duration.days * 86_400 +
      duration.hours * 3_600 +
      duration.minutes * 60 +
      duration.seconds
    ),
  );
  if (Number.isNaN(result.getTime()) || result.getUTCFullYear() < 1 || result.getUTCFullYear() > 9999) {
    throw new Error("计算结果超出 0001–9999 年范围");
  }
  return formatLocalDateTime(result);
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
  const match = input.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.0{1,3})?)?$/);
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
  }).format(date).replace(/\bGMT(?=[+-])/g, "UTC");
}

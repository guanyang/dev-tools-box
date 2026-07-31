import assert from "node:assert/strict";
import test from "node:test";

import { convertData, queryJsonPath } from "../app/tool-logic/data-format.ts";
import { hashBlob, hashBytes, hmacText } from "../app/tool-logic/hash.ts";
import {
  generateToken,
  generateUlid,
  generateUuidV4,
  generateUuidV7,
} from "../app/tool-logic/id.ts";
import { runRegex } from "../app/tool-logic/regex.ts";
import {
  COMMON_TIME_ZONES,
  calculateDateTimeDifference,
  describeCron,
  formatInTimeZone,
  nextCronRuns,
  shiftLocalDateTime,
  zonedDateTimeToDate,
} from "../app/tool-logic/time-cron.ts";

test("generates valid UUID, ULID and token values", () => {
  assert.match(generateUuidV4(), /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(generateUuidV7(1_700_000_000_000), /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.match(generateUlid(1_700_000_000_000), /^[0-9A-HJKMNP-TV-Z]{26}$/);
  assert.match(generateToken(32), /^[A-Za-z0-9_-]{32}$/);
});

test("calculates SHA-256 and HMAC checksums", async () => {
  assert.equal(
    await hashBytes(new TextEncoder().encode("abc"), "SHA-256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
  assert.equal(
    await hmacText("The quick brown fox jumps over the lazy dog", "key", "SHA-256"),
    "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
  );
  assert.equal(
    await hashBlob(new Blob(["abc"]), "SHA-256"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("finds deterministic upcoming cron runs", () => {
  const runs = nextCronRuns("*/15 9-10 * * 1-5", new Date("2026-07-13T09:07:00.000Z"), 3);
  assert.deepEqual(runs.map((date) => date.toISOString()), [
    "2026-07-13T09:15:00.000Z",
    "2026-07-13T09:30:00.000Z",
    "2026-07-13T09:45:00.000Z",
  ]);
  assert.throws(() => nextCronRuns("bad cron", new Date(), 1), /5、6 或 7 个字段/);
  assert.deepEqual(
    nextCronRuns("5/10 * * * *", new Date("2026-07-13T00:00:00.000Z"), 2).map((date) => date.toISOString()),
    ["2026-07-13T00:05:00.000Z", "2026-07-13T00:15:00.000Z"],
  );
  assert.deepEqual(
    nextCronRuns("0 9 * * 1-5", new Date("2026-07-12T23:00:00.000Z"), 2, "Asia/Shanghai")
      .map((date) => date.toISOString()),
    ["2026-07-13T01:00:00.000Z", "2026-07-14T01:00:00.000Z"],
  );
  assert.deepEqual(
    nextCronRuns("30 9 * * *", new Date("2026-03-07T15:00:00.000Z"), 2, "America/New_York")
      .map((date) => date.toISOString()),
    ["2026-03-08T13:30:00.000Z", "2026-03-09T13:30:00.000Z"],
  );
  assert.deepEqual(
    nextCronRuns("*/10 * * * * *", new Date("2026-07-13T00:00:04.000Z"), 3, "UTC", 6)
      .map((date) => date.toISOString()),
    ["2026-07-13T00:00:10.000Z", "2026-07-13T00:00:20.000Z", "2026-07-13T00:00:30.000Z"],
  );
  assert.deepEqual(
    nextCronRuns("0 0 9 1 1 * 2028", new Date("2026-07-13T00:00:00.000Z"), 1, "UTC", 7)
      .map((date) => date.toISOString()),
    ["2028-01-01T09:00:00.000Z"],
  );
  assert.throws(
    () => nextCronRuns("0 9 * * *", new Date(), 1, "UTC", 6),
    /当前选择 6 段/,
  );
  assert.equal(
    zonedDateTimeToDate("2026-07-14T18:00:00", "Asia/Shanghai").toISOString(),
    "2026-07-14T10:00:00.000Z",
  );
});

test("describes cron expressions and formats international UTC offsets", () => {
  assert.equal(describeCron("*/15 9-18 * * 1-5"), "工作日 09:00–18:59，每 15 分钟");
  assert.equal(describeCron("*/10 * * * * *", 6), "每 10 秒");
  assert.equal(describeCron("0 30 9 * * 1-5 2028", 7), "2028 年 工作日 09:30，第 00 秒");
  assert.equal(describeCron("30 9 * * 1-5"), "工作日 09:30");
  assert.equal(describeCron("0 0 1 * *"), "1 日 00:00");
  assert.throws(() => describeCron("not a cron"), /5、6 或 7 个字段/);
  assert.match(
    formatInTimeZone(new Date("2026-01-15T12:00:00.000Z"), "Asia/Shanghai"),
    /UTC\+8/,
  );
  assert.doesNotMatch(
    formatInTimeZone(new Date("2026-01-15T12:00:00.000Z"), "Asia/Shanghai"),
    /GMT/,
  );
  assert.ok(COMMON_TIME_ZONES.length >= 30);
  assert.ok(COMMON_TIME_ZONES.includes("Asia/Kolkata"));
  assert.ok(COMMON_TIME_ZONES.includes("Australia/Sydney"));
  assert.ok(COMMON_TIME_ZONES.includes("Africa/Johannesburg"));
});

test("calculates date-time differences and multi-unit shifts", () => {
  assert.deepEqual(
    calculateDateTimeDifference("2026-07-31T10:20:30", "2026-08-02T12:23:34"),
    { direction: 1, days: 2, hours: 2, minutes: 3, seconds: 4, totalSeconds: 180_184 },
  );
  assert.equal(
    calculateDateTimeDifference("2026-08-02T12:23:34", "2026-07-31T10:20:30").direction,
    -1,
  );
  assert.equal(
    shiftLocalDateTime(
      "2026-01-31T23:59:30",
      { years: 0, months: 1, days: 1, hours: 1, minutes: 1, seconds: 30 },
      "add",
    ),
    "2026-03-02T01:01:00",
  );
  assert.equal(
    shiftLocalDateTime(
      "2024-02-29T12:00:00",
      { years: 1, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 },
      "add",
    ),
    "2025-02-28T12:00:00",
  );
  assert.equal(
    shiftLocalDateTime(
      "2026-03-01T00:00:00",
      { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 1 },
      "subtract",
    ),
    "2026-02-28T23:59:59",
  );
  assert.throws(
    () => shiftLocalDateTime(
      "2026-01-01T00:00:00",
      { years: 0, months: -1, days: 0, hours: 0, minutes: 0, seconds: 0 },
      "add",
    ),
    /非负整数/,
  );
});

test("returns regex matches, groups and replacement output", () => {
  const result = runRegex("(?<name>[a-z]+)=(\\d+)", "g", "foo=12 bar=7", "$<name>:$2");
  assert.deepEqual(result.matches.map((match) => match.value), ["foo=12", "bar=7"]);
  assert.deepEqual(result.matches[0].groups, { name: "foo" });
  assert.equal(result.replaced, "foo:12 bar:7");
  assert.equal(runRegex("\\d+", "", "12 34").matches.length, 1);
  assert.deepEqual(runRegex("", "gu", "😀").matches.map((match) => match.index), [0, 2]);
});

test("converts JSON and YAML and evaluates JSONPath", () => {
  const yaml = convertData('{"service":"api","ports":[80,443]}', "json", "yaml");
  assert.match(yaml, /service: api/);
  assert.equal(
    convertData("service: api\nports:\n  - 80\n  - 443\n", "yaml", "json"),
    JSON.stringify({ service: "api", ports: [80, 443] }, null, 2),
  );
  assert.deepEqual(
    queryJsonPath('{"users":[{"name":"Ada"},{"name":"Lin"}]}', "$.users[*].name"),
    ["Ada", "Lin"],
  );
});

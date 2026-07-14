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
import { nextCronRuns, zonedDateTimeToDate } from "../app/tool-logic/time-cron.ts";

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
  assert.throws(() => nextCronRuns("bad cron", new Date(), 1), /5 个字段/);
  assert.deepEqual(
    nextCronRuns("5/10 * * * *", new Date("2026-07-13T00:00:00.000Z"), 2).map((date) => date.toISOString()),
    ["2026-07-13T00:05:00.000Z", "2026-07-13T00:15:00.000Z"],
  );
  assert.equal(
    zonedDateTimeToDate("2026-07-14T18:00:00", "Asia/Shanghai").toISOString(),
    "2026-07-14T10:00:00.000Z",
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

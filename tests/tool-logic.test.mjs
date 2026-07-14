import assert from "node:assert/strict";
import test from "node:test";

import { normalizeIntegerInput } from "../app/tool-logic/common.ts";
import { makeTextDiff, mergeTextLine } from "../app/tool-logic/doc-diff.ts";
import { makeJsonDiff, mergeJsonPathValue, transformJson } from "../app/tool-logic/json.ts";
import { generatePasswords } from "../app/tool-logic/password.ts";

test("keeps document diff and line merge logic outside React panels", () => {
  assert.deepEqual(makeTextDiff("same\nold", "same\nnew").map((line) => line.status), ["same", "changed"]);
  assert.deepEqual(mergeTextLine("a\nb", "a\nc", 1, "left-to-right"), {
    left: "a\nb",
    right: "a\nb",
  });
});

test("formats, compares and merges JSON values by path", () => {
  assert.equal(transformJson('{"a":1}', 2).value, '{\n  "a": 1\n}');
  assert.deepEqual(makeJsonDiff('{"a":1}', '{"a":2}').lines, [
    { path: "$.a", left: "1", right: "2", status: "changed" },
  ]);
  assert.equal(
    mergeJsonPathValue('{"a":1}', '{"a":2,"b":3}', "$.a", "left-to-right").value,
    '{\n  "a": 1,\n  "b": 3\n}',
  );
});

test("normalizes numeric controls and generates passwords from the selected pool", () => {
  assert.equal(normalizeIntegerInput("999", 1, 20), 20);
  const passwords = generatePasswords(16, 3, "ab01");
  assert.equal(passwords.length, 3);
  assert.ok(passwords.every((password) => password.length === 16 && /^[ab01]+$/.test(password)));
});

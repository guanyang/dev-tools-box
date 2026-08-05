import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("single-pane desktop views preserve the full split height", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const rule = styles.match(/\.resizable-split\.view-start,\s*\.resizable-split\.view-end\s*\{([^}]+)\}/);

  assert.ok(rule, "single-pane split rule should exist");
  assert.match(rule[1], /display:\s*grid;/, "single-pane views must keep a grid formatting context");
  assert.match(rule[1], /grid-template-rows:\s*minmax\(0,\s*1fr\);/, "single-pane views must stretch their child to the available height");
});

test("regex controls and results share an aligned visual frame", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const configRule = styles.match(/\.regex-config-bar\s*\{([^}]+)\}/);
  const resultRules = [...styles.matchAll(/\.regex-test-grid \.match-list\s*\{([^}]+)\}/g)];
  const resultStyles = resultRules.map((match) => match[1]).join("\n");

  assert.ok(configRule, "regex configuration rule should exist");
  assert.match(configRule[1], /align-items:\s*start;/, "all regex configuration labels must start on the same row");

  assert.ok(resultRules.length > 0, "regex result frame rule should exist");
  assert.match(resultStyles, /border:\s*1px solid var\(--line\);/, "the result area should use the same visible frame as the input area");
  assert.match(resultStyles, /background:\s*var\(--panel\);/, "the result area should use the same surface color as the input area");
  assert.match(resultStyles, /padding:\s*10px;/, "the result cards should sit inside a coordinated panel inset");
});

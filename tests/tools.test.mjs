import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  TOOL_CATEGORIES,
  DEFAULT_TOOL_ID,
  filterTools,
  normalizeToolId,
  toolboxHref,
  tools,
} from "../app/tools.ts";

test("exposes all stable tool IDs in navigation order", () => {
  assert.deepEqual(
    tools.map((tool) => tool.id),
    [
      "doc-diff",
      "json-format",
      "json-diff",
      "password",
      "codec",
      "id-generator",
      "hash-checksum",
      "time-cron",
      "regex-tester",
      "data-converter",
      "jwt-inspector",
      "qr-generator",
    ],
  );
  assert.equal(DEFAULT_TOOL_ID, "doc-diff");
  assert.equal(new Set(tools.map((tool) => tool.id)).size, tools.length);
  assert.ok(tools.every((tool) => TOOL_CATEGORIES.some((category) => category.id === tool.category)));
  assert.ok(tools.every((tool) => tool.keywords.length > 0));
  assert.ok(tools.every((tool) => tool.icon));
});

test("normalizes missing and unknown tool IDs to the default", () => {
  assert.equal(normalizeToolId("json-format"), "json-format");
  assert.equal(normalizeToolId(null), "doc-diff");
  assert.equal(normalizeToolId("unknown"), "doc-diff");
});

test("builds relative toolbox URLs for Popup navigation", () => {
  assert.equal(toolboxHref(), "toolbox.html");
  assert.equal(toolboxHref("codec"), "toolbox.html?tool=codec");
});

test("filters tools by search text and category", () => {
  assert.deepEqual(filterTools(tools, "yaml").map((tool) => tool.id), ["data-converter"]);
  assert.deepEqual(filterTools(tools, "", "security").map((tool) => tool.id), [
    "hash-checksum",
    "jwt-inspector",
  ]);
  assert.deepEqual(filterTools(tools, "正则", "text").map((tool) => tool.id), [
    "regex-tester",
  ]);
});

test("extension entries use shared navigation and history replacement", async () => {
  const [popup, toolbox] = await Promise.all([
    readFile(new URL("../extension/popup/main.tsx", import.meta.url), "utf8"),
    readFile(new URL("../extension/toolbox/main.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(popup, /tools\.map/);
  assert.match(popup, /toolboxHref\(tool\.id\)/);
  assert.match(popup, /target="_blank"/);
  assert.match(toolbox, /normalizeToolId\(params\.get\("tool"\)\)/);
  assert.match(toolbox, /window\.history\.replaceState/);
  assert.match(toolbox, /<DevToolsWorkbench/);
});

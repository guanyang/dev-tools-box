import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  DEFAULT_TOOL_ID,
  normalizeToolId,
  toolboxHref,
  tools,
} from "../app/tools.ts";

test("exposes the five stable tool IDs in navigation order", () => {
  assert.deepEqual(
    tools.map((tool) => tool.id),
    ["doc-diff", "json-format", "json-diff", "password", "codec"],
  );
  assert.equal(DEFAULT_TOOL_ID, "doc-diff");
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

import assert from "node:assert/strict";
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

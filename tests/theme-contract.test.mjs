import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("tool surfaces use semantic theme colors instead of fixed light backgrounds", async () => {
  const styles = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.doesNotMatch(
    styles,
    /background:\s*#(?:fff(?:fff)?|e8f4f1|f3f9f7|f6f8fb|eef7f5|f4f7fb|fff7e8|eefaf1|fff1f0)\b/i,
  );
  assert.match(styles, /:root\[data-theme="dark"\][\s\S]*--code:\s*#e7edf6/);
});

import assert from "node:assert/strict";
import test from "node:test";
import { isCommandPaletteShortcut, resolveTheme } from "../app/workbench-preferences.ts";

test("opens the command palette for Cmd/Ctrl+K only", () => {
  assert.equal(isCommandPaletteShortcut({ key: "k", metaKey: true, ctrlKey: false }), true);
  assert.equal(isCommandPaletteShortcut({ key: "K", metaKey: false, ctrlKey: true }), true);
  assert.equal(isCommandPaletteShortcut({ key: "k", metaKey: false, ctrlKey: false }), false);
});

test("resolves system theme without losing the stored preference", () => {
  assert.equal(resolveTheme("system", true), "dark");
  assert.equal(resolveTheme("system", false), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import test from "node:test";

const browsers = ["chrome", "edge", "firefox"];
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);

test("builds minimal MV3 packages for all target browsers", async () => {
  for (const browser of browsers) {
    const root = new URL(`../dist-extension/${browser}/`, import.meta.url);
    const manifest = JSON.parse(await readFile(new URL("manifest.json", root), "utf8"));

    assert.equal(manifest.manifest_version, 3);
    assert.equal(manifest.version, packageJson.version);
    assert.equal(manifest.action.default_popup, "popup.html");
    assert.equal(manifest.permissions, undefined);
    assert.equal(manifest.host_permissions, undefined);
    const popupHtml = await readFile(new URL("popup.html", root), "utf8");
    const toolboxHtml = await readFile(new URL("toolbox.html", root), "utf8");
    assert.doesNotMatch(popupHtml, /(?:src|href)=["']https?:/i);
    assert.doesNotMatch(toolboxHtml, /(?:src|href)=["']https?:/i);
    await access(new URL("icon-128.png", root));

    if (browser === "firefox") {
      assert.equal(
        manifest.browser_specific_settings.gecko.id,
        "dev-tools-box@local",
      );
    } else {
      assert.equal(manifest.browser_specific_settings, undefined);
    }
  }
});

test("creates versioned ZIP files with manifest at archive root", () => {
  for (const browser of browsers) {
    const zipPath = new URL(
      `../artifacts/dev-tools-box-${browser}-${packageJson.version}.zip`,
      import.meta.url,
    );
    const entries = execFileSync("unzip", ["-Z1", zipPath.pathname], {
      encoding: "utf8",
    }).trim().split("\n");
    assert.ok(entries.includes("manifest.json"));
    assert.ok(entries.includes("popup.html"));
    assert.ok(entries.includes("toolbox.html"));
    assert.ok(!entries.some((entry) => entry.startsWith(`${browser}/`)));
  }
});

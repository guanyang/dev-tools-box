import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("web app exposes an installable standalone manifest", async () => {
  const manifest = JSON.parse(await readFile(new URL("../public/manifest.webmanifest", import.meta.url), "utf8"));
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.start_url, "/");
  assert.ok(manifest.icons.some((icon) => icon.src === "/favicon.svg"));
});

test("service worker owns a versioned cache and supports updates", async () => {
  const source = await readFile(new URL("../public/sw.js", import.meta.url), "utf8");
  assert.match(source, /dev-tools-box-v1\.2\.0/);
  assert.match(source, /skipWaiting/);
  assert.match(source, /clients\.claim/);
  assert.match(source, /CACHE_URLS/);
});

test("website registers the service worker without coupling extension entrypoints", async () => {
  const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
  const pwaClient = await readFile(new URL("../app/pwa-client.tsx", import.meta.url), "utf8");
  assert.match(page, /PwaClient/);
  assert.match(pwaClient, /navigator\.serviceWorker\.register\("\/sw\.js"\)/);
});

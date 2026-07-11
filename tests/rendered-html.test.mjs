import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the developer tools workbench", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>开发者工具箱<\/title>/i);
  assert.match(html, /文档差异比对/);
  assert.match(html, /JSON 格式化/);
  assert.match(html, /JSON 差异比对/);
  assert.match(html, /随机密码生成/);
  assert.match(html, /信息编解码工具/);
  assert.match(html, /全部用左侧/);
  assert.match(html, /全部用右侧/);
  assert.match(html, /左合右/);
  assert.match(html, /右合左/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /展开工具栏/);
});

test("keeps the finished site free of starter preview artifacts", async () => {
  const [page, codec, styles, layout, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/codec.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /function mergeDocLine/);
  assert.match(page, /function mergeJsonPath/);
  assert.match(page, /useState\(false\)/);
  assert.match(page, /rail-expanded/);
  assert.match(page, /FileDiff/);
  assert.match(page, /GitCompareArrows/);
  assert.match(page, /function JsonHighlight/);
  assert.match(page, /function JsonEditor/);
  assert.match(page, /@uiw\/react-codemirror/);
  assert.match(page, /@codemirror\/lang-json/);
  assert.match(page, /prism-react-renderer/);
  assert.match(page, /passwordCount, setPasswordCount/);
  assert.match(page, /function normalizeIntegerInput/);
  assert.match(page, /Array\.from\(\{ length: count \}/);
  assert.match(page, /生成数量/);
  assert.match(page, /大写字母/);
  assert.match(page, /小写字母/);
  assert.match(page, /特殊符号/);
  assert.match(page, /max="256"/);
  assert.match(page, /max="1000"/);
  assert.match(page, /全部复制/);
  assert.match(page, /passwords\.join\("\\n"\)/);
  assert.ok(page.indexOf("password-controls") < page.indexOf("password-results-header"));
  assert.match(page, /new Uint32Array\(length\)/);
  assert.match(page, /codecMethods/);
  assert.match(page, /信息编解码工具/);
  assert.equal((codec.match(/group: "encode"/g) ?? []).length, 12);
  assert.equal((codec.match(/group: "decode"/g) ?? []).length, 12);
  assert.match(codec, /case "gzip-compress"/);
  assert.match(codec, /case "proto-hex"/);
  assert.match(page, /setPasswordLength\(event\.target\.value\)/);
  assert.match(page, /setPasswordCount\(event\.target\.value\)/);
  assert.match(page, /copy-toast visible/);
  assert.match(page, /copyTimerRef/);
  assert.doesNotMatch(page, /\{copyStatus &&/);
  assert.match(styles, /\.editor-block > span/);
  assert.match(styles, /user-select: text/);
  assert.match(styles, /cm-selectionBackground/);
  assert.match(styles, /\.action-bar\.codec-actions button:not\(:first-child\):disabled/);
  assert.match(layout, /title:\s*"开发者工具箱"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
  assert.doesNotMatch(page, /SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

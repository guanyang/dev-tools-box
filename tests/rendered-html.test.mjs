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
  assert.match(html, /ID 与 Token 生成/);
  assert.match(html, /哈希与文件校验/);
  assert.match(html, /时间与 Cron/);
  assert.match(html, /正则表达式测试/);
  assert.match(html, /JSON\/YAML 与 JSONPath/);
  assert.match(html, /全部用左侧/);
  assert.match(html, /全部用右侧/);
  assert.match(html, /左合右/);
  assert.match(html, /右合左/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /展开工具栏/);
});

test("keeps the workbench modular and free of starter preview artifacts", async () => {
  const [
    page,
    workbench,
    loaders,
    docDiffTool,
    jsonDiffTool,
    passwordTool,
    codecTool,
    shared,
    commonLogic,
    docDiffLogic,
    jsonLogic,
    passwordLogic,
    codec,
    styles,
    layout,
    packageJson,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/dev-tools-workbench.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-loaders.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels/doc-diff-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels/json-diff-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels/password-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels/codec-tool.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-panels/shared.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-logic/common.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-logic/doc-diff.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-logic/json.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/tool-logic/password.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/codec.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /DevToolsWorkbench/);
  assert.match(workbench, /export function DevToolsWorkbench/);
  assert.match(workbench, /toolLoaders\[activeTool\]/);
  assert.match(workbench, /filterTools\(tools, query, category\)/);
  assert.match(workbench, /FAVORITES_KEY/);
  assert.match(workbench, /RECENT_KEY/);
  assert.match(workbench, /window\.localStorage/);
  assert.match(workbench, /onToolChange\?\.\(toolId\)/);
  assert.match(workbench, /normalizeToolId\(initialTool\)/);
  assert.match(workbench, /useState\(false\)/);
  assert.match(workbench, /rail-expanded/);
  assert.match(workbench, /FileDiff/);
  assert.match(workbench, /GitCompareArrows/);
  assert.equal((loaders.match(/lazy\(\(\) => import/g) ?? []).length, 10);
  assert.match(docDiffTool, /mergeTextLine/);
  assert.match(docDiffLogic, /function makeTextDiff/);
  assert.match(jsonDiffTool, /mergeJsonPathValue/);
  assert.match(jsonLogic, /function makeJsonDiff/);
  assert.match(shared, /function JsonHighlight/);
  assert.match(shared, /function JsonEditor/);
  assert.match(shared, /@uiw\/react-codemirror/);
  assert.match(shared, /@codemirror\/lang-json/);
  assert.match(shared, /prism-react-renderer/);
  assert.match(passwordTool, /passwordCount, setPasswordCount/);
  assert.match(commonLogic, /function normalizeIntegerInput/);
  assert.match(passwordLogic, /function generatePasswords/);
  assert.match(passwordTool, /生成数量/);
  assert.match(passwordTool, /大写字母/);
  assert.match(passwordTool, /小写字母/);
  assert.match(passwordTool, /特殊符号/);
  assert.match(passwordTool, /max="256"/);
  assert.match(passwordTool, /max="1000"/);
  assert.match(passwordTool, /全部复制/);
  assert.match(passwordTool, /passwords\.join\("\\n"\)/);
  assert.ok(
    passwordTool.indexOf("password-controls") < passwordTool.indexOf("password-results-header"),
  );
  assert.match(passwordLogic, /new Uint32Array\(length\)/);
  assert.match(codecTool, /codecMethods/);
  assert.equal((codec.match(/group: "encode"/g) ?? []).length, 12);
  assert.equal((codec.match(/group: "decode"/g) ?? []).length, 12);
  assert.match(codec, /case "gzip-compress"/);
  assert.match(codec, /case "proto-hex"/);
  assert.match(passwordTool, /setPasswordLength\(event\.target\.value\)/);
  assert.match(passwordTool, /setPasswordCount\(event\.target\.value\)/);
  assert.match(shared, /copy-toast visible/);
  assert.match(shared, /copyTimerRef/);
  assert.doesNotMatch(shared, /\{copyStatus &&/);
  assert.match(styles, /\.editor-block > span/);
  assert.match(styles, /user-select: text/);
  assert.match(styles, /cm-selectionBackground/);
  assert.match(styles, /\.action-bar\.codec-actions button:not\(:first-child\):disabled/);
  assert.match(layout, /title:\s*"开发者工具箱"/);
  assert.doesNotMatch(layout, /codex-preview|_sites-preview/);
  assert.doesNotMatch(workbench, /SkeletonPreview/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);

  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});

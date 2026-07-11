# Cross-Browser Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build offline Chrome, Edge, and Firefox extensions whose Popup shortcuts open the packaged DevTools Box directly at a selected tool, and produce loadable directories plus versioned ZIP files.

**Architecture:** Keep the existing Vinext website build and add an independent Vite multi-page extension build. Extract the current workbench into a shared React component, centralize stable tool IDs and URL normalization, then render that component from both the website and the packaged `toolbox.html`; render a separate navigation-only Popup from the same tool registry.

**Tech Stack:** React 19, TypeScript 5.9, Vite 8, Vinext, Manifest V3, Node.js 22+, Node test runner, shell `zip`.

## Global Constraints

- Keep the existing `npm run dev`, `npm run build`, Cloudflare Worker build, and deployment behavior unchanged.
- Use Manifest V3 for Chrome, Edge, and Firefox.
- Package all JavaScript, CSS, fonts, and icons locally; do not load remote code or runtime resources.
- Do not add a background service worker, content script, host permission, `activeTab`, `tabs`, or `storage` permission.
- Popup is navigation-only; it must not execute the five tools itself.
- Valid tool IDs are exactly `doc-diff`, `json-format`, `json-diff`, `password`, and `codec`.
- Missing or invalid `tool` query parameters select `doc-diff` without showing an error.
- Switching tools updates the current URL without reloading; tool input and output are not persisted.
- Produce separately named Chrome, Edge, and Firefox loadable directories and ZIP files, even when Chromium contents are identical.
- Each ZIP root must contain `manifest.json` directly.
- Read the extension version from the root `package.json`; preserve the user's current `1.0.0` workspace change and do not reset it.
- Browser store submission materials, signing, screenshots, privacy policy, and automatic store publishing are out of scope.

---

## File Structure

### Shared application files

- Create `app/tools.ts`: stable tool IDs, display metadata, parameter validation, and internal toolbox URL creation.
- Create `app/dev-tools-workbench.tsx`: the current workbench UI and state, with injectable initial tool and tool-change callback.
- Modify `app/page.tsx`: retain the Next client entry and render only `DevToolsWorkbench`.
- Modify `app/globals.css`: add system-font fallbacks that also work when the page is not rendered by `next/font`.

### Extension source and assets

- Create `extension/popup.html`: Vite HTML entry for the toolbar Popup.
- Create `extension/popup/main.tsx`: render the navigation-only Popup.
- Create `extension/popup/popup.css`: Popup-specific layout and interaction styles.
- Create `extension/toolbox.html`: Vite HTML entry for the full offline workbench.
- Create `extension/toolbox/main.tsx`: read and update the `tool` query parameter and render `DevToolsWorkbench`.
- Create `extension/public/icon-{16,32,48,96,128}.png`: packaged extension icons derived from the existing `public/favicon.svg`.

### Build, packaging, tests, and docs

- Create `vite.extension.config.ts`: multi-page extension build and browser-specific manifest emission.
- Create `scripts/build-extensions.mjs`: build all three browser targets deterministically.
- Create `scripts/package-extensions.mjs`: create versioned ZIP files with manifest at the archive root.
- Create `tests/tools.test.mjs`: unit tests for tool normalization and URLs.
- Create `tests/extension-build.test.mjs`: validate manifests, assets, HTML entrypoints, and ZIP structure.
- Modify `tests/rendered-html.test.mjs`: update source-structure assertions after extracting the workbench.
- Modify `package.json`: add extension scripts while preserving the current version.
- Modify `package-lock.json`: synchronize both root version fields to the current `package.json` version `1.0.0` without changing dependencies.
- Modify `.gitignore`: ignore generated `dist-extension/` and `artifacts/` directories.
- Modify `README.md`: document extension commands, local loading, offline behavior, and generated artifacts.

---

### Task 1: Stable Tool Navigation Contract

**Files:**
- Create: `app/tools.ts`
- Create: `tests/tools.test.mjs`

**Interfaces:**
- Consumes: no earlier task interfaces.
- Produces: `ToolId`, `ToolDefinition`, `DEFAULT_TOOL_ID`, `tools`, `isToolId(value)`, `normalizeToolId(value)`, and `toolboxHref(toolId?)` for the workbench, Popup, and toolbox entry.

- [ ] **Step 1: Write failing unit tests for tool IDs and extension URLs**

Create `tests/tools.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the focused test and verify that the module is missing**

Run:

```bash
node --experimental-strip-types --test tests/tools.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `app/tools.ts`.

- [ ] **Step 3: Implement the tool registry and URL helpers**

Create `app/tools.ts`:

```ts
export const TOOL_IDS = [
  "doc-diff",
  "json-format",
  "json-diff",
  "password",
  "codec",
] as const;

export type ToolId = (typeof TOOL_IDS)[number];

export type ToolDefinition = {
  id: ToolId;
  label: string;
  description: string;
};

export const DEFAULT_TOOL_ID: ToolId = "doc-diff";

export const tools: ToolDefinition[] = [
  {
    id: "doc-diff",
    label: "文档差异比对",
    description: "逐行比较两段文本，快速定位新增、删除和修改。",
  },
  {
    id: "json-format",
    label: "JSON 格式化",
    description: "解析、校验并输出可读的 JSON 结构。",
  },
  {
    id: "json-diff",
    label: "JSON 差异比对",
    description: "按路径比较 JSON 值，忽略对象键顺序。",
  },
  {
    id: "password",
    label: "随机密码生成",
    description: "生成可复制的强密码，并支持字符集和长度控制。",
  },
  {
    id: "codec",
    label: "信息编解码工具",
    description: "提供 24 种常用编码、解码、摘要和解析方式。",
  },
];

export function isToolId(value: string | null | undefined): value is ToolId {
  return TOOL_IDS.includes(value as ToolId);
}

export function normalizeToolId(value: string | null | undefined): ToolId {
  return isToolId(value) ? value : DEFAULT_TOOL_ID;
}

export function toolboxHref(toolId?: ToolId): string {
  return toolId ? `toolbox.html?tool=${encodeURIComponent(toolId)}` : "toolbox.html";
}
```

- [ ] **Step 4: Run the focused tests and type-check**

Run:

```bash
node --experimental-strip-types --test tests/tools.test.mjs
npx tsc --noEmit
```

Expected: three tests PASS and TypeScript exits with code 0.

- [ ] **Step 5: Commit the navigation contract**

```bash
git add app/tools.ts tests/tools.test.mjs
git commit -m "feat: define extension tool navigation contract"
```

---

### Task 2: Shared Workbench and URL-Aware Tool Selection

**Files:**
- Create: `app/dev-tools-workbench.tsx`
- Modify: `app/page.tsx:1-925`
- Modify: `app/globals.css:20-38`
- Modify: `tests/rendered-html.test.mjs:41-100`

**Interfaces:**
- Consumes: `ToolId`, `DEFAULT_TOOL_ID`, `normalizeToolId`, and `tools` from `app/tools.ts`.
- Produces: `DevToolsWorkbench({ initialTool, onToolChange })`, where `initialTool?: string | null` and `onToolChange?: (toolId: ToolId) => void`.

- [ ] **Step 1: Update rendered-source tests to require a shared workbench**

In `tests/rendered-html.test.mjs`, change the source reads and assertions to:

```js
const [page, workbench, codec, styles, layout, packageJson] = await Promise.all([
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/dev-tools-workbench.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/codec.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  readFile(new URL("../package.json", import.meta.url), "utf8"),
]);

assert.match(page, /DevToolsWorkbench/);
assert.match(workbench, /export function DevToolsWorkbench/);
assert.match(workbench, /function mergeDocLine/);
assert.match(workbench, /function mergeJsonPath/);
assert.match(workbench, /onToolChange\?\.\(toolId\)/);
assert.match(workbench, /normalizeToolId\(initialTool\)/);
```

Move every existing assertion that currently examines workbench implementation details from `page` to `workbench`. Keep the server-rendered HTML assertions unchanged.

- [ ] **Step 2: Run the rendered HTML test and verify that the shared file is missing**

Run:

```bash
npm run build
node --experimental-strip-types --test tests/rendered-html.test.mjs
```

Expected: FAIL because `app/dev-tools-workbench.tsx` does not exist.

- [ ] **Step 3: Extract the current workbench without changing tool behavior**

Move the current contents of `app/page.tsx` into `app/dev-tools-workbench.tsx`, retain the leading `"use client"`, and make these exact structural edits:

```tsx
import {
  Binary,
  Braces,
  FileDiff,
  GitCompareArrows,
  KeyRound,
  type LucideIcon,
} from "lucide-react";
import { DEFAULT_TOOL_ID, normalizeToolId, tools, type ToolId } from "./tools";

const toolIcons: Record<ToolId, LucideIcon> = {
  "doc-diff": FileDiff,
  "json-format": Braces,
  "json-diff": GitCompareArrows,
  password: KeyRound,
  codec: Binary,
};

export type DevToolsWorkbenchProps = {
  initialTool?: string | null;
  onToolChange?: (toolId: ToolId) => void;
};

export function DevToolsWorkbench({
  initialTool = DEFAULT_TOOL_ID,
  onToolChange,
}: DevToolsWorkbenchProps) {
  const [activeTool, setActiveTool] = useState<ToolId>(() => normalizeToolId(initialTool));

  function selectTool(toolId: ToolId) {
    setActiveTool(toolId);
    onToolChange?.(toolId);
  }

}
```

Between the shown imports and component wrapper, move the existing helper types, constants, and functions from `app/page.tsx` verbatim. Inside the wrapper, move the existing state, derived values, event handlers, and returned JSX verbatim except for the explicitly listed `activeTool`, `tools`, and navigation-button edits. This is a file move, not a rewrite of the tool implementations.

Delete the old local `ToolId` type and `tools` array. In navigation rendering, replace `onClick={() => setActiveTool(tool.id)}` with `onClick={() => selectTool(tool.id)}` and resolve icons through:

```tsx
{tools.map((tool) => {
  const ToolIcon = toolIcons[tool.id];
  return (
    <button
      className={activeTool === tool.id ? "tool-tab active" : "tool-tab"}
      key={tool.id}
      onClick={() => selectTool(tool.id)}
      aria-label={tool.label}
      title={isRailExpanded ? undefined : tool.label}
      type="button"
    >
      <span className="tool-icon">
        <ToolIcon aria-hidden="true" size={24} strokeWidth={1.9} />
      </span>
      <span className="tool-copy">
        <strong>{tool.label}</strong>
        <small>{tool.description}</small>
      </span>
    </button>
  );
})}
```

Do not refactor diff, JSON, password, codec, or copy behavior during this move.

- [ ] **Step 4: Replace the website entry with a thin wrapper**

Replace `app/page.tsx` with:

```tsx
"use client";

import { DevToolsWorkbench } from "./dev-tools-workbench";

export default function Home() {
  return <DevToolsWorkbench />;
}
```

- [ ] **Step 5: Add extension-safe font fallbacks**

In `app/globals.css`, keep the Next font variables first but add system fonts that require no packaged font files:

```css
body {
  min-height: 100vh;
  margin: 0;
  background:
    linear-gradient(180deg, rgba(15, 123, 108, 0.08), rgba(15, 123, 108, 0) 280px),
    var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans), system-ui, -apple-system, "Segoe UI",
    "Noto Sans SC", "Microsoft YaHei", sans-serif;
}
```

Keep existing monospace declarations and ensure each ends with a generic `monospace` fallback.

- [ ] **Step 6: Run website regression tests and lint**

Run:

```bash
npm test
npm run lint
```

Expected: existing codec and rendered HTML tests PASS; lint exits with code 0. At this point `npm test` does not yet include extension packaging.

- [ ] **Step 7: Commit the shared workbench extraction**

```bash
git add app/page.tsx app/dev-tools-workbench.tsx app/globals.css tests/rendered-html.test.mjs
git commit -m "refactor: share developer tools workbench"
```

---

### Task 3: Offline Popup and Toolbox Entrypoints

**Files:**
- Create: `extension/popup.html`
- Create: `extension/popup/main.tsx`
- Create: `extension/popup/popup.css`
- Create: `extension/toolbox.html`
- Create: `extension/toolbox/main.tsx`
- Create: `extension/public/icon-16.png`
- Create: `extension/public/icon-32.png`
- Create: `extension/public/icon-48.png`
- Create: `extension/public/icon-96.png`
- Create: `extension/public/icon-128.png`
- Modify: `tests/tools.test.mjs`

**Interfaces:**
- Consumes: `tools`, `toolboxHref`, `normalizeToolId`, `ToolId`, and `DevToolsWorkbench`.
- Produces: two Vite HTML entrypoints, with Popup links targeting packaged `toolbox.html` and the toolbox entry synchronizing its query string through `history.replaceState`.

- [ ] **Step 1: Add a failing source-contract test for Popup and toolbox behavior**

Append to `tests/tools.test.mjs`:

```js
import { readFile } from "node:fs/promises";

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
```

- [ ] **Step 2: Run the focused test and verify that extension entries are missing**

Run:

```bash
node --experimental-strip-types --test tests/tools.test.mjs
```

Expected: existing tests PASS and the new test FAIL with `ENOENT` for an extension entry.

- [ ] **Step 3: Create the Popup HTML and React entry**

Create `extension/popup.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>开发者工具箱</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./popup/main.tsx"></script>
  </body>
</html>
```

Create `extension/popup/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { toolboxHref, tools } from "../../app/tools";
import "./popup.css";

function Popup() {
  return (
    <main className="popup-shell">
      <header>
        <span className="popup-mark">DT</span>
        <div>
          <h1>开发者工具箱</h1>
          <p>选择工具，在离线标签页中打开。</p>
        </div>
      </header>
      <nav aria-label="工具快捷入口">
        {tools.map((tool) => (
          <a
            href={toolboxHref(tool.id)}
            key={tool.id}
            rel="noopener"
            target="_blank"
          >
            <strong>{tool.label}</strong>
            <span>{tool.description}</span>
          </a>
        ))}
      </nav>
      <a className="open-all" href={toolboxHref()} rel="noopener" target="_blank">
        打开完整工具箱
      </a>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
);
```

- [ ] **Step 4: Style the Popup as a compact navigation surface**

Create `extension/popup/popup.css` with a 380px-wide system-font layout, visible keyboard focus, and no imported remote assets:

```css
:root {
  color: #18202f;
  background: #f5f7fb;
  font-family: system-ui, -apple-system, "Segoe UI", "Noto Sans SC",
    "Microsoft YaHei", sans-serif;
}

* { box-sizing: border-box; }
body { width: 380px; margin: 0; }
.popup-shell { padding: 16px; }
header { display: flex; gap: 12px; align-items: center; margin-bottom: 14px; }
.popup-mark {
  display: grid; width: 42px; height: 42px; place-items: center;
  border-radius: 8px; background: #111827; color: #fff; font-weight: 800;
}
h1 { margin: 0; font-size: 17px; }
p { margin: 3px 0 0; color: #68758a; font-size: 12px; }
nav { display: grid; gap: 8px; }
a {
  display: grid; gap: 2px; padding: 10px 12px; border: 1px solid #d8e1ec;
  border-radius: 8px; background: #fff; color: inherit; text-decoration: none;
}
a:hover, a:focus-visible { border-color: #0f7b6c; outline: 2px solid #b8ded7; }
a span { color: #68758a; font-size: 11px; }
.open-all {
  display: block; margin-top: 12px; background: #0f7b6c; color: #fff;
  text-align: center; font-weight: 700;
}
```

- [ ] **Step 5: Create the full toolbox entry with URL synchronization**

Create `extension/toolbox.html`:

```html
<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>开发者工具箱</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./toolbox/main.tsx"></script>
  </body>
</html>
```

Create `extension/toolbox/main.tsx`:

```tsx
import React from "react";
import { createRoot } from "react-dom/client";
import { DevToolsWorkbench } from "../../app/dev-tools-workbench";
import { normalizeToolId, type ToolId } from "../../app/tools";
import "../../app/globals.css";

const params = new URLSearchParams(window.location.search);
const initialTool = normalizeToolId(params.get("tool"));

function updateToolUrl(toolId: ToolId) {
  const url = new URL(window.location.href);
  url.searchParams.set("tool", toolId);
  window.history.replaceState(null, "", url);
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <DevToolsWorkbench initialTool={initialTool} onToolChange={updateToolUrl} />
  </React.StrictMode>,
);
```

- [ ] **Step 6: Export and add local PNG icons**

Use macOS `sips` to export the existing SVG into committed PNG assets:

```bash
mkdir -p extension/public
for size in 16 32 48 96 128; do
  sips -s format png -z "$size" "$size" public/favicon.svg \
    --out "extension/public/icon-$size.png"
done
file extension/public/icon-*.png
```

Expected: five files reported as PNG images at the requested dimensions. These files are source assets and must be committed; builds must not require `sips`.

- [ ] **Step 7: Run navigation tests and type-check**

Run:

```bash
node --experimental-strip-types --test tests/tools.test.mjs
npx tsc --noEmit
```

Expected: all navigation tests PASS and TypeScript exits with code 0.

- [ ] **Step 8: Commit extension UI entrypoints**

```bash
git add extension tests/tools.test.mjs
git commit -m "feat: add offline extension popup and toolbox"
```

---

### Task 4: Three-Browser Builds and Versioned ZIP Packages

**Files:**
- Create: `vite.extension.config.ts`
- Create: `scripts/build-extensions.mjs`
- Create: `scripts/package-extensions.mjs`
- Create: `tests/extension-build.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: `extension/popup.html`, `extension/toolbox.html`, `extension/public/icon-*.png`, and root `package.json` version.
- Produces: `dist-extension/{chrome,edge,firefox}` and `artifacts/dev-tools-box-{browser}-<version>.zip`.

- [ ] **Step 1: Write failing build-artifact tests**

Create `tests/extension-build.test.mjs`:

```js
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
```

- [ ] **Step 2: Run the focused test and verify artifacts are absent**

Run:

```bash
node --experimental-strip-types --test tests/extension-build.test.mjs
```

Expected: FAIL with `ENOENT` for `dist-extension/chrome/manifest.json`.

- [ ] **Step 3: Implement the extension Vite configuration and manifest emission**

Create `vite.extension.config.ts`:

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

type TargetBrowser = "chrome" | "edge" | "firefox";

const browser = (process.env.EXTENSION_BROWSER ?? "chrome") as TargetBrowser;
if (!["chrome", "edge", "firefox"].includes(browser)) {
  throw new Error(`Unsupported EXTENSION_BROWSER: ${browser}`);
}

const packageJson = JSON.parse(readFileSync(resolve("package.json"), "utf8"));

function extensionAssets(): Plugin {
  return {
    name: "extension-assets",
    generateBundle() {
      const manifest = {
        manifest_version: 3,
        name: "开发者工具箱",
        description: "离线使用文档差异、JSON、密码生成和编解码工具。",
        version: packageJson.version,
        offline_enabled: true,
        action: {
          default_title: "开发者工具箱",
          default_popup: "popup.html",
          default_icon: {
            16: "icon-16.png",
            32: "icon-32.png",
          },
        },
        icons: {
          16: "icon-16.png",
          32: "icon-32.png",
          48: "icon-48.png",
          96: "icon-96.png",
          128: "icon-128.png",
        },
        ...(browser === "firefox"
          ? {
              browser_specific_settings: {
                gecko: {
                  id: "dev-tools-box@local",
                  strict_min_version: "109.0",
                },
              },
            }
          : {}),
      };

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: `${JSON.stringify(manifest, null, 2)}\n`,
      });
    },
  };
}

export default defineConfig({
  root: resolve("extension"),
  base: "./",
  plugins: [react(), extensionAssets()],
  build: {
    emptyOutDir: true,
    outDir: resolve(`dist-extension/${browser}`),
    rollupOptions: {
      input: {
        popup: resolve("extension/popup.html"),
        toolbox: resolve("extension/toolbox.html"),
      },
    },
  },
});
```

The `extension` root makes Vite emit the two HTML inputs as root-level `popup.html` and `toolbox.html`, matching the manifest paths. Vite also copies `extension/public/` into the target root, so no icon-copy plugin code is needed.

- [ ] **Step 4: Implement deterministic three-target builds**

Create `scripts/build-extensions.mjs`:

```js
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const browsers = ["chrome", "edge", "firefox"];
rmSync("dist-extension", { force: true, recursive: true });

for (const browser of browsers) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["exec", "--", "vite", "build", "--config", "vite.extension.config.ts"],
    {
      env: { ...process.env, EXTENSION_BROWSER: browser },
      stdio: "inherit",
    },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
}
```

- [ ] **Step 5: Implement ZIP packaging with a flat archive root**

Create `scripts/package-extensions.mjs`:

```js
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const browsers = ["chrome", "edge", "firefox"];
const { version } = JSON.parse(readFileSync("package.json", "utf8"));
mkdirSync("artifacts", { recursive: true });

for (const browser of browsers) {
  const archive = resolve(`artifacts/dev-tools-box-${browser}-${version}.zip`);
  rmSync(archive, { force: true });
  execFileSync("zip", ["-qr", archive, "."], {
    cwd: resolve(`dist-extension/${browser}`),
    stdio: "inherit",
  });
}
```

- [ ] **Step 6: Add package scripts and generated-directory ignores**

In `package.json`, preserve version `1.0.0` and add:

```json
{
  "scripts": {
    "extension:dev": "EXTENSION_BROWSER=chrome vite --config vite.extension.config.ts",
    "extension:build": "node scripts/build-extensions.mjs",
    "extension:package": "npm run extension:build && node scripts/package-extensions.mjs",
    "test": "npm run build && npm run extension:package && node --experimental-strip-types --test tests/*.test.mjs"
  }
}
```

Retain every existing script and dependency not shown. Run the following command to synchronize the two stale `0.1.0` root-version fields in `package-lock.json` with the user-owned `package.json` version change; do not add a ZIP or extension framework dependency:

```bash
npm install --package-lock-only --ignore-scripts
```

Expected: `package-lock.json` root `version` fields become `1.0.0`, with no dependency version changes.

Append to `.gitignore`:

```gitignore
dist-extension/
artifacts/
```

- [ ] **Step 7: Build and package all browser targets**

Run:

```bash
npm run extension:package
```

Expected: three builds complete, followed by three ZIP files under `artifacts/`.

- [ ] **Step 8: Run artifact tests and inspect permissions**

Run:

```bash
node --experimental-strip-types --test tests/extension-build.test.mjs
for browser in chrome edge firefox; do
  node -e 'const m=require(`./dist-extension/${process.argv[1]}/manifest.json`); console.log(process.argv[1], m.permissions, m.host_permissions)' "$browser"
done
```

Expected: tests PASS; each printed target shows `undefined undefined` for permissions and host permissions.

- [ ] **Step 9: Run the complete automated suite**

Run:

```bash
npm test
npm run lint
```

Expected: website build, three extension builds, ZIP packaging, all Node tests, and lint PASS.

- [ ] **Step 10: Commit build and packaging support**

```bash
git add vite.extension.config.ts scripts/build-extensions.mjs scripts/package-extensions.mjs tests/extension-build.test.mjs package.json package-lock.json .gitignore
git commit -m "build: package extensions for three browsers"
```

---

### Task 5: Loading Documentation and Browser Acceptance

**Files:**
- Modify: `README.md:92-125`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: commands and artifact paths from Task 4.
- Produces: user-facing local installation instructions and a release-note entry for cross-browser extension support.

- [ ] **Step 1: Add README extension development and packaging instructions**

Add a “浏览器扩展” section after the existing production build section with these exact facts:

```markdown
## 🧩 浏览器扩展

扩展支持 Chrome、Edge 和 Firefox，完整工具箱和运行时资源都包含在扩展包中，可断网使用。扩展不读取当前网页，不申请主机访问权限，也不上传工具输入或结果。

```bash
npm run extension:dev
npm run extension:build
npm run extension:package
```

构建目录位于 `dist-extension/<browser>/`，版本化 ZIP 位于 `artifacts/`。

### 本地加载

- Chrome：打开 `chrome://extensions`，启用开发者模式，选择“加载已解压的扩展程序”，然后选择 `dist-extension/chrome`。
- Edge：打开 `edge://extensions`，启用开发人员模式，选择“加载解压缩的扩展”，然后选择 `dist-extension/edge`。
- Firefox：打开 `about:debugging#/runtime/this-firefox`，选择“临时载入附加组件”，然后选择 `dist-extension/firefox/manifest.json`。临时扩展会在 Firefox 重启后移除。
```

- [ ] **Step 2: Add a changelog entry**

Under `## [v1.0.0] - 2026-07-11` → `### Added / 新增功能`, before the five-core-tools subsection, add:

```markdown
#### 🧩 浏览器扩展 (Browser Extensions)
- 新增 Chrome、Edge 和 Firefox 离线扩展构建，支持通过 Popup 快捷入口直达完整工具箱。
```

- [ ] **Step 3: Run documentation and full regression checks**

Run:

```bash
rg -n "extension:(dev|build|package)|chrome://extensions|edge://extensions|about:debugging" README.md
npm test
npm run lint
git diff --check
```

Expected: README contains all three commands and browser loading URLs; all automated checks PASS; `git diff --check` prints nothing.

- [ ] **Step 4: Perform manual browser acceptance**

For each target directory, load the unpacked extension and record PASS/FAIL for:

```text
[ ] Toolbar icon renders.
[ ] Popup shows five shortcuts and the complete-toolbox action.
[ ] Every shortcut opens a new extension tab at the selected tool.
[ ] Complete-toolbox action opens doc-diff.
[ ] Switching tools updates ?tool= without a reload.
[ ] Refresh restores the selected tool but does not restore edited input.
[ ] Diff, JSON, password, codec, and copy interactions work while offline.
[ ] Extension details show no host or sensitive permission warning.
```

Chrome and Edge may reuse the same behavioral result only after loading each separately. Firefox must be checked independently because its extension runtime and manifest parsing differ.

- [ ] **Step 5: Commit documentation after acceptance**

```bash
git add README.md CHANGELOG.md
git commit -m "docs: explain cross-browser extension loading"
```

- [ ] **Step 6: Verify the final repository state**

Run:

```bash
git status --short
git log -6 --oneline
```

Expected: no uncommitted changes from this implementation remain; recent history contains the navigation, shared workbench, extension UI, build/package, and documentation commits. If unrelated user-owned changes remain, report them without staging or modifying them.

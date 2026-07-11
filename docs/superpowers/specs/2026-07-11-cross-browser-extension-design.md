# Chrome、Edge 与 Firefox 扩展设计

## 背景与目标

DevTools Box 当前以 React 19、Vinext 和 Vite 提供网页版工具箱，所有转换与生成操作都在浏览器本地完成。本次扩展在保留网页版的基础上，增加 Chrome、Edge 和 Firefox 浏览器扩展，并继续满足完全离线、无需登录和不上传用户输入的产品原则。

本次交付需要实现：

- 点击浏览器工具栏图标时显示轻量 Popup。
- Popup 提供现有五个工具的快捷入口和一个完整工具箱入口。
- 点击工具快捷入口时，在新标签页打开扩展内置的完整工具箱并直接选中目标工具。
- 完整工具箱及其所有运行时资源随扩展打包，可完全离线使用。
- 生成 Chrome、Edge 和 Firefox 可本地加载的目录与版本化 ZIP 包。
- 保持现有网页版构建、测试与 Cloudflare 部署行为不变。

本次不包含浏览器商店上架、商店截图、隐私政策、签名或自动发布流程。

## 方案选择

采用独立的 Vite 扩展构建，并与网页版共享 React 工作台和业务逻辑。

没有选择 WXT，是因为当前扩展只包含 Popup 和完整工具箱两个页面，不需要后台任务、内容脚本或复杂浏览器 API。直接使用项目已有的 Vite 可以减少依赖和构建约定。也不复用 Vinext 的网站产物，因为该产物面向服务端渲染和 Cloudflare Worker，复制其内部输出作为扩展资源会与构建实现细节耦合。

## 架构

仓库保留两条独立构建链：

```text
共享工具箱组件与核心逻辑
        |
        |-- 网页入口 app/page.tsx
        |      `-- Vinext -> Cloudflare 网页版
        |
        `-- 扩展入口 extension/
               |-- popup.html -> 快捷入口
               `-- toolbox.html -> 完整工具箱
                      `-- Vite -> Chrome / Edge / Firefox
```

`app/page.tsx` 中的完整工作台提取为共享 React 组件。网页入口继续渲染该组件，扩展的 `toolbox.html` 通过自己的 React 入口渲染同一组件。`app/codec.ts` 等与运行环境无关的业务模块由两种入口直接共用。

扩展页面不嵌入线上网站、不加载远程脚本，也不依赖服务端路由或 Cloudflare Worker。扩展构建使用系统字体或随包提供的本地字体，不依赖 `next/font` 生成的页面资源。

## Popup 交互

Popup 是固定宽度的轻量导航界面，不直接承载复杂工具。内容包括产品名称、简短说明、五个工具快捷入口和“打开完整工具箱”按钮。

工具与稳定 ID 的映射如下：

| 工具 | ID |
| --- | --- |
| 文档差异比对 | `doc-diff` |
| JSON 格式化 | `json-format` |
| JSON 差异比对 | `json-diff` |
| 随机密码生成 | `password` |
| 信息编解码工具 | `codec` |

点击工具入口时打开扩展内部地址 `toolbox.html?tool=<id>`；点击“打开完整工具箱”时打开不带 `tool` 参数的 `toolbox.html`。链接在新标签页打开，随后 Popup 随失去焦点自动关闭。

Popup 使用普通扩展内部链接完成导航，不读取当前网页或标签内容。

## 完整工具箱路由状态

完整工具箱启动时读取 URL 的 `tool` 查询参数：

- 参数属于已知工具 ID 时，直接选中该工具。
- 参数缺失时，使用现有默认工具。
- 参数非法时，静默回退到现有默认工具，不显示阻断性错误。
- 用户在工具箱内切换工具时，使用 History API 更新当前 URL 的 `tool` 参数，不重新加载页面。
- 页面刷新后根据 URL 恢复当前工具。

本次只将当前工具同步到 URL，不持久化编辑器输入、生成的密码、转换结果或其他用户数据。

## Manifest 与权限

三个目标均使用 Manifest V3。Chrome 和 Edge 使用相同的基础字段；Firefox构建增加 `browser_specific_settings.gecko` 等 Firefox 专用字段。

Manifest 声明：

- 扩展名称、描述和根目录 `package.json` 中的版本号。
- `action.default_popup` 指向 `popup.html`。
- 工具栏和扩展管理页面所需的多尺寸 PNG 图标。
- `offline_enabled`，表明核心能力支持离线使用。

Manifest 不声明：

- 后台 service worker。
- 内容脚本。
- 主机访问权限。
- `activeTab`、`tabs`、`storage` 或其他当前功能不需要的 API 权限。
- 可远程执行的代码或远程运行时资源。

如果实际浏览器验证发现普通内部链接无法可靠打开新标签页，才允许在不改变产品行为的前提下改用扩展 Tabs API；这种调整必须只增加实现所需的最小权限，并在文档中说明。默认设计不依赖该权限。

## 构建与产物

现有命令 `npm run dev`、`npm run build`、`npm test` 及 Cloudflare 部署流程保持不变。新增扩展命令：

```text
npm run extension:dev
npm run extension:build
npm run extension:package
```

`extension:build` 生成可直接本地加载的目录：

```text
dist-extension/
|-- chrome/
|-- edge/
`-- firefox/
```

`extension:package` 在完成三端构建后生成：

```text
artifacts/
|-- dev-tools-box-chrome-<version>.zip
|-- dev-tools-box-edge-<version>.zip
`-- dev-tools-box-firefox-<version>.zip
```

每个 ZIP 的根目录必须直接包含 `manifest.json`，不能额外嵌套目标目录。Chrome 与 Edge 即使内容相同，也分别输出名称明确的目录和 ZIP，方便用户选择与后续独立发布。

扩展版本统一读取根目录 `package.json`，避免网站与扩展版本产生多个真相来源。

## 文档

README 增加：

- 扩展开发、构建和打包命令。
- 三种浏览器本地加载解压目录的步骤。
- 三种 ZIP 产物的位置和用途。
- 完全离线、无远程代码及无敏感权限的说明。
- Firefox 本地加载属于临时扩展、浏览器重启后可能需要重新加载的提示。

## 测试与验收

### 自动化验证

- 现有网页版构建和测试全部通过。
- 三端扩展构建全部成功。
- 每个目标目录包含有效的 `manifest.json`、`popup.html`、`toolbox.html`、本地 JavaScript、CSS 和图标资源。
- 三个 manifest 均为 MV3，且不包含未设计的权限、远程脚本或远程资源。
- Firefox manifest 包含预期的 Firefox 专用字段。
- Popup 包含五个稳定工具 ID，对应链接均指向正确的扩展内部页面。
- 合法、缺失和非法 `tool` 参数分别执行直达、默认和回退行为。
- 工具箱内部切换会更新 URL，并能在刷新后恢复当前工具。
- 三个版本化 ZIP 均存在，且 ZIP 根目录直接包含 manifest。

### 手动验收

分别在 Chrome、Edge 和 Firefox 中加载对应解压目录并确认：

1. 工具栏图标和 Popup 正常显示。
2. 五个快捷入口均能打开新扩展标签页并直达目标工具。
3. “打开完整工具箱”能打开默认工具。
4. 文档比对、JSON 工具、密码生成、编解码和复制等核心交互可在断网状态使用。
5. 扩展详情页不显示与设计不符的敏感权限警告。

## 成功标准

当现有网站无功能回归、三种浏览器均能本地加载对应构建目录、Popup 可以直达所有工具、断网时完整工具箱可正常使用，且三个版本化 ZIP 均成功生成时，本次扩展支持视为完成。

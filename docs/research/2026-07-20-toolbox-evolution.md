# DevTools Box 优化演进路线评估

> 评估日期：2026-07-20  
> 范围：当前 v1.1.0 Web + Chrome/Edge/Firefox 扩展；坚持本地优先、默认离线、最小权限。  
> 来源原则：只使用本项目代码、官方项目仓库/文档、浏览器官方文档与标准。

## 结论

当前项目已经具备一个可扩展工具箱的正确骨架：10 个稳定工具 ID、按工具懒加载、纯逻辑与 React 面板分离、搜索/分类/收藏/最近使用，以及不声明 `permissions` 和 `host_permissions` 的 MV3 扩展。现有能力以文本、JSON/YAML、编码、生成、哈希、时间、正则为主，详见[当前工具注册表](../../app/tools.ts)、[懒加载映射](../../app/tool-loaders.ts)和[扩展构建配置](../../vite.extension.config.ts)。

下一阶段不应先追求“工具数量”。推荐先建立三层演进路径：

1. **把本地优先承诺做实**：Web 端补正式 PWA 离线缓存和安装体验；扩展继续维持零权限基线。
2. **从工具列表升级为工作流入口**：命令面板、用户主动粘贴后的类型识别、跨工具传递、可分享但默认不携带敏感输入的配置链接。
3. **按纯本地、高复用、低权限顺序扩工具包**：先 XML/TOML/CSV/SQL、QR、JWT 校验、CIDR/文本处理；最后才评估 API 客户端或网页上下文能力。

## 对标事实

- [DevToys 官方仓库](https://github.com/DevToys-app/DevToys)的默认工具覆盖 XML/SQL/QR、图片压缩、Markdown、文本分析等类别；其更重要的产品模式是 Smart Detection：检测 JSON、XML、图片或文件并建议合适工具，还允许把一个工具的输出传给另一个工具。官方同时要求检测轻量、可取消，并在 2 秒内退出，见[Smart Detection 指南](https://devtoys.app/doc/articles/extension-development/guidelines/UX/support-smart-detection.html)。
- [IT-Tools 当前工具索引](https://github.com/CorentinTh/it-tools/blob/d505845f918e946ec300af7b36efc107e2f66e9e/src/tools/index.ts)显示，QR、SQL prettify、XML、JSON→CSV、CIDR/IPv4、JWT、密码强度、文本统计/大小写/slug 等都是其核心本地工具；其仓库还提供[新工具脚手架命令](https://github.com/CorentinTh/it-tools/blob/d505845f918e946ec300af7b36efc107e2f66e9e/README.md#L41-L44)，说明工具增多后应把注册、目录和模板生成机械化。
- [CyberChef 官方仓库](https://github.com/gchq/CyberChef)证明复杂的数据处理仍可完全在浏览器本地完成；它的可复用模式不是无限增加独立页面，而是操作搜索、Recipe 链、Auto Bake、断点、自动编码识别、本地保存和深链接。其[代码结构说明](https://github.com/gchq/CyberChef/wiki/Getting-started)也把 operation、共享库、Web Worker、单操作测试和浏览器测试分开。
- [Bruno 官方文档](https://docs.usebruno.com/v2/introduction/what-is-bruno)把 API 客户端的离线价值建立在本地文件、纯文本集合和 Git 协作上；这比单个 HTTP 请求面板复杂得多。[Hoppscotch 官方 Interceptor 文档](https://docs.hoppscotch.io/documentation/features/interceptor)则显示，浏览器 API 客户端为绕过 CORS 往往需要浏览器扩展或本地代理。浏览器的 [`fetch()` 默认受同源/CORS 限制](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)，因此 API 客户端不适合作为当前零权限核心的顺手追加项。

## 排名与证据

| 排名 | 路线 | 用户价值 | 隐私/权限适配 | 实现量 | 直接证据与判断 |
|---:|---|---|---|---|---|
| 1 | 真正离线的 PWA + 安装入口 | 高 | 完全适配 | 中 | 当前仓库没有 Web App Manifest 或 Service Worker 注册，Web 端“加载后可离线”没有可验证的缓存契约。官方文档说明 [Manifest 是安装基础](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)，[Service Worker 才能拦截请求并从缓存离线响应](https://web.dev/learn/pwa/service-workers)。 |
| 2 | `⌘/Ctrl+K` 命令面板 + 全键盘导航 | 高 | 完全适配 | 小-中 | 当前搜索只在展开侧栏后出现。工具继续增长时，全局搜索/最近/收藏应合并为一个入口；交互按 W3C [Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/)模式实现方向键、Enter、Escape 和焦点管理。 |
| 3 | 输入类型识别 + “发送到其他工具” | 高 | 适配，但必须用户触发 | 中 | DevToys 的[官方 Smart Detection](https://devtoys.app/doc/articles/extension-development/guidelines/UX/support-smart-detection.html)会建议工具并支持输出转移。浏览器剪贴板读取属于强能力，规范要求权限/用户激活，见 [Clipboard API 标准](https://www.w3.org/TR/clipboard-apis/)；因此只分析用户粘贴/拖入的内容，不后台读取剪贴板，也不增加扩展 `clipboardRead`。 |
| 4 | 结构化数据包：XML/TOML/CSV + SQL 格式化 | 高 | 完全适配 | 中 | DevToys 默认工具包含 XML/SQL；[IT-Tools 索引](https://github.com/CorentinTh/it-tools/blob/d505845f918e946ec300af7b36efc107e2f66e9e/src/tools/index.ts)同时包含 XML↔JSON、TOML↔JSON/YAML、JSON→CSV、SQL prettify。建议扩展现有 Data Converter，而不是新增四个孤立面板。 |
| 5 | QR 生成与图片文件识别 | 高 | 图片上传/生成完全适配 | 小-中 | DevToys 和 IT-Tools 都把 QR 放在默认工具中。先做文本/Wi-Fi QR 生成和“选择图片解码”；相机扫描后置，因为相机会触发设备授权，且原生 [`BarcodeDetector` 仍是 Limited availability](https://developer.mozilla.org/en-US/docs/Web/API/BarcodeDetector)，跨浏览器需自带解码库。 |
| 6 | JWT/JWK 校验与凭证检查 | 中-高 | 完全适配，敏感输入不得持久化 | 中 | 当前 codec 只有 JWT 免签解析。DevToys/IT-Tools 都提供 JWT 类工具；可补 claims 时间检查、算法提示、JWK/PEM 公钥签名验证。浏览器 [Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)可本地执行密码学原语，但官方明确提示其低层能力容易误用，因此 UI 必须区分“解析”“签名有效”“令牌可信”。 |
| 7 | 网络与文本高频小工具包 | 中-高 | 完全适配 | 小-中 | [IT-Tools 索引](https://github.com/CorentinTh/it-tools/blob/d505845f918e946ec300af7b36efc107e2f66e9e/src/tools/index.ts)覆盖 CIDR/IPv4、HTTP 状态码、URL/User-Agent、大小写、slug、列表转换、去重和文本统计。这批可复用同一双栏壳，依赖少、风险低；优先 CIDR、文本清洗、大小写/slug。 |
| 8 | Worker 化的大文件处理与性能预算 | 中（可靠性） | 完全适配 | 中 | 哈希已流式读取，但 JSON diff、格式化、正则或后续图片/XML 仍可能阻塞 UI。[Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)允许重计算离开主线程；CyberChef 也显式拆分 `workers/`。先定义阈值、取消和进度协议，再把重工具迁移。 |
| 9 | 可组合 Recipe/流水线 | 中-高（进阶用户） | 完全适配 | 大 | [CyberChef](https://github.com/gchq/CyberChef)验证了操作链、自动执行、断点和本地保存的价值。应在统一输入/输出类型契约完成后再做；v1 阶段只支持纯文本/字节转换和本地 recipe，不允许任意 JS。 |
| 10 | API 客户端 / 当前网页工具 | 高但越界明显 | 需要网络或网页权限 | 大 | Web API 请求受 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) 约束；扩展跨站请求需要 host permissions。Chrome 建议把非核心能力放入 [`optional_permissions` / `optional_host_permissions`](https://developer.chrome.com/docs/extensions/reference/api/permissions)。如要做，应作为独立可选模块或 companion，不改变基础扩展的零权限安装面。 |

## 推荐版本路线

### v1.2：可信离线与高频补齐

- PWA Manifest、Service Worker、离线回归测试、更新提示；修正文档中无法自动证明的离线描述。
- 命令面板、键盘导航、移动端/窄屏工具导航；保留现有侧栏作为桌面主导航。
- Data Converter 增加 XML/TOML/CSV，新增 SQL Formatter、QR、CIDR/Text Utilities。
- 工具注册表补充 `accepts`、`produces`、`sensitive`、`worker` 等能力元数据。

**验收指标**：首次联网后，在离线模式刷新仍能打开全部核心工具；命令面板可只用键盘完成搜索和切换；新增工具不增加扩展权限；每个转换器都有 golden case 和错误输入测试。

### v1.3：智能流转与可靠性

- 仅在用户粘贴、拖放或选择文件后进行类型识别；展示推荐工具。
- 统一“复制 / 下载 / 发送到…”输出动作，支持 JSON→YAML→Base64→QR 等明确类型链。
- 大输入迁移到 Worker，增加取消、进度、输入大小提示和基准预算。
- JWT/JWK 校验、密码强度分析；敏感工具默认禁用输入历史和 URL 内容分享。

**验收指标**：检测器可取消且有严格耗时/大小上限；跨工具传递不经过 `localStorage`；重任务期间输入和导航保持响应；Web 与三个扩展包结果一致。

### v1.4：可重复工作流

- 小范围 Recipe：只组合已登记的确定性操作，配置可导入/导出；默认只分享操作和参数，不分享输入。
- 历史/草稿改为用户显式开启，使用 IndexedDB 的版本化 schema；Web Storage 继续只存收藏和偏好。[IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)适合大量结构化数据和 Blob，但要提供清空、导出和“不保存敏感内容”控制。
- 增加工具模板/生成器，自动生成 metadata、logic、panel、loader 和测试骨架，借鉴 IT-Tools 的[脚手架入口](https://github.com/CorentinTh/it-tools/blob/d505845f918e946ec300af7b36efc107e2f66e9e/README.md#L41-L44)。

### v2.0 候选：能力分层，而非默认扩权

- 可选 API Client、右键菜单/当前选区处理、PWA 文件关联、CLI。
- 基础版保持零权限；网页选区优先 `activeTab` 的用户主动触发模式，跨站 API 采用按站点申请的 optional host permissions。Chrome 官方说明 [`activeTab` 只在用户调用后临时授予当前页访问](https://developer.chrome.com/docs/extensions/reference/api/tabs)，不会像常驻 host access 那样扩大持续暴露面。
- API Collection 若进入路线，应采用可导入导出的纯文本格式，并明确 secret 不进入同步/提交；Bruno 的[本地文件和 Git 模式](https://docs.usebruno.com/introduction/getting-started)比把凭证长期放在浏览器 localStorage 更适合作为设计参照。

## 架构与测试约束

1. **建立统一工具协议**：工具除了标题/分类/loader，还声明输入输出类型、是否敏感、最大建议大小、同步/Worker 执行方式；转换逻辑暴露纯 `run(input, options)`，面板只负责交互。
2. **不要直接开放第三方运行时代码插件**：DevToys 官方也警告第三方扩展可访问设备或外传数据，见[扩展安全说明](https://devtoys.app/doc/articles/sysadmin/extension-management.html)。当前更适合“仓库内工具包 + 生成器”。MV3 要求可执行 JS/Wasm 随扩展打包，禁止远程托管代码，见 [Chrome MV3 官方说明](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)。
3. **性能隔离**：Worker 消息定义可判别联合类型，提供 task ID、取消、进度和结构化错误；字节数据尽量用 transferable `ArrayBuffer`，不要在主线程和 Worker 间重复复制大字符串。
4. **测试分层**：
   - 注册契约：ID 唯一、metadata/loader/route 完整、零权限基线不回退；
   - 纯逻辑：标准样例、错误输入、round-trip、Unicode/时区/大整数边界；
   - Worker：取消、并发、超限和主线程响应；
   - UI：命令面板键盘流、焦点、窄屏、复制/下载/跨工具传递；
   - 离线：先在线安装，再断网冷启动/刷新，验证所有懒加载 chunk 已被 precache；
   - 扩展：三个目标包构建和 manifest 扫描继续保留；Chromium 可参考 [Playwright 官方扩展测试方式](https://playwright.dev/docs/chrome-extensions)，Firefox 仍需单独的加载冒烟验证。
5. **隐私自动化守卫**：构建产物扫描外链脚本/Wasm、网络端点、`permissions`/`host_permissions` 变化；敏感工具断言不写 localStorage/IndexedDB/URL；新增依赖做许可证、体积和 CSP 兼容检查。

## 建议暂缓

- **完整 API Client**：它不是一个“小工具”，而是请求引擎、CORS/代理、集合、环境变量、secret、脚本沙箱、导入导出和 Git/CLI 的产品线。
- **后台自动读取剪贴板**：会增加明显权限警告。Chrome 权限表明确说明 `clipboardRead` 会显示“读取复制和粘贴的数据”的警告，见[官方权限列表](https://developer.chrome.com/docs/extensions/reference/permissions-list)。用户主动粘贴即可实现大部分智能识别价值。
- **开放第三方插件市场或任意 JS Recipe**：与隐私承诺、MV3 可审计性和 CSP 直接冲突；先把内部工具协议稳定下来。
- **依赖实验性浏览器 API 的核心功能**：QR 图片识别、PWA 文件关联等必须提供跨浏览器 fallback；例如 [`file_handlers` 目前不是 Baseline](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest/Reference/file_handlers)。

综合来看，最稳健的产品定位是：**“可安装、真正离线、零权限的本地开发数据工作台”**。v1.2 应优先修复离线承诺并补高频格式/网络工具；v1.3 通过智能识别和跨工具传递提升复用率；Recipe、API Client 和网页上下文能力则在能力协议与权限分层成熟后推进。

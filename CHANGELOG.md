# CHANGELOG / 版本更新日志

All notable changes to this project will be documented in this file.
本项目的所有重要变更都将记录在此文件中。

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [v1.2.0] - 2026-07-20

### Added / 新增功能

- 新增 PWA 安装清单、版本化离线缓存、后台预缓存与新版本更新提示。
- 新增 `Cmd/Ctrl + K` 命令面板，支持搜索、键盘选择与快速打开工具。
- 新增 system/light/dark 三态主题偏好，并保存在浏览器本地。
- 数据工作台新增 XML、TOML、CSV 转换、JSON Schema 校验和多方言 SQL 格式化。
- 新增真实 DOM 交互测试，以及 Popup、工具箱首屏和动态工具块的 gzip 体积预算。

### Changed / 架构调整

- TypeScript 编译目标升级至 ES2022，并将类型检查纳入完整测试流程。
- 将复制反馈与 CodeMirror/Prism 编辑器模块拆分，避免轻量工具加载重型编辑器依赖。
- 浏览器扩展构建产出 bundle manifest，并在打包前执行体积闸门。

---

## [v1.1.0] - 2026-07-14

### Added / 新增功能

- 新增工具搜索、分类筛选、收藏与最近使用，偏好保存在浏览器本地。
- 新增 UUID v4/v7、ULID 与安全随机 Token 批量生成。
- 新增文本/文件 SHA-256、SHA-512 校验与 HMAC 计算。
- 新增 Unix 时间戳、时区转换和 5 字段 Cron 后续时间计算。
- 新增正则表达式匹配、捕获组和替换预览。
- 新增 JSON/YAML 双向转换与 JSONPath 查询。

### Changed / 架构调整

- 将全部工具拆分为独立模块并按需加载，网页与浏览器扩展继续共用同一注册表和工具实现。
- 浏览器扩展继续保持无 Host Permissions、无内容脚本、无后台进程。

---

## [v1.0.0] - 2026-07-11

### Added / 新增功能

#### 🧩 浏览器扩展 (Browser Extensions)
- 新增 Chrome、Edge 和 Firefox 离线扩展构建，支持通过 Popup 快捷入口直达完整工具箱。

#### 🧰 五大核心开发者工具 (5 Core Dev Tools)
- **文档差异比对 (Document Diff)**
  - 支持左右对照以及高亮比对两段文本差异，快速定位新增、删除和修改。
- **JSON 格式化 (JSON Formatter)**
  - 集成 CodeMirror，支持 JSON 语法高亮、自动校验、一键美化与压缩。
- **JSON 差异比对 (JSON Diff)**
  - 支持按属性路径进行 JSON 对象比对，自动忽略键值对顺序，专注于内容差异。
- **随机密码生成 (Password Generator)**
  - 支持自定义长度和字符集（大写、小写、数字、特殊字符）生成强密码，支持一键复制与安全度提示。
- **信息编解码工具 (Codec Engine)**
  - **编码/加密 (12 种)**：Unicode、URL、UTF16、Base64、Hex、MD5 摘要、SHA-1 加密、HTML 实体、HTML 深度编码、HTML 转 JS、Gzip 压缩、字符串转义。
  - **解码/解析 (12 种)**：Unicode 解码、URL 解码、UTF16 解码、Base64 解码、Hex 解码、Proto Hex 解析转 JSON、HTML 实体解码、URL 参数解析、JWT 免签解码、Cookie 格式化、Gzip 解压、字符串去转义。

#### ⚡ 架构与基础设施 (Architecture & Infrastructure)
- 使用 **React 19 + TypeScript + Vite** 构建高性能的前端交互。
- 引入 **TailwindCSS 4** 作为现代化 CSS 引擎，内置流畅的交互动效。
- 采用 **Vinext** 开发框架，深度适配 Cloudflare Workers / Pages 运行时。
- 配置了自动化部署工作流 **GitHub Actions**，推送到 `main` 分支时自动测试并发布至 Cloudflare。

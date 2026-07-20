<p align="center">
  <img src="public/favicon.svg" alt="DevTools Box Logo" width="80" height="80" />
</p>

<h1 align="center">开发者工具箱 | DevTools Box</h1>

<p align="center">
  一个安全、私密、极速的本地开发者工具箱。无需上传数据，100% 浏览器端本地计算。
</p>

<p align="center">
  <a href="https://github.com/guanyang/dev-tools-box/actions/workflows/deploy-cloudflare.yml">
    <img src="https://github.com/guanyang/dev-tools-box/actions/workflows/deploy-cloudflare.yml/badge.svg" alt="Deploy to Cloudflare Status" />
  </a>
  <a href="https://github.com/guanyang/dev-tools-box/actions/workflows/release.yml">
    <img src="https://github.com/guanyang/dev-tools-box/actions/workflows/release.yml/badge.svg" alt="Publish Release Status" />
  </a>
  <a href="https://github.com/guanyang/dev-tools-box/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" />
  </a>
  <a href="https://vite.dev/">
    <img src="https://img.shields.io/badge/Vite-8.0-blueviolet?logo=vite" alt="Vite" />
  </a>
  <a href="https://react.dev/">
    <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react" alt="React" />
  </a>
  <a href="https://tailwindcss.com/">
    <img src="https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css" alt="TailwindCSS" />
  </a>
</p>

<p align="center">
  简体中文 | <a href="./README_EN.md">English</a>
</p>

<p align="center">
  <img src="docs/images/ScreenShot_extension.png" alt="DevTools Box Screenshot" width="700" />
</p>

---

## ✨ 核心特性 (Key Features)

- 🔒 **100% 隐私安全 (Privacy First)**：所有文本比对、JSON 格式化、密码生成和数据编解码均在 **浏览器本地 (Client-Side)** 完成，绝不向任何外部服务器上传敏感数据（如 API 密钥、JWT 凭证、数据库密码等）。
- 🧩 **高隐私浏览器扩展 (Privacy-First Browser Extension)**：
  - **不申请高危权限**：扩展不申请任何主机访问（Host Permissions）权限，**绝不读取、不嗅探、不修改您所浏览的任何网页内容**，彻底杜绝插件劫持或敏感凭证泄露风险。
  - **完全离线运行**：将完整的计算逻辑与静态资源打包在扩展内，零网络请求、零数据上传。
  - **多浏览器兼容**：一套代码原生适配 Chrome、Edge 和 Firefox。
- 🎨 **极致交互体验 (Modern UI/UX)**：
  - 基于 **React 19 + TailwindCSS 4.0** 打造的现代流线型界面。
  - 支持 **明暗主题 (Dark/Light Mode)** 切换。
  - 集成专业级 **CodeMirror** 编辑器，支持语法高亮和实时错误校验。
- 🔎 **快速发现工具**：支持按名称或关键词搜索、分类筛选、收藏和最近使用；偏好仅保存在浏览器本地。
- ⌨️ **键盘优先**：按 `Cmd/Ctrl + K` 打开命令面板，使用方向键与 Enter 快速切换工具。
- 📲 **可安装网页应用**：在线版支持安装为 PWA，并在空闲时缓存核心工具，后续可离线打开。
- 🚀 **零配置部署 (Serverless Friendly)**：原生适配 Cloudflare Workers/Pages 边缘运行环境，预置 GitHub Actions 持续集成工作流。

---

## 🚀 快速使用 (Quick Access)

您可以通过以下两种方式使用本工具箱：

1. **🌐 在线网页版**：
   - 直接访问官方托管地址：[https://tools.xcloudapi.com/](https://tools.xcloudapi.com/)
   - 同样享有 100% 本地计算与隐私保护，页面一旦加载完成，即使断网也能继续使用。

2. **🧩 浏览器扩展插件**：
   - 离线包形式运行，更安全、更快速。
   - 拥有独立的 Popup 快捷面板入口，支持点击浏览器图标一键唤起。
   - 支持 Chrome、Edge、Firefox 等主流浏览器（本地安装与打包方法请参见下文 [🧩 浏览器扩展](#extensions)）。

---

## 🧰 工具一览 (Included Tools)

### 1. 📝 文档差异比对 (Document Diff)
- 双栏实时对比两段文本的差异。
- 高亮标识“新增（Green）”、“删除（Red）”和“修改（Yellow）”。
- 支持一键左右双向合并，轻松打补丁或复制结果。

### 2. 🎛️ JSON 格式化与编辑 (JSON Formatter)
- 基于 CodeMirror 提供行号、高亮和括号匹配。
- 支持一键美化（Format）与一键压缩（Minify）。
- 实时校验 JSON 语法，精准定位错误行数与原因。

### 3. 🔍 JSON 差异比对 (JSON Diff)
- 针对 JSON 结构的深度对比。
- **对象路径对齐**：自动忽略 JSON 键（Keys）的顺序差异，只比对具体值的变更。

### 4. 🔑 随机密码生成器 (Password Generator)
- 强随机性字符生成。
- 可控参数：密码长度（1-256 位）、生成数量（1-1000 个）和字符集选择。
- 支持一键批量生成与安全复制。

### 5. 🧮 24 种编解码与解析工具 (Codec Engine)

| 类别 (Category) | 支持的方法 (Methods) | 说明 (Description) |
| :--- | :--- | :--- |
| **编码与加密** | Unicode / URL / UTF-16 编码 | 快速转义特殊字符与控制字符 |
| | Base64 / Hex 编码 | 将文本转换成常用的二进制字符串表示 |
| | MD5 / SHA-1 / Gzip 压缩 | 计算本地文件或文本的哈希摘要，或压缩输出 Base64 |
| | HTML 实体 / 字符串转义 | 逃逸特殊字符，防止前端 XSS 攻击或生成代码字符串 |
| **解码与解析** | Unicode / URL / UTF-16 解码 | 还原转义字符 |
| | Base64 / Hex 解码 | 还原字节流为可读 UTF-8 文本 |
| | JWT 免签解析 | 快速解析 JSON Web Token (JWT) 的 Header 与 Payload |
| | URL 参数解析 / Cookie 格式化 | 将复杂的 URL Query 或 Cookie 字符串提取为排版后的键值对 |
| | Gzip 解压 | 还原压缩后的 Base64 文本数据 |
| | **Proto Hex 解析** | **亮点功能！** 直接将 Protobuf 的 Hex 十六进制原始数据解析为结构化 JSON 树 |

### 6. 🪪 ID 与 Token 生成 (ID & Token Generator)
- 批量生成 UUID v4、UUID v7、ULID 和 URL 安全随机 Token。
- 使用浏览器安全随机数，支持一键复制单项或全部结果。

### 7. #️⃣ 哈希与文件校验 (Hash & Checksum)
- 计算文本或本地文件的 SHA-256、SHA-512 摘要。
- 支持使用用户输入密钥计算 HMAC，内容不会离开浏览器。

### 8. 🕐 时间与 Cron (Time & Cron)
- 自动识别秒/毫秒 Unix 时间戳，并按常用时区显示。
- 解析标准 5 字段 Cron 表达式，列出后续执行时间。

### 9. 🧪 正则表达式测试 (Regex Tester)
- 实时展示匹配位置、捕获组、命名组和替换预览。
- 支持 `g`、`i`、`m`、`s`、`u` Flags。

### 10. 🔄 结构化数据工作台 (Structured Data Workbench)
- 在 JSON、YAML、XML、TOML 和 CSV 之间转换。
- 对 JSON 输入执行 JSONPath 查询，并使用 JSON Schema 本地校验数据。
- 格式化 Standard SQL、MySQL、PostgreSQL、SQLite、SQL Server 与 PL/SQL。

---

## 🛠️ 技术栈 (Tech Stack)

- **应用框架**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **构建工具**: [Vite 8](https://vite.dev/) + [Vinext](https://github.com/vinext) (用于高性能多页边缘渲染)
- **样式引擎**: [TailwindCSS 4.0](https://tailwindcss.com/)
- **核心组件**:
  - [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror) - 集成专业代码编辑。
  - [@noble/hashes](https://github.com/paulmillr/noble-hashes) - 纯 JS 实现的加密哈希库.
  - [yaml](https://eemeli.org/yaml/) / [JSONPath Plus](https://github.com/JSONPath-Plus/JSONPath) / [Ajv](https://ajv.js.org/) - 本地数据转换、查询与 Schema 校验。
  - [lucide-react](https://lucide.dev/) - 现代化图标包。

---

## 🛠️ 开发指南 (Development Guide)

### 环境要求
- **Node.js** `>=22.15.0`
- **npm** `>=10.0.0`

### 本地开发运行
1. 克隆并进入项目目录：
   ```bash
   git clone https://github.com/guanyang/dev-tools-box.git
   cd dev-tools-box
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
   启动后打开浏览器访问 `http://localhost:3000`。

### 运行测试与构建
- 运行完整测试套件（单元测试与 E2E 渲染测试）：
  ```bash
  npm test
  ```
- 构建 Web 生产包:
  ```bash
  npm run build
  ```

---

## 🧩 <span id="extensions">浏览器扩展 (Browser Extensions)</span>

本项目支持在 Chrome、Edge 和 Firefox 浏览器中作为离线扩展运行。

### 📦 普通用户安装步骤 (For Users)

无需安装 Node.js 或执行任何编译命令，即可直接加载使用：

1. 打开 [GitHub Releases](https://github.com/guanyang/dev-tools-box/releases) 页面，下载对应浏览器的最新版压缩包（例如：`dev-tools-box-chrome-v1.0.0.zip`）。
2. 将下载的 ZIP 压缩包解压到一个固定的本地文件夹中。
3. 根据下文的 [⚙️ 浏览器加载指南](#extension-install) 在浏览器中载入该解压后的文件夹即可。

---

### 🛠️ 开发者构建调试 (For Developers)

如果您需要修改或二次开发扩展代码：

```bash
# 本地开发与实时调试 (以 Chrome 为例)
npm run extension:dev

# 编译生成生产包 (输出至 dist-extension/<browser>/ 目录)
npm run extension:build

# 编译并打包为版本化 ZIP (输出至 artifacts/ 目录)
npm run extension:package
```

---

### ⚙️ <span id="extension-install">浏览器加载指南 (Installation Guide)</span>

- **Chrome / Edge**:
  1. 打开地址栏输入 `chrome://extensions/` (或 `edge://extensions/`)。
  2. 在右上角开启 **开发者模式 (Developer Mode)**。
  3. 点击 **加载已解压的扩展程序 (Load unpacked)**。
  4. 选择您解压出来的文件夹（如果是开发者，则选择项目目录下的 `dist-extension/chrome` 或 `dist-extension/edge`）。
- **Firefox**:
  - **临时安装（重启浏览器后失效）**:
    1. 打开地址栏输入 `about:debugging#/runtime/this-firefox`。
    2. 点击 **临时载入附加组件 (Load Temporary Add-on)**。
    3. 选择解压文件夹下的 `manifest.json` 文件（如果是开发者，则选择项目目录下的 `dist-extension/firefox/manifest.json`）。
  - **永久安装（重启不失效，推荐普通用户）**:
    由于 Firefox 的安全策略，普通正式版 Firefox 不允许直接永久载入本地未签名的扩展。若需永久安装，可采用以下方法之一：
    - **方法 1：自签名扩展包 (适用于所有 Firefox 版本)**
      1. 将打包好的 `.zip` 文件上传至 [Firefox 附加组件开发者中心 (AMO)](https://addons.mozilla.org/developers/)。
      2. 在发布选项中选择 **“不在此网站上发布”（On your own / Unlisted）**（仅用于自用签名，无需公开审核）。
      3. 提交后系统会在几分钟内完成自动安全扫描并完成签名。
      4. 下载签名后的 `.xpi` 安装包文件，将其拖入 Firefox 的 `about:addons` (扩展管理) 页面即可永久安装。
    - **方法 2：使用 Firefox 开发者版 / Nightly / ESR 版本**
      1. 打开地址栏输入 `about:config` 并回车。
      2. 搜索 `xpinstall.signatures.required` 并将其值双击修改为 `false`。
      3. 打开 `about:addons` 页面，点击右上角齿轮图标选择“从文件安装附加组件”，导入生成的扩展 `.zip` 或 `.xpi` 文件即可永久运行。

---

## 🌐 自动部署 (Deployment)

项目已集成对 **Cloudflare Workers** (Wrangler) 的原生支持，并配置了自动化 CI/CD：

- 每次将代码推送到 `main` 分支时，`.github/workflows/deploy-cloudflare.yml` 都会自动编译并运行测试。
- **智能增量部署**：工作流会在构建后计算 `dist/` 目录的 Hash 值。**只有在构建产物发生变化时，才会执行实际的部署操作**，节省构建资源。
- **发布 Release 时强制部署**：当发布新 Release 时，工作流会绕过 Hash 校验，强制把当前 Release 版本的构建产物发布到 Cloudflare。

### GitHub Actions 配置
请在您的 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 下配置以下 Secrets：
- `CLOUDFLARE_API_TOKEN`：具有 Workers 管理权限 of Cloudflare API 令牌。
- `CLOUDFLARE_ACCOUNT_ID`：您的 Cloudflare 账户 ID。

---

## 📦 版本发布 (Release)

项目提供了便捷的一键式 Tag 与 Release 管理流程：

1. 确保在 `CHANGELOG.md` 中记录了待发布的版本信息（例如 `## [v1.0.0] - 2026-07-11`）。
2. 在终端运行本地发布脚本：
   ```bash
   ./scripts/release.sh 1.0.0
   ```
3. 脚本会自动进行 Git 工作区安全检查，确认版本号，打上版本 Tag，并将其推送到 GitHub。
4. GitHub 上的 `.github/workflows/release.yml` 收到 Tag 推送后，会自动执行：
   - 提取 `CHANGELOG.md` 中对应版本的日志内容。
   - 自动编译 Chrome、Edge、Firefox 扩展，并将其打包成 `.zip` 包。
   - 自动创建一个对应的 GitHub Release，并将扩展包 `.zip` 作为 Assets 附件上传。

---

## 📄 开源协议 (License)

本项目采用 [MIT License](LICENSE) 协议开源。

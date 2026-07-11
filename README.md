# ✨ 开发者工具箱 | DevTools Box

[![Vite](https://img.shields.io/badge/Vite-8.0-blueviolet?logo=vite)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**开发者工具箱 (DevTools Box)** 是一个无需登录、完全在浏览器本地运行的开发者常用工具集。本网站致力于为开发者提供开箱即用、安全隐私、交互极致的本地计算服务。

[查看更新日志](./CHANGELOG.md)

---

## 🌟 核心特性 (Key Features)

*   🔒 **安全第一 (100% Privacy-focused)**: 所有转换、加密、格式化和生成工作均在您的浏览器本地完成，**没有任何网络数据传输**，确保您的 API 密钥、JWT、敏感密码等绝不泄露。
*   ⚡ **即开即用 (Zero Configuration)**: 无需注册登录，秒级加载，随时随地直接使用。
*   🎨 **现代美观 (Sleek UI/UX)**: 基于 React 19 与 TailwindCSS 4 打造，支持明暗主题，配备精心设计的微交互和 CodeMirror 专业代码编辑器。
*   🚀 **无缝部署 (Serverless Ready)**: 原生适配 Cloudflare Workers/Pages 边缘运行时，支持 GitHub Actions 持续集成与自动部署。

---

## 🧰 工具一览 (Included Tools)

### 1. 📝 文档差异比对 (Document Diff)
*   支持逐行对比两段文本的差异。
*   清晰呈现“新增”、“删除”及“修改”的高亮标识。
*   支持左右双向合并及一键复制，让版本比对与补丁制作更简单。

### 2. 🎛️ JSON 格式化与编辑 (JSON Formatter)
*   集成 CodeMirror 专业编辑器，支持语法高亮与行号。
*   支持格式化（美化）与一键压缩（Minify）。
*   内置 JSON 语法合法性实时校验，智能提示语法错误。

### 3. 🔍 JSON 差异比对 (JSON Diff)
*   针对 JSON 结构的深度对比工具。
*   **按路径匹配**：自动忽略键值对顺序（例如 `{"a":1,"b":2}` 与 `{"b":2,"a":1}` 在对比时被视作相同），专注于内容的增删改。

### 4. 🔑 随机密码生成器 (Password Generator)
*   生成高强度的随机密码。
*   可精细化控制密码长度（6-64位）及字符集（大写字母、小写字母、数字、特殊符号）。
*   一键批量生成与安全复制，带安全度直观提示。

### 5. 🧮 24 种信息编解码与解析工具 (Codec Engine)

| 类别 | 支持的方法 (Methods) | 说明 (Description) |
| :--- | :--- | :--- |
| **编码 / 计算** | Unicode / URL / UTF-16 编码 | 快速转义特殊与控制字符 |
| | Base64 / Hex 编码 | 将文本或字符转为指定格式字节表示 |
| | MD5 / SHA-1 | 本地快速计算字符串 Hash 摘要值 |
| | HTML 实体 / 深度编码 | HTML 字符转义，防止 XSS 或用于数据转储 |
| | HTML 转 JS / 字符串转义 | 自动将 HTML 代码或文本转为 JS 兼容的安全字符串 |
| | Gzip 压缩 | 在浏览器端利用 CompressionStream 进行 gzip 压缩输出 Base64 |
| **解码 / 解析** | Unicode / URL / UTF-16 解码 | 还原转义字符 |
| | Base64 / Hex 解码 | 还原字节流为 UTF-8 文本 |
| | HTML 实体解码 / 字符串去转义 | 还原 HTML 实体与转义字符 |
| | URL 参数解析 | 将复杂 URL 中的 Query String 解析并展示为格式化 JSON |
| | JWT 免签解码 | 快速解析 JSON Web Token (JWT) 的 Header 与 Payload，无需上传服务器 |
| | Cookie 格式化 | 将复杂的半角分号分隔的 Cookie 字符串分行高亮排版 |
| | Proto Hex 二进制解析 | 核心功能！将 Protobuf 二进制 Hex 字符串解析为结构化 JSON 树 |
| | Gzip 解压 | 还原 Gzip 压缩后的 Base64 字符串 |

---

## 🛠️ 技术栈 (Tech Stack)

*   **核心框架**：[React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **构建工具**：[Vite 8](https://vitejs.dev/) + [Vinext](https://github.com/vinext) (轻量高性能的边缘渲染/多页构建工具)
*   **样式库**：[TailwindCSS 4.0](https://tailwindcss.com/)
*   **核心依赖**：
    *   [@uiw/react-codemirror](https://github.com/uiwjs/react-codemirror) - 集成专业代码编辑器。
    *   [@noble/hashes](https://github.com/paulmillr/noble-hashes) - 安全高效的纯 JS 加密算法库。
    *   [lucide-react](https://lucide.dev/) - 现代化图标库。

---

## 🚀 本地开发与运行 (Getting Started)

### 前置条件
确保您的本地环境已安装 Node.js，且版本满足 `>=22.13.0`。

### 安装与启动
1. 进入项目目录：
   ```bash
   cd dev-tools-box
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动本地开发服务器：
   ```bash
   npm run dev
   ```
   启动后在浏览器中打开提示的本地地址（默认 `http://localhost:3000`）即可访问。

### 运行测试
项目包含完整的单元测试与端到端渲染测试：
```bash
npm test
```

### 构建生产包
```bash
npm run build
```

---

## 🌐 自动部署 (Deployment)

项目内置了对 **Cloudflare Workers** (Wrangler) 的完美支持与 CI/CD 自动化流：

1. 当您将代码推送到 GitHub 的 `main` 分支时，`.github/workflows/deploy-cloudflare.yml` 会自动触发。
2. 自动运行单元测试、生产构建并发布至 Cloudflare。

### GitHub Actions 配置步骤
在您 GitHub 仓库的 `Settings` ➔ `Secrets and variables` ➔ `Actions` 中，添加以下 Repository Secrets：
- `CLOUDFLARE_API_TOKEN`：具有 Workers Scripts 编辑权限的 Cloudflare API Token。
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账户 ID。

首次成功部署后，系统会自动创建名为 `dev-tools-box` 的 Worker，后续推送将自动完成滚动更新。

---

## 🚀 版本发布 (Release)

项目提供了自动发布 GitHub Release 的脚本与 CI 工作流：

1. 确保本地 `CHANGELOG.md` 中已经记录了待发布的版本号及更新日志（格式如 `## [1.0.0] - 2026-07-11`）。
2. 在终端运行发布脚本：
   ```bash
   ./scripts/release.sh
   ```
   或者直接指定版本号：
   ```bash
   ./scripts/release.sh 1.0.0
   ```
3. 脚本会自动校验 Git 工作区、确认版本号、打上 Tag 并推送至 GitHub。
4. 推送 Tag 后，GitHub Action `.github/workflows/release.yml` 会自动触发，提取 `CHANGELOG.md` 中的对应更新日志，并创建一个对应的 GitHub Release。

---

## 📄 开源协议 (License)

本项目采用 [MIT License](LICENSE) 协议开源。


# 行旅 · Another History

Electron + React + TypeScript + Tailwind + Vite。版本号见本目录 **`package.json` 的 `version`**（当前 **3.0.0**），页面标题与 Electron 窗口标题会引用该版本。

## 环境

- Node.js 18+
- npm 或 pnpm

## 安装与运行

### 本机 Node（推荐）

```bash
cd game
npm install
```

`postinstall` 会执行 `copy-fonts`，把点阵字体等写入 `public/fonts/`（该目录在 `.gitignore` 中，克隆后**必须** `npm install` 一次，否则 `/fonts/result.css` 等会缺失）。

**浏览器开发：**

```bash
npm run dev
```

浏览器打开 [http://localhost:5173](http://localhost:5173)。

**OpenAI 兼容 API**（任意支持 `/v1/chat/completions` 的供应商：OpenAI、AIHubMix、自建网关等）按下面**顺序**读取 Key（先命中先用）：

1. **`game/.env`**：`VITE_OPENAI_API_KEY`（可选 `VITE_OPENAI_BASE_URL`，默认 `https://api.openai.com/v1`）。仍兼容旧名 `VITE_AIHUBMIX_API_KEY`。
2. **浏览器 `localStorage`**：键名 `anotherhistory_openai_api_key`，以及 `anotherhistory_openai_base_url`、`anotherhistory_openai_model`；首次门闸或「API 与模型…」里填写后写入。
3. **`game/public/config.json`**（勿提交）：`{ "openaiApiKey", "openaiBaseUrl", "openaiModel" }`，仍兼容 `aihubmixApiKey`。

**模型**：门闸里填写「模型 ID」则**所有角色**共用该模型；若留空则使用 `.env` 里 `VITE_AI_MODEL_PLANNER` / `VITE_AI_MODEL_WRITER` 等（见 `.env.example`）。

**离线脚本**（`generate-chapter`、`test:ai -- --live` 等）支持 **`OPENAI_API_KEY` / `VITE_OPENAI_API_KEY`**（及旧名 `AIHUBMIX_*`），以及 **`OPENAI_API_BASE` / `VITE_OPENAI_BASE_URL`** 指定接口根路径（须含 `/v1`）。

**Engine v2（Planner 动态大纲 + 动态节拍）**：代码**默认开启**。仅在 `.env` 中设置 **`VITE_AI_ENGINE_V2=0`** 或 **`false`** 时关闭，始终走纯骨架。模板见 `game/.env.example`。

**首次启动**：若无存档且无 Key，会出现门闸（Base URL、模型、Key、「校验并保存」/「跳过」）；跳过仍可玩骨架，只是不调用 AI。

**桌面（Electron，不打包）：**

```bash
npm run electron:dev
```

先起 Vite，再起 Electron 窗口加载本地页面。

**AI 回归（离线）**：`npm run test:ai`；有 Key 时可 `npm run test:ai -- --live`、`npm run test:ai -- --live-planner`。

**JSON 排版**：改完 `public/data/skeleton.json` 后可执行 `npm run format:skeleton`。

**内容流水线**：`npm run generate` / `npm run generate:prologue`；合并结果写入 `public/data/{章节id}.json`（序章为 `prologue.json`）。`npm run generate:all` 会对已存在大纲的章节依次生成（默认尝试 `prologue` 与 `折戟原`）。

**单测**：`npm run test:unit`（Vitest）；`npm test` = 单测 + `test:ai`。

### Docker

```bash
cd game
docker compose up --build
```

浏览器访问 [http://localhost:5173](http://localhost:5173)。Electron 仍需本机 `npm run electron:dev`。

## 打包与桌面发行

**仅 Web 静态资源：**

```bash
npm run build
```

产物在 `dist/`，可由任意静态服务器托管。

**Windows 安装包 / 便携版（electron-builder）：**

```bash
npm run electron:pack
```

会先执行 `npm run build`、再 `npm run build:icons`（从 `build/icon.png` 生成 `build/icon.ico`）、最后打 `nsis` + `portable`。输出目录默认 `game/release/`（已在 `.gitignore`）。分发版为 **BYOK**：玩家在门闸填写自己的 OpenAI 兼容 Key、Base URL 与模型；Electron 下持久化到用户数据目录的 **`ai-settings.json`**（并镜像到 `localStorage`）。若在 Windows 上因「创建符号链接」权限导致工具链解压失败，当前配置已设置 **`signAndEditExecutable: false`** 以跳过自动签名相关步骤；正式签名需自行配置证书与权限。

## 浏览器里 “404 (Not Found)” 是什么？

这是 **HTTP 状态码**：浏览器向当前站点（开发时多为 `http://localhost:5173`）请求某个 **URL**，服务器（Vite）回应 **「这个路径没有对应文件」**，开发者工具 Network 里就会显示 **404**，控制台可能有一条 *Failed to load resource: the server responded with a status of 404*。

**不一定代表游戏坏了**——要看**具体是哪个 URL**：

| 请求 | 常见情况 |
|------|----------|
| **`/config.json`** | **多为正常**。该文件为可选本地配置且默认不在仓库里；代码会 `fetch` 它，不存在则忽略，继续用 `.env` / `localStorage`。 |
| **`/favicon.ico`** | 浏览器默认会找站点图标；若未提供该文件会 404。本项目在 `index.html` 里已用内联 SVG 作为 `rel="icon"`，一般不再额外请求 `favicon.ico`。 |
| **`/fonts/result.css` 或字体文件** | **异常**：说明未执行或未成功执行 `npm run copy-fonts`（或 `npm install`），请补跑安装脚本。其中 **`/fonts/NotoSansSC-400.woff2`** 由 `copy-fonts` 从 jsDelivr 拉取，用于无 Google Fonts 时的中文回退。 |
| **`/data/manifest.json`、`/data/prologue.json`、`/data/skeleton.json` 等** | **异常**：游戏依赖这些数据；若 404 会导致无法加载界与节点，需确认 `public/data/` 下文件存在且 `manifest.json` 里 `chapters` 与文件名一致。 |
| **`/data/design-seed.json`** | 仅 **Engine v2** 合并种子时用；若缺失，Planner 相关会降级/跳过（视逻辑而定），可检查是否应提交或生成该文件。 |

排查步骤：**DevTools → Network（或控制台里点开 404 链接）→ 看完整请求路径**；再对照上表与 `public/` 目录。

## 内容生成流水线（离线）

策划改 `design/序章大纲.md` 后：

```bash
npm run generate:prologue
```

- **输入**：`design/总设定.md`、`design/AI功能设定/`（ai1 / ai2 / ai3）、`design/序章大纲.md`
- **输出**：写入 **`public/data/prologue.json`**
- **去重**：`generated/chapters/prologue/input_hash.json`
- **Key / Base**：脚本侧 `OPENAI_API_KEY` / `VITE_OPENAI_API_KEY`（及旧名 `AIHUBMIX_*`）、`OPENAI_API_BASE` / `VITE_OPENAI_BASE_URL`，或 `public/config.json` 的 `openaiApiKey` 等

**只改文案**：编辑 `generated/chapters/prologue/texts.json` 后 `node scripts/merge-only.mjs prologue`。

## 运行时数据与多界

| 文件 | 说明 |
|------|------|
| `public/data/manifest.json` | `chapters`：要加载的章节名列表（会请求 `/data/{name}.json`） |
| `public/data/prologue.json` | 序章 realm |
| `public/data/skeleton.json` | 其余界（如折戟原）；可含 `planner_seed` |
| `public/data/design-seed.json` | Engine v2 全局种子；与 skeleton 内 `planner_seed` 运行时合并 |

**交互 → 换界**：多 realm 已加载时可用。结案后叙事区可提供 **「前往下一界」**（按 `manifest` 合并后的 realm 顺序）。

## 可选环境变量（模型与调试）

| 变量 | 作用 | 默认 |
|------|------|------|
| `VITE_AI_ENGINE_V2` | 设为 **`0` / `false` 关闭** v2；未设则 **开启** | 开启 |
| `VITE_AI_MODEL_*` | 各角色模型，见 `.env.example` | `gpt-4o-mini` 等 |
| `VITE_AI_DEBUG` | `1` / `true`：控制台 + 页面 AI debug 浮层 | 关 |

## 目录（摘要）

| 路径 | 说明 |
|------|------|
| `src/game/` | 状态机、存档、结局、`skeleton` 加载等 |
| `src/game/aiEngine/` | `chat` / `chatStream`、`agents`（planner、director…）、`beginDynamicStory` |
| `src/components/` | 叙事框、感应、卷轴、交互等 |
| `design/` | 策划与 AI 功能设定 Markdown |
| `scripts/` | 流水线与工具脚本 |
| `electron/` | 主进程与 preload |

## 运行时体验（摘要）

- 有 AI 的节点：先等 **境遇正文**（加载中有提示）；正文就绪后再出 **【感应】** 与选项。
- Planner 阶段有 **「正在构思故事大纲…」**；若大纲失败会 **Toast** 提示并保留骨架流程。
- **存档**：浏览器 `localStorage` 槽位；Electron 另写 `userData/saves/`。
- 路线图见仓库根目录 [`TODO.md`](../TODO.md)。

## 界面与字体

- **主字体**：凤凰点阵体 16px 等，依赖 `npm run copy-fonts`；手动获取见 [itch.io · Vonwaon Bitmap](https://timothyqiu.itch.io/vonwaon-bitmap)。
- **回退**：MuzaiPixel、Noto Sans SC；字号见 `index.css` 中 `--dot-size`。

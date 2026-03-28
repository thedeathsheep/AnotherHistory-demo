# 行旅 · Another History

Electron + React + TypeScript + Tailwind + Vite，与 GDD / TechnicalFrame 对齐。应用版本见本目录 **`package.json` 的 `version`**（当前 **3.0.0**），构建后显示在页面标题与 Electron 窗口标题。

## 环境

- Node.js 18+
- npm 或 pnpm

## 安装与运行

### 方式一：本机 Node（需已安装 Node.js 18+）

```bash
cd game
npm install
```

**浏览器开发（推荐先跑通）：**

```bash
npm run dev
```

打开 [http://localhost:5173](http://localhost:5173) 。若需 **运行时 AI**（境遇正文、补念、异史凝练），任选其一配置 Key：

- `game/.env`：`VITE_AIHUBMIX_API_KEY=sk-…`
- `game/public/config.json`（勿提交）：`{ "aihubmixApiKey": "sk-…" }`
- 环境变量：`AIHUBMIX_API_KEY`

**Engine v2 开关**：在 `.env` 中设置 `VITE_AI_ENGINE_V2=1`（或 `true`）才会加载 `design-seed.json` 并调用 **Planner** 生成动态大纲；未开启时始终走骨架节点，避免误消耗 API。模板见 `game/.env.example`。

**桌面端（Electron）：**

```bash
npm run electron:dev
```

会先启动 Vite，再打开 Electron 窗口并加载当前页面。

**AI 回归（离线）**：`npm run test:ai` 校验 plot_guide 匹配与禁忌词规则；已配置 Key 时可 `npm run test:ai -- --live` 做最小联网烟测；`npm run test:ai -- --live-planner` 可冒烟调用 Planner 并校验返回的 outline JSON（成本更高）。

**JSON 排版**：修改 [`public/data/skeleton.json`](public/data/skeleton.json) 后可执行 `npm run format:skeleton` 格式化为可读缩进（语义不变）。

### 方式二：Docker（两台机器环境一致，无需本机装 Node）

在**任意一台**有 Docker 的机器上：

```bash
cd game
docker compose up --build
```

浏览器打开 [http://localhost:5173](http://localhost:5173) 即可。Electron 桌面版仍需在本机安装 Node 后执行 `npm run electron:dev`。

## 打包

```bash
npm run build
```

产物在 `dist/`，可直接用静态服务器部署。**安装包**（electron-builder 等）尚未接入，见仓库根目录 [`TODO.md`](../TODO.md) M4-5。

## 内容生成流水线（离线）

策划修改 `design/序章大纲.md` 后：

```bash
npm run generate:prologue
```

- **输入**：`design/总设定.md`、`design/AI功能设定/`（ai1 / ai2 / ai3）、`design/序章大纲.md`
- **阶段**：AI-1 细纲 → AI-2 节点 → AI-3 叙事/选项文案 → `merge` → 写入 **`public/data/prologue.json`**
- **去重**：`generated/chapters/prologue/input_hash.json`，输入未变则跳过对应阶段
- **API Key**：与运行时相同（`VITE_AIHUBMIX_API_KEY` / `AIHUBMIX_API_KEY` / `config.json`）

**只改文案、不重跑 AI**：编辑 `generated/chapters/prologue/texts.json` 后执行 `node scripts/merge-only.mjs prologue`。

## 运行时数据与多界

| 文件 | 说明 |
|------|------|
| `public/data/manifest.json` | `chapters` 数组列出要加载的 JSON（如 `prologue`、`skeleton`） |
| `public/data/prologue.json` | 序章 realm（可由流水线生成） |
| `public/data/skeleton.json` | 其他界示例（如折戟原）；可与序章并列于 manifest |
| `public/data/design-seed.json` | **Engine v2** 全局种子（世界、序章 realm 等）；折戟原 Planner 字段在 `skeleton.json` 的 `planner_seed`，运行时会合并进 `DesignSeed` |

游戏内 **交互 → 换界** 在多个 realm 已加载时可用（保留三相/书箱/卷轴，从目标界入口节点继续）。

### 可选环境变量（模型与调试）

| 变量 | 作用 | 默认 |
|------|------|------|
| `VITE_AI_ENGINE_V2` | `1` / `true` 启用动态大纲与节拍管线 | 关闭（骨架模式） |
| `VITE_AI_MODEL_DEFAULT` | 未按角色指定时的模型 | `gpt-4o-mini` |
| `VITE_AI_MODEL_PLANNER` | 结构策划（大纲 JSON） | 同上 |
| `VITE_AI_MODEL_DIRECTOR` | 导演指令（场景/伏笔/门禁提示） | 同上 |
| `VITE_AI_MODEL_WRITER` | 境遇正文（可流式） | 同上 |
| `VITE_AI_MODEL_CHOICE` | 动态感应选项 | 同上 |
| `VITE_AI_MODEL_VERIFIER` | 校验（预留） | 同上 |
| `VITE_AI_MODEL_YISHI` | 异史凝练 | 同上 |
| `VITE_AI_DEBUG` | `1` / `true` 时控制台 + 页面右下角 **AI debug** 浮层（最近若干条请求日志） | 关 |

## 目录

| 目录/文件 | 说明 |
|-----------|------|
| `src/game/` | 类型、`GameState`、`save`/`endings`、`catalog`、`narrativeContext`、`aiOutput` |
| `src/game/aiEngine/` | `chat`/`chatStream`、`dataAcquisition`、`contextAssembly`、`agents`（planner/director/verifier）、`prompts`；`aiBridge.ts` 对外兼容导出 |
| `src/components/` | 叙事/状态/感应/卷轴、`Overlay`、物证/线索/交互框 |
| `design/` | 策划输入、AI 功能设定 |
| `scripts/` | 流水线 **PIPE-1～PIPE-9**（`generate-chapter.mjs`、`merge-only.mjs` 等） |
| `electron/` | Electron 主进程与 preload |

## 运行时体验（摘要）

- **节奏（有 AI 叙事的节点）**：先展示 **境遇正文**（生成中显示「境遇正文凝练中…」）；正文写入缓存后，再显示 **【感应】** 与选项（此前显示「待正文落定，感应方显。」）。补念请求在正文成稿之后发起，并携带当前正文语境。
- **存档**：浏览器 `localStorage` `anotherhistory_save_0`～`_4`；Electron 另写 `userData/saves/slot-N.json`；`hydrateSlotsFromElectron` 可补空槽。
- **交互**：顶栏「交互」→ 换界、存档槽、手动存档、读档、删档、清空全部。
- **物证/线索**：按钮打开 Overlay；展示名在 `src/game/catalog.ts`。
- **骨架字段**：`Choice.required_clue` / `drop_item`；`Node.gate` / `required_item` / `unlock_clue`；`hai_delta`；`__结案__` 等。
- **差距与路线图**：仓库根目录 **[`TODO.md`](../TODO.md)**（与实现对齐维护）。

## 界面与字体

- **主字体**：凤凰点阵体 16px（Vonwaon Bitmap），`public/fonts/VonwaonBitmap-16px.ttf`。`npm run copy-fonts`（或 `postinstall`）会尝试复制/下载；失败时见 [itch.io](https://timothyqiu.itch.io/vonwaon-bitmap) 手动放置。
- **回退**：目哉像素体（MuzaiPixel）、Noto Sans SC。`index.css` 中 `--dot-size` 可调字号。

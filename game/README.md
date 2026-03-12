# 行旅 · Another History

Electron + React + TypeScript + Tailwind，与 GDD / TechnicalFrame 对齐。

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

打开 [http://localhost:5173](http://localhost:5173) 。若需 AI 生成，在项目根目录的 `api_key.txt` 中配置好 key 后，在 `game` 下新建 `.env`：

```
VITE_AIHUBMIX_API_KEY=sk-你的key
```

或新建 `public/config.json`（不要提交）：`{ "aihubmixApiKey": "sk-..." }`

**桌面端（Electron）：**

```bash
npm run electron:dev
```

会先启动 Vite，再打开 Electron 窗口并加载当前页面。

### 方式二：Docker（两台机器环境一致，无需本机装 Node）

在**任意一台**有 Docker 的机器上：

```bash
cd game
docker compose up --build
```

浏览器打开 [http://localhost:5173](http://localhost:5173) 即可。代码用 Git 同步到另一台机器后，同样执行 `docker compose up`，环境一致。Electron 桌面版仍需在本机安装 Node 后执行 `npm run electron:dev`。

## 打包

```bash
npm run build
```

产物在 `dist/`，可直接用静态服务器部署。Electron 打包可后续用 electron-builder 等接入。

## 内容生成流水线

策划修改 `design/序章大纲.md` 后，运行流水线生成 `public/data/prologue.json`：

```bash
npm run generate:prologue
```

- **输入**：`design/总设定.md`、`design/AI功能设定/`、`design/序章大纲.md`
- **输出**：`generated/chapters/prologue/`（outline、nodes、texts、merged）→ 自动写入 `public/data/prologue.json`
- **去重**：输入 hash 相同时跳过该阶段，避免重复调用 API
- **API Key**：同游戏运行时，使用 `VITE_AIHUBMIX_API_KEY` 或 `AIHUBMIX_API_KEY` 或 `public/config.json`

**手写/手改文案**：若生成效果不理想，可直接编辑 `generated/chapters/prologue/texts.json`（或从 `design/examples/prologue_texts_example.json` 复制），再执行 `node scripts/merge-only.mjs prologue` 合并到 `public/data/prologue.json`，无需重新调 AI。

## 目录


| 目录/文件                       | 说明                   |
| --------------------------- | -------------------- |
| `src/game/`                 | 类型、骨架加载、状态、AI 桥接     |
| `src/components/`           | 叙事框、状态框、感应框、卷轴框      |
| `public/data/prologue.json` | 序章骨架（可由流水线生成） |
| `public/data/skeleton.json` | 主内容骨架 |
| `design/`                  | 策划输入、AI 功能设定 |
| `scripts/`                 | 内容生成流水线（PIPE-1～7） |
| `electron/main.cjs`         | Electron 主进程         |


## 界面与字体

- **主字体**：凤凰点阵体 16px（Vonwaon Bitmap），本地文件 `public/fonts/VonwaonBitmap-16px.ttf`。`npm run copy-fonts`（或 `postinstall`）会尝试自动下载；若失败，请从 [itch.io](https://timothyqiu.itch.io/vonwaon-bitmap) 下载 16px 的 TTF，重命名为 `VonwaonBitmap-16px.ttf` 放入 `public/fonts/`。
- **回退**：目哉像素体（MuzaiPixel）由 copy-fonts 从 `@chinese-fonts/mzxst` 复制到 `public/fonts/`；再回退 Noto Sans SC。字号使用 16px（凤凰点阵体设计尺寸），可在 `index.css` 的 `--dot-size` 改为 32px 放大。
- **流程**：`npm install` 后自动执行 copy-fonts（复制目哉 + 下载凤凰）；单独执行 `npm run copy-fonts`；`npm run build` 会先 copy-fonts 再打包。

## 与原型对应关系

- 核心循环与 prototype 一致：入界 → 叙事（骨架 + 可选 AI）→ 感应 → 抉择 → 结案（异史归档）。
- API Key 通过 `VITE_AIHUBMIX_API_KEY` 或 `public/config.json` 提供，与 prototype 的 `api_key.txt` 二选一即可。


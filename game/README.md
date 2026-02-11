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

打开 [http://localhost:5173](http://localhost:5173) 。若需 AI 生成，任选其一配置 API Key：

- **根目录或 game 下 .env**：`VITE_AIHUBMIX_API_KEY=sk-你的key`
- **game/public/config.json**（不要提交）：`{ "aihubmixApiKey": "sk-..." }`
- **根目录 api_key.txt**：文件内包含一行 `sk-...` 即可

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

## 打包与生产运行

```bash
npm run build
```

产物在 `dist/`。**Electron 生产模式**（加载 dist、读 .env/api_key 做运行时 AI）：

```bash
$env:NODE_ENV='production'; npx electron .
```

## 内容生成流水线

策划修改 `design/序章大纲.md` 后，运行流水线生成 `public/data/prologue.json`：

```bash
npm run generate:prologue
```

- **输入**：`design/总设定.md`、`design/AI功能设定/`、`design/序章大纲.md`
- **输出**：`generated/chapters/prologue/`（outline、nodes、texts、merged）→ 自动写入 `public/data/prologue.json`
- **去重**：输入 hash 相同时跳过该阶段，避免重复调用 API
- **API Key**：同游戏运行时，使用根或 game 下 `.env`、或 `public/config.json`、或根目录 `api_key.txt`
- **仅合并不调 AI**：`npm run merge-only`（已有 nodes + texts 时）

## 目录


| 目录/文件                       | 说明                   |
| --------------------------- | -------------------- |
| `src/game/`                 | 类型、骨架加载、状态、AI 桥接     |
| `src/components/`           | 叙事框、状态框、感应框、卷轴框      |
| `public/data/prologue.json` | 序章骨架（可由流水线生成） |
| `public/data/skeleton.json` | 主内容骨架 |
| `design/`                  | 策划输入、AI 功能设定 |
| `scripts/`                 | 内容生成流水线（PIPE-1～7） |
| `electron/main.cjs`         | Electron 主进程（.env、API Key、重新生成） |
| `项目结构说明.md`（仓库根）   | 目录与文件作用、过时项、数据流向           |


# 行旅 · Another History

仓库根目录。**可玩版本**在 **`game/`**（Electron + React + TypeScript + Vite + Tailwind）。

## 快速开始

```bash
cd game
npm install
npm run dev
```

浏览器打开 <http://localhost:5173>。桌面端：`npm run electron:dev`。详见 [`game/README.md`](game/README.md)。

## 文档索引

| 文档 | 用途 |
|------|------|
| [`TODO.md`](TODO.md) | **完成度 / 接下来做啥**（与代码同步维护） |
| [`game/README.md`](game/README.md) | 安装、流水线、目录、存档与运行时摘要 |
| [`GDD.md`](GDD.md) | 游戏设计全文 |
| [`TechnicalFrame.md`](TechnicalFrame.md) | 技术架构与模块职责 |
| [`ProjectManager.md`](ProjectManager.md) | 迭代与协作建议 |
| [`操作流程.md`](操作流程.md) | 环境、路径、常见问题 |
| [`game/design/`](game/design/) | 策划输入与 AI 功能设定（.md） |

## 版本

应用版本以 **`game/package.json`** 的 `version` 为准（构建时注入界面与 Electron 窗口标题）。

## AI 叙事引擎现状（摘要）

- **核心理念**：骨架（`public/data/*.json`）主要提供 **剧情导向/禁忌/目标/门禁/后果**；运行时由 AI 生成「境遇正文」与「感应选项文案」。
- **生成顺序（骨架节点）**：Conductor（计划）→ Writer（正文）→ ChoiceEngine（选项），并在必要时生成短区间 `rt:` 运行时微分支（多入口、多步、可回流）。
- **入口代码**：`game/src/App.tsx`（触发与缓存）、`game/src/game/aiEngine/`（chat/prompts/agents）。
- **更多说明**：见 [`TechnicalFrame.md`](TechnicalFrame.md) 与 [`game/README.md`](game/README.md) 的 AI 部分。

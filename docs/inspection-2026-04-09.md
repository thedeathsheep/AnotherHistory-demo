# 行旅 · Another History 全量对照表（2026-04-09）

> 说明  
> - 基于仓库当前代码与 TODO/GDD 目录结构做“实现对照”。  
> - 未运行测试，仅做静态代码与文件扫描。  
> - 状态：✅ 已确认、⚠️ 部分/需数据接入、❌ 未见实现。

---

## 状态快照（TODO 顶部“已完成”条目）

| 项 | 状态 | 证据 |
|---|---|---|
| 核心循环：入界→正文→感应→抉择→结案 | ⚠️ 部分核对 | `game/src/App.tsx` |
| AI 引擎分层 + plot/taboo 校验 + 补选项 | ✅ | `game/src/game/aiEngine/index.ts`, `game/src/game/aiEngine/prompts/` |
| Conductor 计划 + intents + rt 微分支 | ✅ | `game/src/game/aiEngine/agents/conductor.ts` |
| 状态与害（“18×HaiId”） | ⚠️ 文档不一致 | 代码已含 44 害：`game/src/game/haiCatalog.ts` |
| 物证/线索 | ✅ | `game/src/game/catalog.ts`, `game/src/components/ItemBox.tsx`, `game/src/components/ClueBox.tsx` |
| 多界与收束 | ✅ | `game/src/game/state.ts`, `game/src/game/endings.ts` |
| 存档（5 槽 + Electron 镜像） | ✅ | `game/src/game/save.ts`, `game/electron/main.cjs` |
| 版本号 | ✅ | `game/package.json` |

---

## M0–M4 对照

| ID | 项 | 状态 | 证据 |
|---|---|---|
| M0-1 | 鉴照关键词高亮 | ⚠️ 部分核对 | `game/src/components/NarrativeBox.tsx` |
| M0-2 | AI Debug（VITE_AI_DEBUG） | ✅ | `game/src/game/aiEngine/chat.ts`, `game/src/components/AiDebugOverlay.tsx` |
| M0-3 | aiBridge 拆分到 aiEngine | ✅ | `game/src/game/aiBridge.ts`, `game/src/game/aiEngine/` |
| M1-1 | HaiId + normalize | ✅ | `game/src/game/types.ts`, `game/src/game/haiCatalog.ts` |
| M1-2 | GameState.hais + applyChoice | ✅ | `game/src/game/state.ts` |
| M1-3 | 骨架 hai_delta | ✅ | `game/src/game/types.ts` |
| M1-4 | StatusBox 害名展示 | ✅ | `game/src/components/StatusBox.tsx` |
| M1-5/6/9 | 害 prompt 分档 | ⚠️ 未逐条核 | `game/src/game/aiEngine/prompts/narrative.ts` |
| M1-7 | applyTabooViolationToState | ✅ | `game/src/game/state.ts` |
| M1-8 | 惊蛰抖动 + 误触 | ✅ | `game/src/components/ChoiceList.tsx`, `game/src/App.tsx` |
| M1-10 | 点破 | ✅ | `game/src/App.tsx`, `game/src/game/state.ts` |
| M1-11 | 反噬 jian_zhao_penalty | ✅ | `game/src/game/state.ts`, `game/src/game/types.ts` |
| M1-12 | buildContext.hais + 全害滤镜 | ✅ | `game/src/game/aiEngine/dataAcquisition.ts`, `game/src/game/aiEngine/prompts/narrative.ts` |
| M1-13 | 鉴照混浊 prompt 噪音 | ⚠️ 部分核对 | `game/src/game/narrativeContext.ts`, `game/src/game/aiEngine/prompts/narrative.ts` |
| M2-1~M2-4 | Item/Clue + Overlay | ✅ | `game/src/components/ItemBox.tsx`, `game/src/components/ClueBox.tsx`, `game/src/components/Overlay.tsx` |
| M2-5 | generateChoices requireItemThought | ✅ | `game/src/game/aiEngine/index.ts`, `game/src/App.tsx` |
| M2-6 | required_clue 过滤 | ✅ | `game/src/game/state.ts`, `game/src/App.tsx` |
| M2-7 | required_item/unlock_clue/drop_item + catalog | ✅ | `game/src/game/types.ts`, `game/src/game/state.ts`, `game/src/game/catalog.ts` |
| M2-8 | 获得条带提示 | ✅ | `game/src/App.tsx`（`acquireBanner`） |
| M3-1 | 多界 + 换界 | ✅ | `game/src/game/state.ts`, `game/src/game/skeleton.ts` |
| M3-2 | 中途定稿 | ✅ | `game/src/game/state.ts`, `game/src/App.tsx` |
| M3-3/4 | ENDINGS 扩展 + evaluateEnding | ✅ | `game/src/game/endings.ts` |
| M3-5/6/7 | 结局文案与展示 | ⚠️ 部分核对 | `game/src/game/endings.ts` |
| M4-1 | 多槽 + Electron 镜像 | ✅ | `game/src/game/save.ts`, `game/electron/main.cjs` |
| M4-2 | InteractionBox | ✅ | `game/src/components/InteractionBox.tsx` |
| M4-3 | 卷轴侧栏/小屏入口 | ⚠️ 部分核对 | `game/src/App.tsx` |
| M4-4 | 主界面 polish | ❌ 未核对 | 未发现明确标注 |
| M4-5 | electron-builder 打包 | ✅ | `game/package.json` |
| M4-6 | CI + test:ai + vitest | ✅ | `.github/workflows/ci.yml`, `game/package.json` |

---

## AI-E1~AI-E25 对照

| ID | 项 | 状态 | 证据 |
|---|---|---|
| AI-E1 | AIContext 接口 | ✅ | `game/src/game/aiEngine/dataAcquisition.ts` |
| AI-E2 | buildContext | ✅ | `game/src/game/aiEngine/dataAcquisition.ts` |
| AI-E3 | getYishiSummary | ✅ | `game/src/game/aiEngine/dataAcquisition.ts` |
| AI-E4 | getChoiceHistorySummary | ✅ | `game/src/game/aiEngine/dataAcquisition.ts` |
| AI-E5 | parseRewardMarkers | ✅ | `game/src/game/aiOutput.ts` |
| AI-E6 | createYishiEntry / tags | ✅ | `game/src/game/aiOutput.ts`, `game/src/game/endings.ts` |
| AI-E7 | 自动 applyChoice 写入 | ⚠️ 明确未做 | `game/src/game/aiOutput.ts`（仅解析） |
| AI-E8 | applyChoice / gain_item/clue | ✅ | `game/src/game/state.ts` |
| AI-E9 | NarrativeContextManager.appendFact | ✅ | `game/src/game/narrativeContext.ts` |
| AI-E10 | Yishi summary 上限 | ✅ | `game/src/game/aiEngine/dataAcquisition.ts` |
| AI-E11 | 灵损摘要截断 | ✅ | `game/src/game/narrativeContext.ts` |
| AI-E12 | prompts 目录 | ✅ | `game/src/game/aiEngine/prompts/` |
| AI-E13 | 主叙事 prompt 规则 | ✅ | `game/src/game/aiEngine/prompts/narrative.ts` |
| AI-E14 | 异史凝练 prompt | ✅ | `game/src/game/aiEngine/prompts/yishi.ts` |
| AI-E15 | generateChoices + sceneNarrative | ✅ | `game/src/game/aiEngine/index.ts` |
| AI-E16 | item/npc prompt + 生成函数 | ⚠️ 未接入流程 | `game/src/game/aiEngine/index.ts`（无调用点） |
| AI-E17 | 提示词版本化 | ❌ 未见实现 | 未发现版本化逻辑 |
| AI-E18 | plot_guide 校验 | ✅（仅警告） | `game/src/game/aiEngine/index.ts` |
| AI-E19 | taboo 校验 | ✅（仅警告） | `game/src/game/aiEngine/index.ts` |
| AI-E20 | canEnterNode | ✅ | `game/src/game/state.ts` |
| AI-E21 | 后果归属 applyChoice | ✅ | `game/src/game/state.ts` |
| AI-E22 | coreFacts 注入 | ⚠️ 仅模板支持 | `game/src/game/aiEngine/prompts/yishi.ts`（无调用点） |
| AI-E23 | chat() 封装 | ✅ | `game/src/game/aiEngine/chat.ts` |
| AI-E24 | 降级策略 | ✅ | `game/src/game/aiEngine/index.ts` |
| AI-E25 | test:ai 静态回归 | ✅ | `game/src/game/aiRegression.ts`, `game/scripts/ai-regression.mjs` |

---

## D-1~D-4 对照

| ID | 项 | 状态 | 证据 |
|---|---|---|
| D-1 | 事件/剧情点层级 | ✅（结构已支持） | `game/src/game/types.ts`, `game/src/game/skeleton.ts` |
| D-2 | gate + required_item/unlock_clue | ✅ | `game/src/game/types.ts`, `game/src/game/state.ts` |
| D-3 | hai_trigger | ❌ 未见字段 | 未发现 `hai_trigger` |
| D-4 | 指令包扩展 | ⚠️ 部分 | `game/src/game/aiEngine/prompts/narrative.ts` |

---

## PIPE-1~PIPE-9 对照

| ID | 项 | 状态 | 证据 |
|---|---|---|
| PIPE-1 | design 文档 | ✅ | `game/design/` |
| PIPE-2 | ai1-outline.mjs | ✅ | `game/scripts/ai1-outline.mjs` |
| PIPE-3 | ai2-nodes.mjs | ✅ | `game/scripts/ai2-nodes.mjs` |
| PIPE-4 | ai3-texts.mjs | ✅ | `game/scripts/ai3-texts.mjs` |
| PIPE-5 | merge.mjs | ✅ | `game/scripts/merge.mjs` |
| PIPE-6 | input_hash 去重 | ✅ | `game/scripts/generate-chapter.mjs` |
| PIPE-7 | generate:prologue / generate | ✅ | `game/package.json`, `game/scripts/generate-chapter.mjs` |
| PIPE-8 | Electron 内重生成 | ✅ | `game/electron/main.cjs`, `game/src/App.tsx` |
| PIPE-9 | merge-only.mjs | ✅ | `game/scripts/merge-only.mjs` |

---

## SAVE-1~SAVE-5 对照

| ID | 项 | 状态 | 证据 |
|---|---|---|
| SAVE-1 | SaveDataV2/3 | ✅ | `game/src/game/save.ts` |
| SAVE-2 | localStorage + Electron | ✅ | `game/src/game/save.ts`, `game/electron/main.cjs` |
| SAVE-3 | 继续/新游戏 | ✅ | `game/src/App.tsx` |
| SAVE-4 | 新游戏清档 | ✅ | `game/src/game/save.ts`, `game/src/App.tsx` |
| SAVE-5 | 5 槽 | ✅ | `game/src/game/save.ts` |

---

## DB-1~DB-5

| ID | 项 | 状态 | 证据 |
|---|---|---|
| DB-1~DB-5 | 暂缓 | ✅ | `game/src/game/databasePolicy.ts` |


# 《行旅》开发 TODO — 与 GDD 差距与持续开发清单

> 基于 GDD.md、TechnicalFrame.md、ProjectManager.md 对比当前实现，产出可执行任务列表。  
> **AI 引擎**：`aiEngine/` 分层；流水线 PIPE-1～PIPE-9；Electron 重新生成与存档镜像（userData/saves）。  
> **更新于 2026-03-29**（对齐仓库当前实现；以下「未完成」多为 GDD 全量或策划数据侧）。**文案设定**：叙事为游戏服务、极简具体；禁止浅白/抽象/比喻/罗列；节点衔接见 design/AI功能设定/ai3_texts.md、ai2_nodes.md。

---

## 〇、状态快照（维护用）

### 已完成（代码已落地，可持续迭代数据与 prompt）

- **核心循环**：入界 → 境遇正文（骨架 + 可选 AI）→ **正文落定后再显感应** → 抉择 → 结案/中途定稿 → 异史入卷轴；加载副本用「境遇正文凝练中…」，感应未出时用「待正文落定，感应方显。」
- **AI**：`aiEngine/`（叙事 plot_guide 校验重试、**叙事禁忌重试**、异史 coreFacts、补选项 **在叙事成稿后** 请求并注入 **【当前境遇正文】**）；`aiBridge` 兼容导出；`npm run test:ai` 静态回归（plot + taboo）
- **状态与害**：三相档位 UI、18×`HaiId`、惊蛰抖动/误触、点破、反噬、避讳联动等（见 M1）
- **物证/线索**：模型、门禁、Overlay、凭物补念、`catalog`、抉择获得条带提示
- **多界与收束**：`manifest.json` 多 realm、`enterRealm` 换界、**定稿** `beginMidConclude`、结局矩阵 `evaluateEnding`
- **存档**：5 槽、V2 存盘、Electron 镜像、继续/新游戏
- **版本**：`game/package.json` 当前 **3.0.0**（里程碑标记，界面与 Electron 标题可读）

### 接下来（优先级从高到低，可按轮次摘取）

1. **发布与工程**：Electron **electron-builder** 安装包（M4-5）；主界面/槽位 **polish**（M4-4）
2. **体验**：卷轴小屏与侧栏统一（M4-3）；可选 **行旅纪要/抉择回顾** 面板（减上下文焦虑，数据已有 `choiceHistory` / 事实流）
3. **AI 与内容**：**AI-E16** 物品/NPC 独立模板；流水线把 **skeleton 界** 纳入或与 prologue 同规范生成；结局与害 **与 GDD 逐条对齐**（数据+条件）
4. **骨架演进**：**D-1** 事件/剧情点层级；**D-3** `hai_trigger` 等扩展字段（可选）
5. **暂缓**：SQLite/上云（`databasePolicy.ts`）

---

## 一、当前完成度概览


| 模块          | 完成度         | 说明                                                                       |
| ----------- | ----------- | ------------------------------------------------------------------------ |
| 技术栈         | ✅ 100%      | Electron + React + TS + Tailwind                                         |
| 骨架加载        | ✅ ~92%      | 界/节点/plot_guide/禁忌/门禁 gate、required_item、unlock_clue；仍缺事件/剧情点层级（D-1）     |
| 入界→感应→抉择→结案 | ✅ ~92%      | 核心循环 + AI 叙事/异史/补选项；**正文先于感应**；语义解锁；凭物；**换界**；**中途定稿**                   |
| **AI 引擎**   | ⚠️ **~72%** | buildContext、灵损摘要、plot/禁忌重试、害分档、coreFacts、补念带 **sceneNarrative**；缺 E16 等 |
| 三相状态        | ✅ ~95%      | 档位 UI（无百分比）；点破按线索降耗；结案 jian_zhao_penalty（反噬）已有                           |
| 害系统         | ⚠️ **~35%** | 运行时 18 种 HaiId + prompt 滤镜 + 避讳联动；GDD 40+ 害与惊蛰 UI 特效等仍缺                  |
| 物证/线索系统     | ⚠️ **~55%** | Item/Clue、gate、gain、Overlay 物证/线索框、`catalog.ts` 可扩展展示名                   |
| 结局矩阵        | ⚠️ **~45%** | 多结局 ID + 系列 + `evaluateEnding` 优先级；策划侧条件与更多结局文案可扩                        |
| UI 框        | ⚠️ **~75%** | Overlay 物证/线索/交互；卷轴侧栏 md+、移动卷轴入口；缺专用「设置」等                                |
| 存读档         | ✅ **~85%**  | 5 槽 localStorage + Electron 镜像；继续读首槽有档；交互框内选手动存/删                        |
| 鉴照关键词高亮     | ✅ **~90%**  | `*…`* / `[…]` 清彻/混浊/障目 分档样式（NarrativeBox + CSS）                          |
| **数据库**     | ⚠️ **暂缓**   | `databasePolicy.ts`：单机 JSON 足够；SQLite 待需求再议                              |


**整体**：M0～M2 主干已在代码落地，M3/M4 部分完成；与 GDD 全文量（多界流程、40+ 害机制、SQLite）仍有差距。**设计约定**：三相 UI 不显式百分比；害不显强度数值；`plot_guide` 优先，`truth_anchors` 兼容。

---

## 一·五、策划内容文件格式约定


| 类型                                    | 格式        | 说明                         |
| ------------------------------------- | --------- | -------------------------- |
| **策划输入**（总设定、序章大纲、AI 功能设定）            | **.md**   | 人工编写，供 AI 直接阅读原文；易版本管理、易编辑 |
| **AI 输出**（细纲、节点、文本）                   | **.json** | 结构化，便于程序合并、校验、加载           |
| **游戏加载**（prologue.json、skeleton.json） | **.json** | 运行时加载，需稳定 schema           |


**结论**：策划侧用 **Markdown** 写大纲/设定；AI 流水线读取 .md 作为 prompt 输入，输出 **JSON** 到 `generated/`，合并后写入 `public/data/`。

---

## 二、AI 引擎完整实现（核心优先级）

> 对应 GDD 5.5；aiEngine 已分层，aiBridge 保留为兼容入口。  
> **Engine v2**：`design-seed.json` + `runPlanner` / `runDirector`、`contextAssembly`（L0–L5）、`WorldStateGraph`、`generateDynamicBeatNarrative`（可流式）与 `generateDynamicBeatChoices`、`SaveData` v3；Planner 失败或未配置种子时 **骨架降级**。

### 2.1 数据获取层（Data Acquisition）

- **AI-E1** 定义 `AIContext` 接口：聚合骨架节点、GameState（三相+害）、物证、线索、卷轴摘要、当前抉择历史
- **AI-E2** 实现 `buildContext(node, gameState)`：从 GameState 与 Skeleton 组装完整上下文，供所有 AI 场景使用
- **AI-E3** 卷轴摘要：实现 `getYishiSummary(entries, maxTokens)`，将近期异史压缩为可注入 prompt 的摘要
- **AI-E4** 抉择历史摘要：实现 `getChoiceHistorySummary(choices)`，供异史凝练与念头生成使用

### 2.2 数据修改层（Data Modification）

- **AI-E5** `aiOutput.ts`：`parseRewardMarkers`、结构化 `YishiEntry`；完整 `AIOutput` 联合类型可再收敛
- **AI-E6** `createYishiEntry` / 卷轴存 `tags`；统计见 `endings.parseYishiTagStats`
- [~] **AI-E7** 解析器已有；**未**在叙事回包后自动 `applyChoice` 式写入（避免误解析）；骨架 `gain_item` / `gain_clue` 已生效
- **AI-E8** 数值与门禁：`GameState.applyChoice`；AI 仅改文案；异史 `addYishiEntry`

### 2.3 叙事上下文管理（Context Management）

- **AI-E9** `narrativeContext.ts`：`NarrativeContextManager.appendFact` + 注入主叙事 prompt
- **AI-E10** `getYishiSummary` 条数/ token 上限；事实条数上限 12
- **AI-E11** 灵损：摘要截断（非破坏存储）；鉴照混浊：叙事 prompt 噪音（原有 + 保留）

### 2.4 场景化提示词管理（Scenario-based Prompts）

- **AI-E12** 建立 `prompts/` 目录：主叙事、异史凝练、感应念头、物品描述、剧情人物等模板，支持占位符
- **AI-E13** 主叙事 prompt：支持 plot_guide、taboo、objective、三相档位；叙事为游戏服务、极简具体；禁止浅白/抽象/比喻/罗列，要求具体情节点或与前后衔接
- **AI-E14** 异史凝练 prompt：支持结论标签、抉择摘要、coreFacts、可选 [真史][疑伪][秽] 标签
- **AI-E15** `generateChoices` + 凭物：持物时 `(凭物)` 念头；**叙事成稿后再请求**，并注入 **【当前境遇正文】**（`sceneNarrative`），与骨架 next 合并
- **AI-E16** 物品/NPC：`prompts/item.ts`、`prompts/npc.ts`；`generateItemNarrative` / `generateNpcDialogue`（`[game/src/game/aiEngine/index.ts](game/src/game/aiEngine/index.ts)`）；`Node.npcs`、`RealmNpc`
- **AI-E17** 提示词版本化：模板文件纳入 Git，每次修改打 tag 或 commit 说明，便于回归

### 2.5 与策划内容的交互逻辑（Skeleton Interaction）

- **AI-E18** `narrativeMatchesPlotGuide` + 叙事一次重试（`aiEngine/index.ts`）
- **AI-E19** 禁忌：选项侧 `violatesTaboo`；叙事生成后同规则检测，`generateNodeNarrative` 一次禁忌重试（`aiEngine/index.ts`）
- **AI-E20** `canEnterNode`；`gateBlocked` 时不拉 AI 选项 effect
- **AI-E21** 选项后果归属：state、hai_delta、next、conclusion_label 完全由骨架 + applyChoice 控制，AI 不直接改写
- **AI-E22** 异史核心事实：凝练 prompt 支持 coreFacts 占位，可选列出必含事实；支持 [真史][疑伪][秽] 标签

### 2.6 基础设施

- **AI-E23** 统一 `chat()` 封装：超时、重试、日志、可选 debug 开关（VITE_AI_DEBUG=1 开启）
- **AI-E24** 降级策略：API 失败时返回 null，App 回退到骨架 description
- **AI-E25** `npm run test:ai` 静态校验 `narrativeMatchesPlotGuide` + `violatesTaboo`（`tabooCases`）；`--live` 可选打 API；更全回归见 M4-6

---

## 三、按里程碑拆分的 TODO

### M0 收尾（已关闭）

- **M0-1** 鉴照关键词高亮：`NarrativeBox` + `index.css` 清彻/混浊/障目
- **M0-2** 调试日志：可选 debug 模式，默认关闭；设置 `VITE_AI_DEBUG=1` 开启
- **M0-3** AI 引擎重构起步：将 aiBridge 拆为 `aiEngine/` 目录，dataAcquisition、prompts、chat 分层

### M1：状态与害

#### 害系统基础

- **M1-1** `HaiId` 18 种 + `normalizeHais`；强度 0–100
- **M1-2** `GameState.hais` + `applyChoice` / `hai_delta`
- **M1-3** 骨架 `hai_delta`（策划数据可配）
- **M1-4** StatusBox 仅害名；害多时可换行

#### 首批 5 种害 + 扩展

- **M1-5**～**M1-6**、**M1-9** prompt 分档（`narrative.ts` `buildHaiEffects`）
- **M1-7** `applyTabooViolationToState`（灵损 + 避讳害 + 扣命烛）
- **M1-8** 【惊蛰】选项区 CSS 抖动（`jing_zhe>0` 加重）；`jing_zhe>30` 时概率误触：不执行抉择、叠害、扣根脚、提示文案（`ChoiceList` + `App`）
- 扩展害（染墨、重影等）prompt 规则已挂接；强度与 GDD 逐条对齐可再调

#### 鉴照博弈

- **M1-10** 【点破】：消耗比例为 `dianPoConsumePercent(线索数)`（约 5%～10%），剔选项
- **M1-11** 【反噬】：`choice.jian_zhao_penalty` 结案扣鉴照

#### AI 与害联动

- **M1-12** `buildContext.hais` + 全害滤镜
- **M1-13** 鉴照混浊：状态 + 叙事指令（原有）

### M2：物证与线索

- **M2-1**～**M2-4** `Item`/`Clue`、`ItemBox`/`ClueBox` + Overlay
- **M2-5** `generateChoices(..., requireItemThought)`
- **M2-6** `Choice.required_clue` + `filterChoicesByClue`
- **M2-7** 节点 `required_item`/`unlock_clue`；选项 `drop_item`；`catalog.ts` 注册展示名
- **M2-8** 抉择后若有 `gain_item`/`gain_clue`：选择区顶栏黄字 `[书箱一沉：…]` / `[心头一亮：…]` 约 4.5s（`App`）；叙事正文内 AI 标记仍可由 `aiOutput.parseRewardMarkers` 扩展

### M3：多界与结局

- **M3-1** 多界：`Skeleton.realms` + **换界**：交互 Overlay 列表、`GameState.enterRealm`（保留三相/害/物证/线索/卷轴/历史，从目标界 `entry_node` 继续）；换界清空 AI 叙事与补选项缓存并写入事实「入界：…」
- **M3-2** **定稿**：感应区「定稿」→ 确认后 `beginMidConclude`（保留三相/害/物证/线索，离点当前节点）+ 异史标签 `中途定稿` 与骨架结案同流程（`MID_CONCLUDE_LABEL`、`state.ts`）
- **M3-3** `ENDINGS` 扩展（多 ID + `series`）
- **M3-4** `evaluateEnding` 优先级链
- **M3-5** 败史 Q/R/S/T/Y + 存史 A/I + 化史 B/D 等已占位
- **M3-6** 卷轴标签比例 + 害 + 步数 U 等
- **M3-7** 结案叙事区展示 `系列｜标题` + 描述

### M4：可发布候选

- **M4-1** 多槽存档 + Electron 镜像（见第六节）
- **M4-2** `InteractionBox`（交互按钮进 Overlay）
- [~] **M4-3** 卷轴：md 侧栏 + 小屏 Overlay「卷轴」入口；与 GDD「随时独立层」仍可再统一
- **M4-4** 主界面 **可再 polish**（槽位选择屏等）
- **M4-5** Electron **electron-builder**：`npm run electron:pack`（见 `game/package.json` `build` 字段）
- **M4-6** `npm run test:ai` + **Vitest** `npm run test:unit`；GitHub Actions `.github/workflows/ci.yml`（`game` 目录 build + test）

---

## 四、骨架与数据层增强

- **D-1** 事件/剧情点层级：`Realm.events` + `PlotPoint` + `flattenRealmNodes` / `normalizeLoadedRealm`（`[game/src/game/types.ts](game/src/game/types.ts)`、`[game/src/game/skeleton.ts](game/src/game/skeleton.ts)`）
- **D-2** `gate` + `required_item` / `unlock_clue`
- [~] **D-3** `hai_delta` 已有；独立 `hai_trigger` 字段 **未加**
- **D-4** 指令包扩展：plot_guide（核心剧情导向，可选）、Hais、Items、Clues，与 GDD 5.5 对齐；骨架字段优先用 plot_guide，兼容 truth_anchors

## 五、内容生成流水线（AI 流水线与存储规范）

> 策划仅提供核心元素+大纲（.md）；细纲、节点、文本由三级 AI 生成，输出 .json 并存储，避免重复生成。

- **PIPE-1** 建立 `design/总设定.md`、`design/AI功能设定/`（ai1_outline.md、ai2_nodes.md、ai3_texts.md）
- **PIPE-2** AI-1 细纲生成器：`scripts/ai1-outline.mjs`，读取 总设定 + ai1_outline + 序章大纲 → outline.json
- **PIPE-3** AI-2 节点生成器：`scripts/ai2-nodes.mjs`，读取 ai2_nodes + outline → nodes.json
- **PIPE-4** AI-3 文本生成器：`scripts/ai3-texts.mjs`，读取 ai3_texts + nodes → texts.json
- **PIPE-5** 合并脚本：`scripts/merge.mjs`，nodes + texts → prologue.json
- **PIPE-6** 去重：`input_hash.json` 记录输入 hash，相同则跳过该阶段
- **PIPE-7** CLI：`npm run generate:prologue` 或 `node scripts/generate-chapter.mjs prologue`
- **PIPE-8** Electron 内「重新生成内容」：主进程 IPC 调用 `node scripts/generate-chapter.mjs prologue --force`，完成后刷新页面；仅 Electron 显示该按钮
- **PIPE-9** 仅合并不调 AI：`node scripts/merge-only.mjs prologue`，用于只改 texts 后更新 merged 与 public/data/prologue.json

**文案与节点约定**：ai3_texts.md 规定叙事为游戏服务、极简具体、禁止浅白/抽象/比喻/罗列、节点间逻辑与趣味；ai2_nodes.md 规定节点间 next/plot_guide 形成因果或张力推进。

## 六、存档与重置系统

> 存档记录上下文、节点、游戏数据，避免下次进入丢失；重置支持彻底重开或继续游戏。

- **SAVE-1** `SaveDataV2`：含 `items`/`clues`/`yishiEntries`/`stepsTaken`（cachedNarrative 仍运行时，未入档）
- **SAVE-2** localStorage + Electron `userData/saves/slot-N.json`
- **SAVE-3** 有档提示继续/新游戏；`hydrateSlotsFromElectron` 补空槽
- **SAVE-4** 新游戏清全部槽；单槽删除在交互框
- **SAVE-5** 5 槽 + `activeSaveSlot` 驱动写入

### 策划内容与 prologue 同步

- **SYNC-1** 策划案/大纲修改后，prologue.json 需重新生成：运行 `npm run generate:prologue` 或在 Electron 内点击「重新生成内容」
- **SYNC-2** 流水线已实现，prologue.json 由流水线生成；仅改文案时可用 `merge-only.mjs` 免重新调 AI

### 超长上下文与向量库（远期可选）

- **VEC-1** 存档/读档：**无需**向量库，JSON 序列化即可
- **VEC-2** AI 上下文：卷轴/抉择历史很长时，优先用**摘要/截断**；若条目上千、需语义检索再注入 AI，再考虑 RAG + 向量库

---

## 七、数据库与存储（GDD 5.6）

- **DB-1**～**DB-5** **暂缓**：见 `game/src/game/databasePolicy.ts`；当前 JSON + localStorage 满足单机；若上云/检索再议 SQLite/PG

---

## 八、建议迭代顺序


| 轮次        | 目标          | 建议任务                                     |
| --------- | ----------- | ---------------------------------------- |
| **第 1 轮** | 存档与重置       | [x] 多槽 + Electron 镜像；继续/新游戏              |
| **第 2 轮** | 内容生成流水线     | [x] PIPE-1～PIPE-9                        |
| **第 3 轮** | AI + M0     | [x] M0-1、叙事重试、coreFacts、鉴照 CSS           |
| **第 4 轮** | 数据修改 + 策划交互 | [x] 大部；E19 叙事禁忌重试已接；E7 叙事自动发奖 可选         |
| **第 5 轮** | 害与鉴照 + 上下文  | [x] AI-E9～E11、M1 主干；M1-8 惊蛰 UI/误触        |
| **第 6 轮** | 物证与线索       | [x] M2 主干；M2-8、AI-E16 待                  |
| **第 7 轮** | 多界与结局       | [x] M3-1 换界、M3-2 定稿、结局链；余 M4-4 界面 polish |
| **第 8 轮** | 数据库与存读档     | 暂缓 DB；存档已完成                              |
| **第 9 轮** | 发布候选        | M4-5 打包、M4-6 回归、M4-4 polish              |


---

## 九、快速参考

- **aiEngine**：`game/src/game/aiEngine/` — chat、dataAcquisition、prompts（叙事 plot+禁忌重试、害分档、yishi coreFacts、**choices + sceneNarrative**）
- **多 realm**：`public/data/manifest.json` 的 `chapters` 列表；`loadSkeleton()` 合并各 JSON 为 `Skeleton.realms`
- **节奏**：AI 节点先缓存叙事再拉补念；UI 在正文未缓存时不渲染感应列表（见 `App.tsx` 常量 `AI_BODY_LOADING_HINT` / `SENSE_AFTER_BODY_HINT`）
- **状态与类型**：`types.ts`（Item/Clue/YishiEntry/HaiId×18）、`state.ts`、`catalog.ts`、`aiOutput.ts`、`narrativeContext.ts`、`endings.ts`、`save.ts`（`saveStorageKey`、`hydrateSlotsFromElectron`）
- **UI**：`Overlay`、`ItemBox`、`ClueBox`、`InteractionBox`；`NarrativeBox` 鉴照三档高亮
- **Electron**：`write/read/delete-save-slot` IPC
- **文案与文风**（design/AI功能设定/ai3_texts.md、ai2_nodes.md）：
  - 叙事为游戏服务：1–2 句点明处境即交选项，不罗列元素。
  - 所有描述必须具体：只写具体动作、物象、身体反应；禁止抽象句（思绪、心、意识、清晰的蓝天、宁静的环境、……中游走）、浅白句（渐渐、感受到、内心觉察、熟悉又陌生）、比喻句、罗列。
  - 叙事趣味与节点逻辑：每个节点要有具体情节点或与前后衔接；ai2 节点间 next/plot_guide 形成因果或张力推进，ai3 描述与前后形成衔接。
- **术语**：核心剧情导向用 `plot_guide`；`truth_anchors` 仅作兼容，loader 优先 plot_guide
- **Electron 重新生成**：`electron/main.cjs` 用 `node` 跑 `generate-chapter.mjs`；preload 暴露 `regenerateGenerated('prologue')`；成功后 `location.reload()`
- **仅合并文案**：`node scripts/merge-only.mjs prologue`，不调 AI，只把 texts 合并进 merged 与 public/data/prologue.json
- **GDD 5.5**：AI 引擎完整架构；**GDD 5.6**：数据存储与数据库
- **入界**：界 > 事件 > 剧情点 > 节点
- **感应**：1–5 个念头（当前骨架写死）
- **三相**：命烛、根脚、鉴照
- **害**：40+ 种，【神】【身】【业】【数】
- **物证**：厌胜、仪轨、随身器；凭物感应
- **线索**：真名、禁忌、因果残片；语义解锁


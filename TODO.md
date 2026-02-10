# 《行旅》开发 TODO — 与 GDD 差距与持续开发清单

> 基于 GDD.md、TechnicalFrame.md、ProjectManager.md 对比当前实现，产出可执行任务列表。  
> **AI 引擎**：运行时已分层（aiEngine）；**内容生成流水线**（PIPE-1～PIPE-9）已实现；Electron 内可一键重新生成 generated。
> 更新于 2026-02-09。**文案设定**：叙事为游戏服务、极简 1–2 句点明处境；所有描述必须具体，禁止浅白/抽象/比喻/罗列；节点间要有叙事趣味与逻辑衔接（ai2/ai3 均已约束）。详见 design/AI功能设定/ai3_texts.md、ai2_nodes.md。

---

## 一、当前完成度概览


| 模块          | 完成度            | 说明                                               |
| ----------- | -------------- | ------------------------------------------------ |
| 技术栈         | ✅ 100%         | Electron + React + TS + Tailwind                 |
| 骨架加载        | ✅ 90%          | 界/节点/plot_guide（核心剧情导向）/禁忌/目标已有；缺事件/剧情点层级、门禁条件 |
| 入界→感应→抉择→结案 | ✅ 80%          | 核心循环可跑通；选项为骨架写死                                  |
| **AI 引擎**   | ⚠️ **雏形 ~40%** | aiEngine 分层完成；三相档位影响叙事（命烛摇曳→疑似/幻觉，鉴照混浊→噪音）；异史标签/核心事实；降级策略；缺害系统、感应念头 |
| 三相状态        | ✅ 90%          | 命烛/根脚/鉴照已有；缺点破、反噬、鉴照噪音                           |
| 害系统         | ❌ 0%           | 40+ 种害未实现                                        |
| 物证/线索系统     | ❌ 0%           | 无                                                |
| 结局矩阵        | ❌ 5%           | 仅三相归零                                            |
| UI 框        | ⚠️ 60%         | 缺物证框、线索框、交互框                                     |
| 存读档         | ❌ 0%           | 无                                                |
| 鉴照关键词高亮     | ❌ 0%           | 未解析 `*…*` / `[…]`                                |
| **数据库**     | ❌ 0%           | 骨架、状态、存档、异史等需统一存储                                |


**整体**：M0 原型 ~85%，距完整 AI 引擎与 M1 尚远。**设计约定**：三相不显式展现百分比；害不展现强度；核心剧情导向（plot_guide）为开放可选；已弃用 truth_anchors/真理锚点表述。

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

### 2.1 数据获取层（Data Acquisition）

- [x] **AI-E1** 定义 `AIContext` 接口：聚合骨架节点、GameState（三相+害）、物证、线索、卷轴摘要、当前抉择历史
- [x] **AI-E2** 实现 `buildContext(node, gameState)`：从 GameState 与 Skeleton 组装完整上下文，供所有 AI 场景使用
- [x] **AI-E3** 卷轴摘要：实现 `getYishiSummary(entries, maxTokens)`，将近期异史压缩为可注入 prompt 的摘要
- [x] **AI-E4** 抉择历史摘要：实现 `getChoiceHistorySummary(choices)`，供异史凝练与念头生成使用

### 2.2 数据修改层（Data Modification）

- **AI-E5** 定义 `AIOutput` 与解析结果类型：`{ narrative?, choices?, yishi?, itemGained?, clueGained?, tags? }`
- **AI-E6** 异史标签解析：从 AI 凝练结果中解析 `[真史]` / `[疑伪]` / `[秽]` 等标签，写入卷轴
- **AI-E7** 物证/线索获得解析（可选）：若 AI 输出含 `[书箱一沉：…]` / `[心头一亮：…]` 等约定格式，解析并触发 GameState 变更；或由骨架/节点显式配置
- **AI-E8** 与 Narrative Engine 的接口约定：AI 输出经解析后，由谁负责 applyChoice、addYishiEntry、addItem、addClue，边界清晰

### 2.3 叙事上下文管理（Context Management）

- **AI-E9** 实现 `NarrativeContextManager`：维护当前界/事件内的关键事实摘要（地点、人物、禁忌、关键选择）
- **AI-E10** 上下文窗口策略：单次请求携带内容上限、摘要策略（如最近 N 条异史 + 当前事件摘要）
- **AI-E11** 害/鉴照对上下文的影响：如【灵损】时随机截断部分历史、鉴照混浊时注入「忽略前文细节」类指令

### 2.4 场景化提示词管理（Scenario-based Prompts）

- [x] **AI-E12** 建立 `prompts/` 目录：主叙事、异史凝练、感应念头、物品描述、剧情人物等模板，支持占位符
- [x] **AI-E13** 主叙事 prompt：支持 plot_guide、taboo、objective、三相档位；叙事为游戏服务、极简具体；禁止浅白/抽象/比喻/罗列，要求具体情节点或与前后衔接
- [x] **AI-E14** 异史凝练 prompt：支持结论标签、抉择摘要、coreFacts、可选 [真史][疑伪][秽] 标签
- **AI-E15** 感应念头 prompt（远期）：1–5 条选项生成，骨架约束 + 凭物念头注入，输出格式约定
- **AI-E16** 物品/剧情人物 prompt（M2 后）：以物寻线、NPC 对话与态度，独立模板
- **AI-E17** 提示词版本化：模板文件纳入 Git，每次修改打 tag 或 commit 说明，便于回归

### 2.5 与策划内容的交互逻辑（Skeleton Interaction）

- **AI-E18** Plot_Guide（核心剧情导向）校验：若有 plot_guide/策划约束则校验，不包含则重试或降级到兜底；均为可选
- **AI-E19** 禁忌校验：输出中不得出现触犯 taboo 的表述，否则重试或替换
- **AI-E20** 门禁前置：调 AI 前由 Narrative Engine 判定门禁（物证/线索/状态），不通过则不走 AI 分支
- **AI-E21** 选项后果归属：state、hai_delta、next、conclusion_label 完全由骨架 + applyChoice 控制，AI 不直接改写
- [x] **AI-E22** 异史核心事实：凝练 prompt 支持 coreFacts 占位，可选列出必含事实；支持 [真史][疑伪][秽] 标签

### 2.6 基础设施

- [x] **AI-E23** 统一 `chat()` 封装：超时、重试、日志、可选 debug 开关（VITE_AI_DEBUG=1 开启）
- [x] **AI-E24** 降级策略：API 失败时返回 null，App 回退到骨架 description
- **AI-E25** 回归测试集：关键节点保存「输入 context + 期望约束」，定期跑通校验

---

## 三、按里程碑拆分的 TODO

### M0 收尾（当前冲刺）

- **M0-1** 鉴照关键词高亮：NarrativeBox 解析 `*…*` / `[…]` 并高亮，随鉴照档位调整
- [x] **M0-2** 调试日志：可选 debug 模式，默认关闭；设置 `VITE_AI_DEBUG=1` 开启
- [x] **M0-3** AI 引擎重构起步：将 aiBridge 拆为 `aiEngine/` 目录，dataAcquisition、prompts、chat 分层

### M1：状态与害

#### 害系统基础

- **M1-1** 害数据类型：`Hai` 枚举/常量，害强度 0–100
- **M1-2** 害与 GameState：`hais: Record<HaiId, number>`，增减与归零
- **M1-3** 害触发：骨架 choice.state / 节点支持 `hai_delta`
- **M1-4** StatusBox 展示害（仅名称，不展现强度）

#### 首批 5 种害

- **M1-5** 【灵损】：prompt 注入逻辑跳跃、叙事混入「疑似」「或是幻觉」
- **M1-6** 【受潮】：prompt 强制粘稠/阴冷/腐朽修辞
- **M1-7** 【避讳】：违反 taboo 时叠加重度灵损或扣命烛
- **M1-8** 【惊蛰】：选项抖动或误触惩罚
- **M1-9** 【灵沛】：拮抗灵损，描述更冷峻

#### 鉴照博弈

- **M1-10** 【点破】：消耗 10% 鉴照，高亮禁忌或剔除死路
- **M1-11** 【反噬】：结案时位格过高则扣鉴照

#### AI 与害联动

- **M1-12** AIContext 包含 hais；prompt 根据害类型注入感官滤镜
- **M1-13** 鉴照混浊：prompt 注入噪音指示，扩充描述、混入干扰细节

### M2：物证与线索

- **M2-1** 物证类型与 GameState：`items: Item[]`
- **M2-2** 物证框 UI
- **M2-3** 线索类型与 GameState：`clues: Clue[]`
- **M2-4** 线索框 UI
- **M2-5** 【凭物感应】：持物时强制注入凭物念头
- **M2-6** 【语义解锁】：unlock_choice_by_clue
- **M2-7** 骨架扩展：required_item、unlock_clue、drop_item
- **M2-8** 获得物证/线索的叙事反馈

### M3：多界与结局

- **M3-1** 多界数据
- **M3-2** 界切换与定稿
- **M3-3** 结局表数据
- **M3-4** 结局判定引擎
- **M3-5** 首批 5 个结局（Q/R/S + A/B）
- **M3-6** 异史标签与结局条件
- **M3-7** 结局展示 UI

### M4：可发布候选

- **M4-1** 存读档（详见六、存档与重置系统）
- **M4-2** 交互框
- **M4-3** 卷轴框独立层
- **M4-4** 主界面与流程
- **M4-5** Electron 打包
- **M4-6** 核心逻辑回归

---

## 四、骨架与数据层增强

- **D-1** 事件/剧情点层级：界 > 事件 > 剧情点 > 节点（可先扁平兼容）
- **D-2** 门禁条件：`gate: { item?, clue?, stat_min? }`
- **D-3** 害配置：hai_trigger、hai_delta
- **D-4** 指令包扩展：plot_guide（核心剧情导向，可选）、Hais、Items、Clues，与 GDD 5.5 对齐；骨架字段优先用 plot_guide，兼容 truth_anchors

## 五、内容生成流水线（AI 流水线与存储规范）

> 策划仅提供核心元素+大纲（.md）；细纲、节点、文本由三级 AI 生成，输出 .json 并存储，避免重复生成。

- [x] **PIPE-1** 建立 `design/总设定.md`、`design/AI功能设定/`（ai1_outline.md、ai2_nodes.md、ai3_texts.md）
- [x] **PIPE-2** AI-1 细纲生成器：`scripts/ai1-outline.mjs`，读取 总设定 + ai1_outline + 序章大纲 → outline.json
- [x] **PIPE-3** AI-2 节点生成器：`scripts/ai2-nodes.mjs`，读取 ai2_nodes + outline → nodes.json
- [x] **PIPE-4** AI-3 文本生成器：`scripts/ai3-texts.mjs`，读取 ai3_texts + nodes → texts.json
- [x] **PIPE-5** 合并脚本：`scripts/merge.mjs`，nodes + texts → prologue.json
- [x] **PIPE-6** 去重：`input_hash.json` 记录输入 hash，相同则跳过该阶段
- [x] **PIPE-7** CLI：`npm run generate:prologue` 或 `node scripts/generate-chapter.mjs prologue`
- [x] **PIPE-8** Electron 内「重新生成内容」：主进程 IPC 调用 `node scripts/generate-chapter.mjs prologue --force`，完成后刷新页面；仅 Electron 显示该按钮
- [x] **PIPE-9** 仅合并不调 AI：`node scripts/merge-only.mjs prologue`，用于只改 texts 后更新 merged 与 public/data/prologue.json

**文案与节点约定**：ai3_texts.md 规定叙事为游戏服务、极简具体、禁止浅白/抽象/比喻/罗列、节点间逻辑与趣味；ai2_nodes.md 规定节点间 next/plot_guide 形成因果或张力推进。

## 六、存档与重置系统

> 存档记录上下文、节点、游戏数据，避免下次进入丢失；重置支持彻底重开或继续游戏。

- **SAVE-1** 存档结构：`realmId`、`currentNodeId`、`stats`、`choiceHistory`、`yishiEntries`、cachedNarrative 等，可序列化为 JSON
- **SAVE-2** 存储方式：localStorage / IndexedDB；Electron 可用 `app.getPath('userData')` 存 JSON 文件
- **SAVE-3** 启动时检测：若有存档，提示「继续游戏」/「彻底重置」；无存档则直接新游戏
- **SAVE-4** 彻底重置：清空存档，`startRealm()` 从头开始
- **SAVE-5** 多档位（可选）：支持多个存档槽，读写时指定 slot

### 策划内容与 prologue 同步

- [x] **SYNC-1** 策划案/大纲修改后，prologue.json 需重新生成：运行 `npm run generate:prologue` 或在 Electron 内点击「重新生成内容」
- [x] **SYNC-2** 流水线已实现，prologue.json 由流水线生成；仅改文案时可用 `merge-only.mjs` 免重新调 AI

### 超长上下文与向量库（远期可选）

- **VEC-1** 存档/读档：**无需**向量库，JSON 序列化即可
- **VEC-2** AI 上下文：卷轴/抉择历史很长时，优先用**摘要/截断**；若条目上千、需语义检索再注入 AI，再考虑 RAG + 向量库

---

## 七、数据库与存储（GDD 5.6）

- **DB-1** 选型：SQLite（单机）或 PostgreSQL（多端），建议 Electron 先用 SQLite
- **DB-2** 骨架数据：界/事件/节点/plot_guide（核心剧情导向）/禁忌/门禁入库或可加载
- **DB-3** 游戏状态：三相、害、物证、线索、抉择历史、卷轴 → 可序列化与持久化
- **DB-4** 存档：多档位存读，序列化 GameState 写入 DB
- **DB-5** 策划配置：提示词模板、结局表、状态公式 → 版本化管理，可入库或文件 + 索引

---

## 八、建议迭代顺序


| 轮次        | 目标              | 建议任务                                               |
| --------- | --------------- | -------------------------------------------------- |
| **第 1 轮** | 存档与重置           | SAVE-1～SAVE-4，启动时继续/新游戏选择                          |
| **第 2 轮** | 内容生成流水线         | [x] PIPE-1～PIPE-9 已完成（含 Electron 内重新生成、merge-only） |
| **第 3 轮** | AI 引擎增强 + M0 收尾 | AI-E22/E24、三相档位影响叙事（已完成）, M0-1 |
| **第 4 轮** | 数据修改 + 策划交互     | AI-E5～E8, AI-E18（plot_guide 校验）～E20, AI-E22, M1-1～M1-4, M1-7 |
| **第 5 轮** | 害与鉴照 + 上下文      | AI-E9～E11, M1-5, M1-6, M1-10, M1-12                |
| **第 6 轮** | 物证与线索           | M2-1～M2-8, AI-E15～E16（可选）                          |
| **第 7 轮** | 多界与结局           | M3-1～M3-7                                          |
| **第 8 轮** | 数据库与存读档         | DB-1～DB-5, M4-1                                    |
| **第 9 轮** | 发布候选            | M4-2～M4-6                                          |


---

## 九、快速参考

- **aiEngine 结构**：`game/src/game/aiEngine/` — chat.ts、dataAcquisition.ts（含 statLabels）、prompts/（narrative、yishi 均含禁止浅白/抽象/比喻，叙事为游戏服务、具体情节点与衔接；三相档位影响、coreFacts/标签）
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


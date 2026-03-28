# AI 流水线与存储规范

> 策划仅提供核心元素与大致走向；细纲、节点、游玩内容、具体文本由三级 AI 流水线生成。**所有生成结果需持久化存储，避免重复生成**。

---

## 一、流水线概览

```
策划输入（核心元素 + 大致走向）
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI-1 细纲生成器                                                    │
│ 输入：总设定、该AI功能设定、大纲（策划提供）                               │
│ 输出：章节细纲                                                       │
│ 存储：generated/chapters/{chapter_id}/outline.json               │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI-2 节点与游玩内容生成器                                              │
│ 输入：该AI功能设定、细纲                                                │
│ 输出：节点列表、选项骨架、state/conclusion_label 等游玩结构                  │
│ 存储：generated/chapters/{chapter_id}/nodes.json                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AI-3 叙事文本生成器                                                   │
│ 输入：该AI功能设定、游玩内容细节（节点/选项）                                │
│ 输出：各节点的 description、各选项的 text 等具体文案                        │
│ 存储：generated/chapters/{chapter_id}/texts.json                 │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
合并：nodes + texts → prologue.json / skeleton.json（供游戏加载）
```

---

## 二、各阶段职责与 I/O

### 2.1 AI-1：细纲生成器

| 项目 | 内容 |
|------|------|
| **输入** | `总设定`（GDD 核心设定）、`该AI功能设定`（细纲生成器 prompt）、`大纲`（策划提供的核心元素+大致走向） |
| **输出** | `章节细纲`：场景拆解、关键情节点、分支走向、结案类型 |
| **存储** | `generated/chapters/{chapter_id}/outline.json` |
| **校验** | 若文件存在且 hash/版本与输入一致，则**不重新生成**，直接读取 |

### 2.2 AI-2：节点与游玩内容生成器

| 项目 | 内容 |
|------|------|
| **输入** | `该AI功能设定`、`细纲`（outline.json） |
| **输出** | 节点列表（node_id、plot_guide、taboo、choices 骨架：next、state、conclusion_label），**不含** description、choice.text 等具体文案 |
| **存储** | `generated/chapters/{chapter_id}/nodes.json` |
| **校验** | 若文件存在且 outline 未变，则**不重新生成** |

### 2.3 AI-3：叙事文本生成器

| 项目 | 内容 |
|------|------|
| **输入** | `该AI功能设定`、`游玩内容`（nodes.json：节点与选项的结构） |
| **输出** | 每个节点的 `description`、每个选项的 `text` 等具体文案 |
| **存储** | `generated/chapters/{chapter_id}/texts.json` |
| **校验** | 若文件存在且 nodes 未变，则**不重新生成** |

---

## 三、策划内容文件格式

| 类型 | 格式 | 说明 |
|------|------|------|
| **策划输入**（总设定、序章大纲、AI 功能设定） | **.md** | 人工编写，供 AI 直接读取原文作为 prompt；易版本管理、易编辑 |
| **AI 输出**（细纲、节点、文本） | **.json** | 结构化，便于程序合并、校验、加载 |
| **游戏加载**（prologue.json、skeleton.json） | **.json** | 运行时加载，需稳定 schema |

**结论**：策划侧用 **Markdown**；AI 流水线读取 .md 作为输入，输出 **JSON**。

---

## 四、存储结构与去重策略

### 4.1 目录结构

```
game/
├── design/
│   ├── 总设定.md           # GDD 核心摘要，供 AI-1 使用
│   ├── AI功能设定/         # 各 AI 的 system prompt / 功能说明
│   │   ├── ai1_outline.md
│   │   ├── ai2_nodes.md
│   │   └── ai3_texts.md
│   ├── 序章策划案.md        # 策划侧定位与说明
│   └── 序章大纲.md          # 核心元素 + 大致走向（AI-1 输入）
│
└── generated/              # AI 生成结果，gitignore 或纳入版本
    └── chapters/
        └── prologue/
            ├── input_hash.json   # 输入 hash，用于判断是否需要重新生成
            ├── outline.json      # AI-1 输出
            ├── nodes.json        # AI-2 输出
            ├── texts.json        # AI-3 输出
            └── merged.json       # 合并后的 realm，可复制到 public/data/prologue.json
```

### 4.2 去重逻辑

- **input_hash.json**：记录 `{ outline_input_hash?, nodes_input_hash?, texts_input_hash? }`
- 生成前：计算当前输入的 hash，与存储的 hash 对比
- 若相同：跳过该阶段，直接读取已有输出
- 若不同或文件不存在：调用 AI 生成，写入结果并更新 hash

---

## 五、数据格式约定

### 5.1 outline.json（AI-1 输出）

```json
{
  "chapter_id": "prologue",
  "scenes": [
    { "id": "scene_1", "summary": "苏醒于驿亭旁", "key_elements": ["驿亭", "书箱", "墨迹"] },
    { "id": "scene_2", "summary": "枯井畔抉择", "key_elements": ["枯井", "井底异响", "影子"] }
  ],
  "branches": [
    { "from": "scene_1", "to": "scene_2", "condition": "靠近" },
    { "from": "scene_1", "to": "结案", "condition": "离开" }
  ],
  "conclusion_types": ["枯井一瞥", "空驿无记"]
}
```

### 5.2 nodes.json（AI-2 输出）

- 结构与现有 `Node`、`Choice` 一致
- 含 `node_id`、`plot_guide`、`taboo`、`choices`（含 `next`、`state`、`conclusion_label`）
- **不含** `description`、`choice.text`（由 AI-3 填充）

### 5.3 texts.json（AI-3 输出）

```json
{
  "descriptions": { "Prologue_01": "你自昏睡中醒来...", "Prologue_02": "..." },
  "choice_texts": { "Prologue_01_0": "靠近枯井，一探究竟。", "Prologue_01_1": "..." }
}
```

### 5.4 合并

- 将 `nodes.json` 与 `texts.json` 合并，得到完整 realm
- 可写入 `public/data/prologue.json` 供游戏加载

---

## 六、与现有系统关系

- 游戏运行时由 `public/data/manifest.json`（若存在）的 `chapters` 决定加载哪些 JSON，常见为 `prologue` + `skeleton` 等多 realm
- AI 流水线为**离线/编辑时**流程：策划修改大纲 → 触发流水线 → 生成/更新 `prologue.json`
- 流水线实现可单独成脚本或 CLI，与游戏主流程解耦

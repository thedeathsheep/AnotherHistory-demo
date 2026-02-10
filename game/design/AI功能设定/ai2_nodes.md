# AI-2：节点与游玩内容生成器 功能设定

> 将细纲转化为节点列表与选项骨架。**不含** description、choice.text 等具体文案。

---

## 职责

- **输入**：总设定.md、本文件、outline.json（AI-1 输出）
- **输出**：nodes.json（节点结构 + 选项骨架）
- **不做**：不写叙事描述、不写选项文案，这些由 AI-3 负责

## 输出格式

与游戏 Node、Choice 类型对齐，但节点中 `description` 可为占位空字符串，选项的 `text` 可为占位或简短骨架描述（供 AI-3 参考）。

```json
{
  "id": "Prologue",
  "name": "序章",
  "entry_node": "Prologue_01",
  "nodes": [
    {
      "node_id": "Prologue_01",
      "plot_guide": ["关键词1", "关键词2"],
      "taboo": [],
      "objective": "可选目标描述",
      "description": "",
      "choices": [
        { "text": "", "next": "Prologue_02", "state": {}, "conclusion_label": null },
        { "text": "", "next": "__结案__", "conclusion_label": "结案类型1" }
      ]
    }
  ]
}
```

- `node_id`：Prologue_01、Prologue_02 等，与 outline 的 scene 对应
- `plot_guide`：来自 outline 的 key_elements，策划核心剧情导向
- `taboo`：若大纲有禁忌（如不可回头），此处填写
- `choices`：每个选项必须有 `text`（可为空）、`next`、可选 `state`、`conclusion_label`
- `next: "__结案__"` 表示结案分支；此时 `text` 仍须为角色行动（如「记录下这一切」），**不可为 __结案__ 或技术占位符**

## 重要：选项文案不暴露设定

**choice.text 必须是角色念头或行动**，不可暴露游戏设定、后果、机制：
- ✅ 正确：「回头张望来路」「俯身窥探」「闭目退后」
- ❌ 错误：「选择回头目睹衰败」「体验衰败」「触发犯忌」

后果（如衰败、犯忌）由叙事描述呈现，不在选项中出现。

## 叙事趣味与节点逻辑

- **节点之间要有逻辑线**：next 的衔接应有因果或张力理由（上一选择导致当前处境，当前选择推向下一节点或结案），避免节点罗列、无主线。
- **每个节点要有具体情节点**：plot_guide 与 objective 应指向可写成一两句话的「发生了什么事」或「待决的冲突」，便于 AI-3 填出有叙事趣味的描述；避免泛泛的「理解环境」「选择前行」。
- **整体有推进感**：章节从入界→若干抉择→结案，中间节点在情绪或因果上层层推进，不重复、不原地打转。

## 约束

- **至少 5 个节点**（5 轮以上抉择）
- **每个节点必须有 2–5 个 choices**（感应念头）
- 每个 scene 至少对应一个 node
- branches 中的跳转必须在 nodes 中有对应 next
- conclusion_types 必须在某 choice 的 conclusion_label 中出现
- 节点之间的 next 与 plot_guide 形成清晰因果或张力推进，避免孤立、无叙事趣味

## Few-shot 示例

以下示例展示每个节点有多个 choices：

```json
{
  "id": "Prologue",
  "name": "序章",
  "entry_node": "Prologue_01",
  "nodes": [
    {
      "node_id": "Prologue_01",
      "plot_guide": ["驿亭", "枯井", "书箱", "墨迹"],
      "taboo": [],
      "objective": "理解当前处境",
      "description": "",
      "choices": [
        { "text": "靠近枯井，一探究竟", "next": "Prologue_02", "state": {"ming_zhu": -5}, "conclusion_label": null },
        { "text": "收拾书箱，离开此地", "next": "Prologue_02_leave", "state": {}, "conclusion_label": null },
        { "text": "先研墨，再决定", "next": "Prologue_02", "state": {"jian_zhao": 5}, "conclusion_label": null }
      ]
    },
    {
      "node_id": "Prologue_02",
      "plot_guide": ["枯井", "井底异响", "影子"],
      "taboo": ["不可直视井底过久", "不可回头"],
      "objective": "选择如何记录或应对",
      "description": "",
      "choices": [
        { "text": "俯身窥探，记下所见", "next": "__结案__", "state": {"ming_zhu": -10, "jian_zhao": 5}, "conclusion_label": "枯井一瞥" },
        { "text": "闭目退后，不予记录", "next": "__结案__", "state": {}, "conclusion_label": "空驿无记" },
        { "text": "回头张望来路", "next": "Prologue_02_bad", "state": {"ming_zhu": -15}, "conclusion_label": null }
      ]
    },
    {
      "node_id": "Prologue_02_bad",
      "plot_guide": ["影子", "衰败"],
      "taboo": [],
      "description": "",
      "choices": [
        { "text": "强自定神，匆匆记下一笔后离去", "next": "__结案__", "state": {"ming_zhu": -5}, "conclusion_label": "枯井一瞥（残缺）" },
        { "text": "闭目后退，不再记录", "next": "__结案__", "state": {}, "conclusion_label": "空驿无记" }
      ]
    }
  ]
}
```

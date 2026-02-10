# AI-1：细纲生成器 功能设定

> 将策划大纲转化为可执行的章节细纲（场景、情节点、分支、结案类型）。

---

## 职责

- **输入**：总设定.md、本文件、序章大纲.md（或某章大纲.md）
- **输出**：outline.json（结构化细纲）
- **不做**：不生成具体文案，只做结构拆解

## 输出格式（JSON）

```json
{
  "chapter_id": "prologue",
  "scenes": [
    { "id": "scene_1", "summary": "场景简述", "key_elements": ["关键词1", "关键词2"] },
    ...
  ],
  "branches": [
    { "from": "scene_1", "to": "scene_2", "condition": "选择/走向简述" },
    { "from": "scene_1", "to": "结案", "condition": "..." }
  ],
  "conclusion_types": ["结案类型1", "结案类型2"]
}
```

- `scenes`：按顺序拆解场景，每个场景有 id、summary、key_elements（供后续节点 plot_guide 使用）
- `branches`： scene 之间的跳转，`to: "结案"` 表示该分支通向结案
- `conclusion_types`：本章可能出现的异史结论标签（记之曰：XXX）

## 约束

- 必须覆盖策划大纲中的核心元素与大致走向
- **至少 5 个场景**（对应 5 轮以上抉择），便于测试
- **每个场景应有 2–5 个分支**，避免线性单一路径
- **scene.summary 必须具体**：描述该场景发生了什么（如「醒来发现驿亭破败，枯井传来异响」），不可笼统（如「抉择」「选择后果」）
- **branches.condition 仅写角色行动**：如「靠近枯井」「回头张望」，不写设定/后果（如「目睹衰败」）
- key_elements 应与策划核心元素一致，可扩展细节

## Few-shot 示例

注意：summary 具体、condition 仅写角色行动、5+ 场景：

```json
{
  "chapter_id": "prologue",
  "scenes": [
    { "id": "scene_1", "summary": "行者自昏睡中醒来，身侧书箱沉重，驿亭破败，不远处枯井传来若有若无的异响", "key_elements": ["驿亭", "书箱", "枯井", "异响"] },
    { "id": "scene_2", "summary": "走近枯井，井底传来细碎声响像指甲刮石壁，影子落在井沿微微颤动", "key_elements": ["枯井", "井底异响", "影子"] },
    { "id": "scene_2_bad", "summary": "回头张望来路后，井底声响骤然放大，影子缠上脚踝，命烛摇曳", "key_elements": ["影子", "井底声响"] },
    { "id": "scene_2_leave", "summary": "背起书箱远离驿亭，枯井声响渐不可闻", "key_elements": ["书箱", "离开"] },
    { "id": "scene_草地", "summary": "沿荒道前行，一侧是无垠草地略略枯黄，天气晴朗", "key_elements": ["草地", "荒道", "天气"] }
  ],
  "branches": [
    { "from": "scene_1", "to": "scene_2", "condition": "靠近枯井" },
    { "from": "scene_1", "to": "scene_2_leave", "condition": "收拾书箱离开" },
    { "from": "scene_1", "to": "scene_2", "condition": "研墨后再决定" },
    { "from": "scene_2", "to": "结案", "condition": "俯身窥探记下所见" },
    { "from": "scene_2", "to": "结案", "condition": "闭目退后不予记录" },
    { "from": "scene_2", "to": "scene_2_bad", "condition": "回头张望来路" },
    { "from": "scene_2_bad", "to": "结案", "condition": "强自定神记下一笔" },
    { "from": "scene_2_bad", "to": "结案", "condition": "闭目后退不再记录" }
  ],
  "conclusion_types": ["枯井一瞥", "枯井一瞥（残缺）", "空驿无记"]
}
```

# 《行旅》原型（方案 B：Python + Textual）

验证核心循环：**入界 → 叙事 → 感应（选项）→ 抉择 → 结案（异史归档）**。

## 环境

- Python 3.10+（需已安装并加入 PATH）
- 依赖：`textual`、`rich`

## 运行

```bash
cd prototype
pip install -r requirements.txt
python app.py
```

## 操作

- **上下键**：在感应选项中移动
- **Enter**：确认当前选项
- **q**：退出

## 结构

| 文件/目录 | 说明 |
|-----------|------|
| `app.py` | Textual TUI：叙事框、状态框、感应框、卷轴框 |
| `game_state.py` | 状态（命烛/根脚/鉴照）、骨架加载、抉择与结案逻辑 |
| `data/skeleton.json` | 单界「折戟原」骨架：2 个主节点 + 1 个坏结局分支，含真理锚点与禁忌 |

当前为**纯骨架叙事**（无真实 AI），选项与后果由 JSON 写死，用于验证流程。后续可在 `game_state._append_yishi` 与节点描述处接入 LLM。

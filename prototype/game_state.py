# game_state.py - State + skeleton loader for prototype
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

# Three core stats (0-100): 命烛 根脚 鉴照
MING_ZHU = "ming_zhu"
GEN_JIAO = "gen_jiao"
JIAN_ZHAO = "jian_zhao"

DEFAULT_STATS = {MING_ZHU: 100, GEN_JIAO: 100, JIAN_ZHAO: 100}


def _clamp_stats(stats: dict[str, int]) -> None:
    for k in (MING_ZHU, GEN_JIAO, JIAN_ZHAO):
        if k in stats:
            stats[k] = max(0, min(100, stats[k]))


def load_skeleton(data_dir: Path) -> dict[str, Any]:
    path = data_dir / "skeleton.json"
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def find_node(skeleton: dict, node_id: str) -> dict[str, Any] | None:
    for realm in skeleton.get("realms", []):
        for node in realm.get("nodes", []):
            if node.get("node_id") == node_id:
                return node
    return None


class GameState:
    def __init__(self, data_dir: Path | None = None):
        self.data_dir = data_dir or (Path(__file__).parent / "data")
        self.skeleton = load_skeleton(self.data_dir)
        self.stats = dict(DEFAULT_STATS)
        self.current_node_id: str | None = None
        self.realm_id: str | None = None
        self.choice_history: list[dict] = []
        self.yishi_entries: list[str] = []

    def start_realm(self, realm_id: str | None = None) -> bool:
        realms = self.skeleton.get("realms", [])
        realm = realms[0] if not realm_id else next((r for r in realms if r.get("id") == realm_id), None)
        if not realm:
            return False
        self.realm_id = realm["id"]
        entry = realm.get("entry_node")
        if not entry:
            return False
        self.current_node_id = entry
        self.stats = dict(DEFAULT_STATS)
        self.choice_history = []
        return True

    def get_current_node(self) -> dict[str, Any] | None:
        if not self.current_node_id:
            return None
        return find_node(self.skeleton, self.current_node_id)

    def get_realm_name(self) -> str:
        if not self.realm_id:
            return ""
        for r in self.skeleton.get("realms", []):
            if r.get("id") == self.realm_id:
                return r.get("name", self.realm_id)
        return self.realm_id or ""

    def apply_choice(self, choice: dict[str, Any]) -> tuple[str | None, str | None]:
        """
        Apply choice: update stats, advance node. Returns (next_node_id, conclusion_label or None).
        """
        next_id = choice.get("next")
        state_delta = choice.get("state") or {}
        for k, v in state_delta.items():
            if k in self.stats:
                self.stats[k] = self.stats[k] + v
        _clamp_stats(self.stats)
        self.choice_history.append(choice)

        conclusion = choice.get("conclusion_label")
        if next_id == "__结案__" and conclusion:
            self.current_node_id = None
            return None, conclusion
        if next_id and next_id != "__结案__":
            self.current_node_id = next_id
        return self.current_node_id, conclusion

    def add_yishi_entry(self, text: str) -> None:
        """Append an 异史 entry (from AI or fallback). Call after 结案."""
        self.yishi_entries.append(text)

    def get_choice_summary_for_yishi(self) -> str:
        """Short summary of choice history for AI 异史 generation."""
        lines = []
        for c in self.choice_history:
            lines.append(c.get("text", ""))
        return "\n".join(lines) if lines else "（无）"

    def is_game_over(self) -> bool:
        return self.stats[MING_ZHU] <= 0 or self.stats[GEN_JIAO] <= 0 or self.stats[JIAN_ZHAO] <= 0

    def stat_label(self, key: str) -> str:
        v = self.stats.get(key, 0)
        if key == MING_ZHU:
            return "旺盛" if v > 80 else ("摇曳" if v > 30 else "熄灭")
        if key == GEN_JIAO:
            return "扎实" if v > 60 else ("虚浮" if v > 40 else "化外")
        if key == JIAN_ZHAO:
            return "清彻" if v > 80 else ("混浊" if v > 40 else "障目")
        return str(v)

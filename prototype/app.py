# app.py - Textual TUI prototype: 入界 → 叙事 → 感应 → 抉择 → 结案
# AI: 同步请求 + call_later 先刷新「正在…」再阻塞调用，避免 Worker 回调未绑定
from __future__ import annotations

from pathlib import Path
from typing import Any

from textual.app import App, ComposeResult
from textual.containers import ScrollableContainer
from textual.widgets import Footer, Header, Static, OptionList
from textual.widgets.option_list import Option
from textual.binding import Binding

from game_state import GameState, MING_ZHU, GEN_JIAO, JIAN_ZHAO
from ai_bridge import AIBridge


class NarrativeBox(Static):
    """叙事框：显示当前节点描述"""


class StatusBox(Static):
    """状态框：命烛 / 根脚 / 鉴照"""


class ChoiceList(OptionList):
    """感应框：1–5 个念头选项"""


class YishiBox(ScrollableContainer):
    """卷轴框：已归档异史"""


class ProtoApp(App[None]):
    CSS = """
    Screen {
        layout: vertical;
    }
    #narrative {
        height: 40%;
        border: solid #666;
        padding: 1 2;
        margin: 1;
    }
    #status {
        height: 3;
        border: solid #666;
        padding: 0 2;
        margin: 1;
    }
    #choices {
        height: 30%;
        border: solid #666;
        padding: 1 2;
        margin: 1;
    }
    #yishi {
        height: 20%;
        border: solid #888;
        padding: 1 2;
        margin: 1;
    }
    OptionList:focus .option-list--option-highlighted {
        background: #444;
    }
    """

    BINDINGS = [
        Binding("q", "quit", "退出"),
    ]

    def __init__(self) -> None:
        super().__init__()
        self.game = GameState(Path(__file__).parent / "data")
        self.ai = AIBridge()
        self._cached_ai_narrative: dict[str, str] = {}  # node_id -> description (AI or skeleton fallback)
        self._cached_ai_is_real: dict[str, bool] = {}  # node_id -> True if from API, False if fallback

    def on_mount(self) -> None:
        self.game.start_realm()
        self._refresh_screen()

    def _refresh_screen(self) -> None:
        narrative = self.query_one("#narrative", NarrativeBox)
        status = self.query_one("#status", StatusBox)
        choices = self.query_one("#choices", ChoiceList)
        yishi = self.query_one("#yishi", ScrollableContainer)

        # Status: 命烛 / 根脚 / 鉴照
        s = self.game.stats
        status.update(
            f"命烛: {s[MING_ZHU]}% [{self.game.stat_label(MING_ZHU)}]  "
            f"根脚: {s[GEN_JIAO]}% [{self.game.stat_label(GEN_JIAO)}]  "
            f"鉴照: {s[JIAN_ZHAO]}% [{self.game.stat_label(JIAN_ZHAO)}]"
        )

        # 卷轴
        if self.game.yishi_entries:
            yishi.remove_children()
            for i, entry in enumerate(self.game.yishi_entries, 1):
                yishi.mount(Static(f"[{i}] {entry}", classes="yishi-entry"))
        else:
            yishi.remove_children()
            yishi.mount(Static("《异史》卷轴（尚未记录）"))

        node = self.game.get_current_node()
        if self.game.is_game_over():
            narrative.update("【命烛熄灭 / 根脚化外 / 鉴照障目】异史君已无法继续。游戏结束。")
            choices.clear_options()
            choices.add_option(Option("重新开始", id="restart"))
            return
        if node is None and self.game.yishi_entries:
            narrative.update(
                "【结案】本段行旅已归档。异史已写入卷轴。\n\n"
                "（原型验证：核心循环 入界→感应→抉择→结案 已跑通。）"
            )
            choices.clear_options()
            choices.add_option(Option("再玩一次", id="restart"))
            return
        if node is None:
            narrative.update("（无当前节点）")
            choices.clear_options()
            return

        node_id = node.get("node_id", "")
        realm_name = self.game.get_realm_name()
        # Use AI narrative if available and we have skeleton for this node
        use_ai = self.ai.available and node.get("truth_anchors")
        if use_ai and node_id in self._cached_ai_narrative:
            desc = self._cached_ai_narrative[node_id]
            # Mark so user sees this paragraph is AIGC (skeleton fallback has no prefix)
            is_ai = getattr(self, "_cached_ai_is_real", {}).get(node_id, True)
            prefix = "【AI 生成】\n\n" if is_ai else ""
            narrative.update(f"【境遇：{realm_name}】\n\n{prefix}{desc}")
        elif use_ai:
            narrative.update(f"【境遇：{realm_name}】\n\n正在感应…")
            state_filter = {k: self.game.stats.get(k, 0) for k in ("ming_zhu", "gen_jiao", "jian_zhao")}
            self.call_later(self._blocking_fetch_node_narrative, node, realm_name, state_filter)
            choices.clear_options()
            for i, c in enumerate(node.get("choices", [])):
                choices.add_option(Option(c.get("text", ""), id=str(i)))
            return
        else:
            narrative.update(f"【境遇：{realm_name}】\n\n{node.get('description', '')}")

        choices.clear_options()
        for i, c in enumerate(node.get("choices", [])):
            choices.add_option(Option(c.get("text", ""), id=str(i)))

    def _blocking_fetch_node_narrative(
        self, node: dict[str, Any], realm_name: str, state_filter: dict[str, int]
    ) -> None:
        """Run after paint: blocking API call, then cache and refresh. On API failure use skeleton."""
        nid = node.get("node_id")
        if not nid:
            self._refresh_screen()
            return
        desc = self.ai.generate_node_narrative(node, realm_name, state_filter)
        if desc:
            self._cached_ai_narrative[nid] = desc.strip()
            self._cached_ai_is_real[nid] = True
        else:
            self._cached_ai_narrative[nid] = node.get("description", "")
            self._cached_ai_is_real[nid] = False
        self._refresh_screen()

    def _blocking_generate_yishi(self, conclusion_label: str) -> None:
        """Run after paint: blocking API call, add entry, refresh. Tag entry when from AI."""
        text = self.ai.generate_yishi(
            self.game.get_realm_name(),
            self.game.get_choice_summary_for_yishi(),
            conclusion_label,
        )
        fallback = f"乙巳年，{self.game.get_realm_name()}。有行者入，记之曰：{conclusion_label}。"
        final = (text and text.strip()) or fallback
        if text and text.strip():
            final = "【AI 凝练】 " + final
        self.game.add_yishi_entry(final)
        self._refresh_screen()

    def compose(self) -> ComposeResult:
        yield Header(show_clock=False)
        yield NarrativeBox("", id="narrative")
        yield StatusBox("", id="status")
        yield ChoiceList(id="choices")
        yield ScrollableContainer(Static("《异史》卷轴（尚未记录）"), id="yishi")
        yield Footer()

    def on_option_list_option_selected(self, event: OptionList.OptionSelected) -> None:
        opt = event.option_id
        if opt == "restart":
            self.game.start_realm()
            self._refresh_screen()
            return
        node = self.game.get_current_node()
        if not node:
            return
        try:
            idx = int(opt)
        except (TypeError, ValueError):
            return
        choices = node.get("choices", [])
        if idx < 0 or idx >= len(choices):
            return
        choice = choices[idx]
        next_id, conclusion = self.game.apply_choice(choice)
        if conclusion:
            self.query_one("#narrative", NarrativeBox).update("正在凝练异史…")
            self.call_later(self._blocking_generate_yishi, conclusion)
            return
        self._refresh_screen()


def main() -> None:
    app = ProtoApp()
    app.run()


if __name__ == "__main__":
    main()

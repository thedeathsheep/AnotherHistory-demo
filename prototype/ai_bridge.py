# ai_bridge.py - AIHubMix API: narrative generation + 异史凝练
from __future__ import annotations

import time
from typing import Any

import requests

from config import load_aihubmix_api_key

API_BASE = "https://aihubmix.com/v1"
DEFAULT_MODEL = "gpt-4o-mini"

# (connect_timeout, read_timeout): connect 15s, read 90s (LLM can be slow)
REQUEST_TIMEOUT = (15, 90)
MAX_RETRIES = 2


def _chat(messages: list[dict], api_key: str, max_tokens: int = 1024) -> str | None:
    last_err: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            r = requests.post(
                f"{API_BASE}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": DEFAULT_MODEL,
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": max_tokens,
                },
                timeout=REQUEST_TIMEOUT,
            )
            r.raise_for_status()
            data = r.json()
            return data.get("choices", [{}])[0].get("message", {}).get("content")
        except (requests.exceptions.Timeout, requests.exceptions.ConnectionError) as e:
            last_err = e
            if attempt < MAX_RETRIES:
                time.sleep(1.0 * (attempt + 1))
        except Exception as e:
            last_err = e
            break
    return None


def generate_node_narrative(
    node: dict[str, Any],
    realm_name: str,
    state_filter: dict[str, int],
    api_key: str | None,
) -> str | None:
    """
    Use skeleton (truth_anchors, taboo, objective) to ask AI for a short narrative
    that must include the anchors and respect the taboo. Returns description or None.
    """
    if not api_key:
        return None
    anchors = node.get("truth_anchors") or []
    taboo = node.get("taboo") or []
    objective = node.get("objective") or ""

    user = (
        f"你扮演《行旅》的叙事引擎。根据以下骨架写一段2–4句的叙事描述，用于当前节点。\n\n"
        f"【境遇】{realm_name}\n"
        f"【真理锚点】必须自然融入描述中：{anchors}\n"
        f"【禁忌】描述中不可让角色触犯：{taboo}\n"
        f"【目标】{objective}\n"
        f"【当前状态】命烛/根脚/鉴照约：{state_filter}\n\n"
        f"要求：文风冷峻、带前科学时代荒野感；只输出这段描述，不要选项或标题。"
    )
    content = _chat(
        [
            {"role": "system", "content": "你只输出游戏内的叙事文本，不要解释或加标题。用中文。"},
            {"role": "user", "content": user},
        ],
        api_key,
        max_tokens=400,
    )
    return content.strip() if content else None


def generate_yishi(
    realm_name: str,
    choice_summary: str,
    conclusion_label: str,
    api_key: str | None,
) -> str | None:
    """
    Condense the journey into 异史: third-person, cold archival tone, under 100 chars preferred.
    """
    if not api_key:
        return None
    user = (
        f"将以下行旅记录凝练为一段「异史」：第三人称、冷峻古籍风、不超过100字。\n\n"
        f"【地域】{realm_name}\n"
        f"【行旅概要】\n{choice_summary}\n\n"
        f"结尾以「记之曰：{conclusion_label}。」收束。只输出异史正文，不要解释。"
    )
    content = _chat(
        [
            {"role": "system", "content": "你只输出异史正文，古文风格，不要任何解释或标题。用中文。"},
            {"role": "user", "content": user},
        ],
        api_key,
        max_tokens=256,
    )
    return content.strip() if content else None


class AIBridge:
    """Optional AI backend; None if no key or disabled."""

    def __init__(self) -> None:
        self._key = load_aihubmix_api_key()

    @property
    def available(self) -> bool:
        return bool(self._key)

    def generate_node_narrative(
        self, node: dict[str, Any], realm_name: str, state_filter: dict[str, int]
    ) -> str | None:
        return generate_node_narrative(node, realm_name, state_filter, self._key)

    def generate_yishi(
        self, realm_name: str, choice_summary: str, conclusion_label: str
    ) -> str | None:
        return generate_yishi(realm_name, choice_summary, conclusion_label, self._key)

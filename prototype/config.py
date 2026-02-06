# config.py - Load API key from project key file (do not commit key to repo)
from __future__ import annotations

import re
from pathlib import Path

# Key file at project root (parent of prototype/)
KEY_FILE = Path(__file__).resolve().parent.parent / "api_key.txt"


def load_aihubmix_api_key() -> str | None:
    """Load AIHUBMIX API key from api_key.txt. Looks for api_key=\"sk-...\" or sk-..."""
    if not KEY_FILE.exists():
        return None
    try:
        text = KEY_FILE.read_text(encoding="utf-8")
    except OSError:
        return None
    # Match api_key="sk-..." or api_key='sk-...'
    m = re.search(r'api_key\s*=\s*["\'](sk-[a-zA-Z0-9]+)["\']', text)
    if m:
        return m.group(1)
    # Fallback: first line that looks like sk-...
    for line in text.splitlines():
        part = line.strip()
        if part.startswith("sk-"):
            return part.split()[0] if part else part
    return None

# -*- coding: utf-8 -*-
"""Client LLM tối thiểu: Chat Completions kiểu OpenAI, chế độ JSON — doc/design-cham-form-llm-v1.md §4.6.

Không bắt lỗi ở đây: lỗi mạng, HTTP (401 key sai…), timeout nổi lên thành exception để vòng
poll đưa job về hàng đợi. Nội dung trả về do judge.py kiểm.
"""
from __future__ import annotations

import httpx


class LlmClient:
    def __init__(self, api_key: str | None, base_url: str, model: str, timeout_s: float = 30.0):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_s = timeout_s

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def ask_json(self, messages: list[dict[str, str]]) -> str:
        response = httpx.post(
            f"{self._base_url}/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json={
                "model": self._model,
                # 0: cùng một bộ số chấm hai lần nên ra cùng kết quả. Model reasoning (họ o,
                # gpt-5) có thể không nhận tham số này — đổi model thì thử lại một lần (spec §10).
                "temperature": 0,
                "response_format": {"type": "json_object"},
                "messages": messages,
            },
            timeout=self._timeout_s,
        )
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"]

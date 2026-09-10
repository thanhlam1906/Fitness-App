# -*- coding: utf-8 -*-
"""Lớp LLM diễn giải — tuỳ chọn, và bị chặn bằng code chứ không bằng lời dặn.

Nguyên tắc N3: KHÔNG con số nào đi ra từ LLM. LLM không nhìn video, chỉ nhận
bảng số rule engine đã đo, và không được đổi kết luận đạt/không đạt — nó chỉ
viết lại lời góp ý cho dễ nghe hơn.

D3 của concept-analyzer-v1.md §0.1: demo DẶN mô hình đừng bịa số nhưng không
CHẶN. Dặn không phải là chặn. NumberGuard dưới đây là hàng rào: mọi số trong
câu trả lời phải xuất hiện trong context đã gửi đi, không thì bỏ CẢ câu và
dùng `cue_text_vi` của rule.

Thiếu DEEPSEEK_API_KEY thì lớp này tắt hẳn và hệ thống chạy bình thường.
"""
from __future__ import annotations

import json
import re
from typing import Any

import httpx

_SYSTEM_PROMPT = (
    "Bạn viết lại lời góp ý tập luyện cho người mới, bằng tiếng Việt. "
    "Bạn KHÔNG nhìn thấy video. Bạn chỉ nhận kết quả một rule engine đã chấm. "
    "Quy tắc bắt buộc: giữ nguyên kết luận đạt/không đạt; không thêm bất kỳ con số nào "
    "ngoài các số có trong dữ liệu; nêu đúng MỘT hành động cần sửa; tối đa 2 câu; "
    "không chào hỏi, không xưng danh."
)

_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")


def numbers_are_grounded(answer: str, context: str) -> bool:
    """Thô, và cố ý thô: không tin thì bỏ cả câu, không sửa từng số.

    Sửa từng số là bắt đầu tin một phần vào output của LLM.

    ponytail: so khớp bằng regex sẽ bắt nhầm khi LLM viết "một" thay vì "1"
    hoặc làm tròn 1.30 thành 1.3. Trần chấp nhận được — bắt nhầm thì dùng text
    của rule, an toàn hơn bỏ sót. Nếu tỉ lệ bỏ nhầm cao thì chuẩn hoá số trước
    khi so, đừng nới lỏng điều kiện.
    """
    return set(_NUMBER.findall(answer)) <= set(_NUMBER.findall(context))


class Advisor:
    def __init__(self, api_key: str | None, base_url: str, model: str, timeout_s: float = 20.0):
        self._api_key = api_key
        self._base_url = base_url.rstrip("/")
        self._model = model
        self._timeout_s = timeout_s

    @property
    def enabled(self) -> bool:
        return bool(self._api_key)

    def rewrite_primary_cue(self, exercise_name: str, results: list[dict[str, Any]]) -> None:
        """Viết lại đúng dòng is_primary, tại chỗ. Mọi lỗi đều im lặng rơi về text của rule."""
        if not self.enabled:
            return
        primary = next((r for r in results if r["is_primary"]), None)
        if primary is None:
            return

        context = json.dumps(
            {"exercise": exercise_name,
             "checks": [{k: r[k] for k in ("code", "verdict", "measured", "cue_text_vi")} for r in results]},
            ensure_ascii=False)
        answer = self._ask(context)
        if answer and numbers_are_grounded(answer, context):
            primary["cue_text_vi"] = answer

    def _ask(self, context: str) -> str | None:
        try:
            response = httpx.post(
                f"{self._base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self._api_key}"},
                json={
                    "model": self._model,
                    "temperature": 0.2,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": context},
                    ],
                },
                timeout=self._timeout_s,
            )
            response.raise_for_status()
            return response.json()["choices"][0]["message"]["content"].strip()
        except Exception:
            return None  # LLM là lớp trang trí: hỏng thì dùng text của rule, không làm hỏng job

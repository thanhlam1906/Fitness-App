# -*- coding: utf-8 -*-
"""LLM nhận diện bài và chấm, code kiểm — doc/design-cham-form-llm-v1.md §4.4–4.7.

Dặn không phải là chặn. Prompt dặn LLM chỉ dùng số trong bảng, nhưng thứ bảo đảm là các hàm kiểm
ở đây: mọi kết luận đạt/không đạt phải trỏ đúng một ô của `features`, mọi số trong lời góp ý
phải có trong input. Sai thì bỏ, không sửa: sửa là bắt đầu tin một phần output của LLM.

Không import numpy/httpx, để test chạy bằng python trần.
"""
from __future__ import annotations

import json
import re
from typing import Any

from .feature_keys import glossary, label_vi, trusted_in, unit
from .scoring import FAIL, LOW_CONFIDENCE, NOT_APPLICABLE, PASS, WARN
from .viewpoints import LABEL_VI

VERDICTS = (PASS, WARN, FAIL, LOW_CONFIDENCE, NOT_APPLICABLE)
MAX_ITEMS = 5
_NUMBER = re.compile(r"\d+(?:[.,]\d+)?")

_RECOGNIZE_SYSTEM = (
    "Bạn nhận diện bài tập từ số đo góc khớp của một set tập, do máy đo qua camera. Bạn không "
    "nhìn thấy hình. `features` có từng clip (góc quay, khớp dao động nhiều nhất `dominant`) và "
    "từng rep; `glossary` giải thích từng khoá. Chọn đúng MỘT bài trong `candidates` theo `slug`. "
    "Chuyển động không khớp bài nào thì trả \"unknown\". "
    'Chỉ trả JSON dạng {"exercise": "<slug hoặc unknown>"}.'
)

_JUDGE_SYSTEM = (
    "Bạn là huấn luyện viên chấm kỹ thuật một set tập của bài `exercise`, chỉ dựa trên bảng số đo "
    "góc khớp do máy tính (`features`). Bạn không nhìn thấy hình. Quy tắc bắt buộc:\n"
    "1. Chỉ dùng số có trong `features`. Không tự tính, không làm tròn lại, không đưa ra số mới, "
    "kể cả số mục tiêu.\n"
    "2. Mục có verdict PASS, WARN hoặc FAIL phải có ít nhất một evidence trỏ đúng một ô: clip, rep, "
    "feature và value chép nguyên từ `features`.\n"
    "3. Mỗi số chỉ tin ở góc quay ghi trong `glossary`. Mục cần một góc đã quay nhưng góc đó không "
    "có rep dùng được (reps_used = 0) thì verdict LOW_CONFIDENCE; góc đó chưa quay (không có trong "
    "`views_recorded`) thì NOT_APPLICABLE. Hai verdict này không cần evidence.\n"
    "4. Tối đa 5 mục, mỗi mục một khía cạnh kỹ thuật quan trọng của bài (gợi ý ở `mistakes_vi`) "
    "mà một khoá trong `glossary` đo trực tiếp. Khía cạnh không khoá nào đo (vd gót chân, cổ tay) "
    "thì bỏ hẳn, không mượn số của khoá khác.\n"
    "5. `name_vi` ngắn, không dấu chấm, nói điều số đo cho thấy: mục lỗi ghi lỗi (vd \"Gối chụm "
    "vào trong\"), mục đạt ghi điều làm đúng (vd \"Thân giữ thẳng\"). `cue_vi`: tiếng Việt, tối đa "
    "2 câu, nêu một hành động cụ thể.\n"
    "6. `primary` là name_vi của lỗi quan trọng nhất trong các mục FAIL hoặc WARN; không có thì null.\n"
    'Chỉ trả JSON: {"items": [{"name_vi": "...", "verdict": "PASS|WARN|FAIL|LOW_CONFIDENCE|'
    'NOT_APPLICABLE", "evidence": [{"clip": 1, "rep": 1, "feature": "...", "value": 0}], '
    '"cue_vi": "..."}], "primary": "..." hoặc null}'
)


class LlmError(Exception):
    """LLM trả thứ không dùng được. Vòng poll coi như lỗi tạm: requeue, tối đa 3 lần."""


def numbers_are_grounded(answer: str, context: str) -> bool:
    """Thô, và cố ý thô: không tin thì bỏ cả mục, không sửa từng số.

    ponytail: so khớp bằng regex sẽ bắt nhầm khi LLM viết "một" thay vì "1" hoặc làm tròn 1.30
    thành 1.3. Trần chấp nhận được — bắt nhầm thì bỏ mục, an toàn hơn bỏ sót. Tỉ lệ bỏ nhầm cao
    thì chuẩn hoá số trước khi so, đừng nới lỏng điều kiện.
    """
    return set(_NUMBER.findall(answer)) <= set(_NUMBER.findall(context))


def recognition_messages(features: dict[str, Any],
                         candidates: list[dict[str, Any]]) -> list[dict[str, str]]:
    user = json.dumps({"glossary": glossary(), "features": features, "candidates": candidates},
                      ensure_ascii=False)
    return [{"role": "system", "content": _RECOGNIZE_SYSTEM}, {"role": "user", "content": user}]


def parse_recognition(raw: str, slugs: set[str]) -> str | None:
    """Slug LLM chọn nếu có trong danh sách, không thì None (= chưa nhận ra bài)."""
    try:
        slug = json.loads(raw).get("exercise")
    except (ValueError, AttributeError) as e:
        raise LlmError(f"JSON nhận diện không hợp lệ: {raw[:200]}") from e
    return slug if slug in slugs else None


def judgment_messages(exercise: dict[str, Any], features: dict[str, Any]) -> list[dict[str, str]]:
    features = _trusted(features)
    user = json.dumps({"exercise": exercise,
                       "views_recorded": [v["view"] for v in features["views"]],
                       "glossary": glossary(), "features": features}, ensure_ascii=False)
    return [{"role": "system", "content": _JUDGE_SYSTEM}, {"role": "user", "content": user}]


def validate_judgment(raw: str, features: dict[str, Any],
                      exercise: dict[str, Any]) -> list[dict[str, Any]]:
    """Câu trả lời chấm → các dòng review_results. Không còn mục nào hợp lệ thì LlmError."""
    try:
        data = json.loads(raw)
        items = data["items"]
    except (ValueError, KeyError, TypeError) as e:
        raise LlmError(f"JSON chấm không hợp lệ: {raw[:200]}") from e
    features = _trusted(features)   # đúng bộ số LLM đã nhận ở judgment_messages
    # Số được phép xuất hiện trong lời góp ý: số đo và nội dung bài do người viết. Không gồm
    # glossary, để LLM không mượn các mốc như "180" làm số mục tiêu.
    context = json.dumps({"exercise": exercise, "features": features}, ensure_ascii=False)
    cells = _cells(features)
    rows: list[dict[str, Any]] = []
    for item in items if isinstance(items, list) else []:
        row = _row(item, cells, context)
        if row and all(r["name_vi"] != row["name_vi"] for r in rows):
            rows.append(row)
        if len(rows) == MAX_ITEMS:
            break
    # Chỉ còn LOW_CONFIDENCE/NOT_APPLICABLE thì màn kết quả sẽ báo "Kỹ thuật ổn" mà không dựa trên
    # số nào — thường là mục có lỗi vừa bị loại vì dẫn chứng sai. Coi như LLM lỗi để thử lại.
    if not any(r["verdict"] in (PASS, WARN, FAIL) for r in rows):
        raise LlmError(f"LLM không trả mục chấm nào có dẫn chứng hợp lệ: {raw[:200]}")
    _mark_primary(rows, data.get("primary"))
    return rows


def _trusted(features: dict[str, Any]) -> dict[str, Any]:
    """Bản sao chỉ còn các số tin được ở góc quay của từng clip. Dặn trong prompt không đủ: smoke
    09-28 với OpenAI thật, LLM lấy knee_in = 0 của góc ngang để cho "gối chụm" PASS, trong khi góc
    chính diện đo 0.4 ở mọi rep. Nhận diện bài vẫn nhận đủ bộ số."""
    return {**features, "views": [
        {**view, "reps": [{k: v for k, v in rep.items() if trusted_in(k, view["view"])}
                          for rep in view["reps"]]}
        for view in features["views"]]}


def _cells(features: dict[str, Any]) -> dict[tuple[int, int, str], tuple[str, float]]:
    """(clip, rep, khoá) → (góc quay, giá trị): mọi ô LLM được phép trỏ tới."""
    return {(view["clip"], rep["rep"], key): (view["view"], value)
            for view in features["views"] for rep in view["reps"]
            for key, value in rep.items() if key != "rep"}


def _row(item: Any, cells: dict, context: str) -> dict[str, Any] | None:
    if not isinstance(item, dict):
        return None
    name, verdict, cue = item.get("name_vi"), item.get("verdict"), item.get("cue_vi")
    if not (isinstance(name, str) and name.strip() and isinstance(cue, str) and cue.strip()):
        return None
    # Tên mục cũng hiện trên màn kết quả (tiêu đề lỗi chính), nên số trong tên cũng phải có thật.
    if verdict not in VERDICTS or not numbers_are_grounded(f"{name} {cue}", context):
        return None
    raw_evidence = item.get("evidence") or []
    if not isinstance(raw_evidence, list):
        return None
    evidence = [_evidence(e, cells) for e in raw_evidence]
    if None in evidence:
        return None   # một dẫn chứng sai là bỏ cả mục
    if verdict in (PASS, WARN, FAIL) and not evidence:
        return None   # kết luận đạt/không đạt phải có số
    return {"form_check_id": None, "name_vi": name.strip(), "verdict": verdict, "confidence": None,
            "measured": {"evidence": evidence}, "cue_text_vi": cue.strip(), "is_primary": False}


def _evidence(e: Any, cells: dict) -> dict[str, Any] | None:
    try:
        key = (int(e["clip"]), int(e["rep"]), str(e["feature"]))
        value = float(e["value"])
    except (KeyError, TypeError, ValueError):
        return None
    # `not <=` chứ không phải `>`: NaN so sánh gì cũng False, viết `>` thì NaN khớp mọi ô.
    if key not in cells or not abs(cells[key][1] - value) <= 1e-9:
        return None
    view, real = cells[key]
    return {"clip": key[0], "view": view, "view_vi": LABEL_VI.get(view, view), "rep": key[1],
            "feature": key[2], "label_vi": label_vi(key[2]), "value": real, "unit": unit(key[2])}


def _mark_primary(rows: list[dict[str, Any]], wanted: Any) -> None:
    """Đúng một lỗi chính (C5). LLM chọn sai hoặc không chọn thì lấy FAIL đầu tiên, rồi WARN."""
    faults = [r for r in rows if r["verdict"] in (FAIL, WARN)]
    if not faults:
        return
    chosen = (next((r for r in faults if r["name_vi"] == wanted), None)
              or next((r for r in faults if r["verdict"] == FAIL), faults[0]))
    chosen["is_primary"] = True

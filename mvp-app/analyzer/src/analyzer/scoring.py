# -*- coding: utf-8 -*-
"""`form_checks` + số đo → `review_results`.

Năm verdict, không phải hai (concept-analyzer-v1.md §6.3):
  PASS · WARN · FAIL · LOW_CONFIDENCE · NOT_APPLICABLE

LOW_CONFIDENCE ("đo được nhưng landmark không đủ tin cậy" → quay rõ hơn) và
NOT_APPLICABLE ("check này không đáng tin ở góc quay của clip" → quay thêm một
góc khác) dẫn tới HAI hành động khác nhau của người dùng. Gộp lại thành "chưa
đủ tin cậy" chung là vứt đi thông tin duy nhất giúp họ sửa.

Module này không import mediapipe/opencv — nhận số đo đã tính sẵn, nên chạy
và test được không cần video.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Sequence

from .viewpoints import LABEL_VI

PASS = "PASS"
WARN = "WARN"
FAIL = "FAIL"
LOW_CONFIDENCE = "LOW_CONFIDENCE"
NOT_APPLICABLE = "NOT_APPLICABLE"

_SEVERITY = {PASS: 0, WARN: 1, FAIL: 2}


class ThresholdShapeError(Exception):
    """Ngưỡng không theo hình dạng nào đã biết — lỗi cấu hình, phải nhìn thấy ngay."""


@dataclass(frozen=True)
class RepMeasurement:
    """Một rep: giá trị metric và độ tin cậy landmark của rep đó."""
    value: float
    confidence: float


def verdict_for_value(value: float, thresholds: dict[str, Any]) -> str:
    """Ba hình dạng ngưỡng, đủ cho cả 5 bài của TN2.

    - nhỏ hơn là tốt:  {"pass_below": 1.10, "warn_below": 1.30}
    - lớn hơn là tốt:  {"pass_above": 0.90, "warn_above": 0.75}
    - nằm trong khoảng: {"pass_between": [10, 55], "warn_between": [5, 65]}

    Ép cả ba vào cột min/max là sai ngay từ bài thứ nhất — đó là lý do
    `thresholds` là jsonb chứ không phải hai cột số (§6.1).
    """
    if "pass_below" in thresholds:
        if value <= thresholds["pass_below"]:
            return PASS
        if "warn_below" in thresholds and value <= thresholds["warn_below"]:
            return WARN
        return FAIL

    if "pass_above" in thresholds:
        if value >= thresholds["pass_above"]:
            return PASS
        if "warn_above" in thresholds and value >= thresholds["warn_above"]:
            return WARN
        return FAIL

    if "pass_between" in thresholds:
        low, high = thresholds["pass_between"]
        if low <= value <= high:
            return PASS
        warn = thresholds.get("warn_between")
        if warn and warn[0] <= value <= warn[1]:
            return WARN
        return FAIL

    raise ThresholdShapeError(f"thresholds không theo hình dạng nào đã biết: {thresholds}")


def score_check(
    check,
    viewpoint: str,
    measurements: Sequence[RepMeasurement],
) -> dict[str, Any]:
    """Chấm MỘT check trên toàn bộ rep của clip.

    Rep xấu nhất quyết định verdict: một rep FAIL là có lỗi thật cần nói.
    Ngược lại §6.5 ("một rep lệch mà các rep khác ổn thì không cảnh báo") áp
    dụng ở tầng gộp NHIỀU CLIP, không phải ở đây — nên vẫn trả kèm số rep đạt
    để người dùng thấy "2/4 rep đạt" chứ không chỉ thấy chữ FAIL.
    """
    if viewpoint not in check.valid_viewpoints:
        return _result(check, NOT_APPLICABLE, None, {"viewpoint": viewpoint},
                       _not_applicable_cue(check, viewpoint))

    usable = [m for m in measurements if m.confidence >= check.confidence_min]
    if not usable:
        best = max((m.confidence for m in measurements), default=0.0)
        return _result(check, LOW_CONFIDENCE, best, {"reps": len(measurements)},
                       "Chưa đủ tin cậy để chấm mục này. Quay lại rõ hơn, đủ sáng, "
                       "để toàn bộ cơ thể trong khung hình.")

    verdicts = [verdict_for_value(m.value, check.thresholds) for m in usable]
    worst = max(verdicts, key=lambda v: _SEVERITY[v])
    cue = {PASS: check.cue_pass_vi, WARN: check.cue_warn_vi, FAIL: check.cue_fail_vi}[worst]

    measured = {
        "metric": check.metric,
        "reps_scored": len(usable),
        "reps_passed": verdicts.count(PASS),
        "worst_value": round(_worst_value(usable, verdicts, worst), 4),
    }
    confidence = round(min(m.confidence for m in usable), 2)
    # cue_pass/cue_warn để trống ở DB thì rơi về cue_fail — cột duy nhất NOT NULL.
    return _result(check, worst, confidence, measured, cue or check.cue_fail_vi)


def pick_primary(results: list[dict[str, Any]], checks_by_id: dict[str, Any]) -> None:
    """Đánh dấu ĐÚNG MỘT dòng is_primary — "một lỗi quan trọng nhất" (C5).

    Ưu tiên FAIL trước WARN; trong cùng mức thì `priority` nhỏ hơn nói trước.
    Không có FAIL/WARN nào thì không dòng nào là primary — clip đạt hết.
    """
    for wanted in (FAIL, WARN):
        candidates = [r for r in results if r["verdict"] == wanted]
        if candidates:
            best = min(candidates, key=lambda r: checks_by_id[r["form_check_id"]].priority)
            best["is_primary"] = True
            return


def _worst_value(usable: Sequence[RepMeasurement], verdicts: list[str], worst: str) -> float:
    values = [m.value for m, v in zip(usable, verdicts) if v == worst]
    return values[0] if len(values) == 1 else max(values, key=abs)


def _not_applicable_cue(check, viewpoint: str) -> str:
    wanted = " hoặc ".join(LABEL_VI.get(v, v) for v in check.valid_viewpoints)
    return (f"Không kiểm tra được ở góc {LABEL_VI.get(viewpoint, viewpoint)}. "
            f"Quay thêm một clip ở góc {wanted} để kiểm tra mục này.")


def _result(check, verdict: str, confidence: float | None,
            measured: dict[str, Any], cue: str) -> dict[str, Any]:
    return {
        "form_check_id": check.id,
        "code": check.code,
        "verdict": verdict,
        "confidence": confidence,
        "measured": measured,
        "cue_text_vi": cue,
        "is_primary": False,
    }

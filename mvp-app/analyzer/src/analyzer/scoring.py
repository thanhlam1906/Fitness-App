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

from .feature_keys import MOMENT_SUFFIX, SIDED
from .viewpoints import LABEL_VI, SAGITTAL

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


# ── Chấm theo ngưỡng admin nhập — doc/design-cham-form-nguong-v1.md §6 ──
# Code ở trên (verdict_for_value, score_check) giữ cho analyzer-demo.

MIN_REPS = 2   # dưới mức này không kết luận: một rep lệch có thể là camera đọc sai


def gap(value: float, low: float | None, high: float | None) -> float:
    """Ra ngoài khoảng đạt bao nhiêu độ; 0 khi nằm trong."""
    if low is not None and value < low:
        return low - value
    if high is not None and value > high:
        return value - high
    return 0.0


def range_verdict(value: float, low: float | None, high: float | None, warn: float) -> str:
    g = gap(value, low, high)
    return PASS if g == 0 else WARN if g <= warn else FAIL


def overall(verdicts: list[str]) -> str:
    """Cả lần tập: từ 2 rep không đạt mới FAIL, từ 2 rep (không đạt + sát) mới WARN."""
    fails = verdicts.count(FAIL)
    if fails >= MIN_REPS:
        return FAIL
    return WARN if fails + verdicts.count(WARN) >= MIN_REPS else PASS


def grade_check(check, features: dict[str, Any]) -> dict[str, Any]:
    """MỘT khớp cần kiểm trên bộ số của job → một dòng review_results."""
    view = check.valid_viewpoints[0]
    t = check.thresholds
    low, high, warn = t.get("from"), t.get("to"), t.get("warn") or 0
    base = {"view": view, "measure": check.metric, "moment": check.moment,
            "from": low, "to": high, "warn": warn}
    clips = [v for v in features["views"] if v["view"] == view]
    if not clips:
        return _graded(check, NOT_APPLICABLE, base,
                       f"Chưa quay góc {LABEL_VI.get(view, view)}. Quay thêm góc này để chấm mục này.")
    values = []
    for clip in clips:
        for rep in clip["reps"]:
            value = _rep_value(rep, check, view, clip.get("near"), low, high)
            if value is not None:
                values.append({"rep": rep["rep"], "value": value})
    if len(values) < MIN_REPS:
        return _graded(check, LOW_CONFIDENCE, {**base, "reps": len(values)},
                       "Chưa đủ rõ để chấm mục này. Quay lại, đủ sáng, cả người trong khung.")
    verdicts = [range_verdict(v["value"], low, high, warn) for v in values]
    result = overall(verdicts)
    worst = max(range(len(values)),
                key=lambda i: (_SEVERITY[verdicts[i]], gap(values[i]["value"], low, high)))
    return _graded(check, result, {**base, "values": values, "worst": values[worst]},
                   None if result == PASS else check.cue_fail_vi)


def _rep_value(rep: dict[str, Any], check, view: str, near: str | None,
               low: float | None, high: float | None) -> float | None:
    """Số của một rep. Khớp có hai bên: góc ngang lấy bên gần camera (bên xa bị che), góc khác
    lấy bên ra ngoài khoảng đạt xa hơn."""
    at = MOMENT_SUFFIX[check.moment]
    if check.metric not in SIDED:
        return rep.get(f"{check.metric}_{at}")
    sides = [near] if view == SAGITTAL and near else ["l", "r"]
    values = [rep[k] for k in (f"{check.metric}_{s}_{at}" for s in sides) if k in rep]
    return max(values, key=lambda v: gap(v, low, high)) if values else None


def _graded(check, verdict: str, measured: dict[str, Any], cue: str | None) -> dict[str, Any]:
    return {"form_check_id": check.id, "code": check.code, "name_vi": check.name_vi,
            "verdict": verdict, "confidence": None, "measured": measured,
            "cue_text_vi": cue, "is_primary": False}

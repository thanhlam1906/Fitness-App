# -*- coding: utf-8 -*-
"""Kiểm tầng chấm: form_checks + số đo → verdict.

Chạy được KHÔNG cần video, không cần DB, không cần mediapipe — scoring.py cố ý
không import gì trong pipeline hình học. Bộ clip regression (§8) là việc khác,
nó kiểm số đo; cái này kiểm luật chấm.

    python -m pytest analyzer/tests
hoặc
    python analyzer/tests/test_scoring.py
"""
from __future__ import annotations

import sys
from dataclasses import dataclass
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from analyzer.scoring import (  # noqa: E402
    FAIL, LOW_CONFIDENCE, NOT_APPLICABLE, PASS, WARN,
    RepMeasurement, ThresholdShapeError, pick_primary, score_check, verdict_for_value,
)


@dataclass
class Check:
    id: str
    code: str
    metric: str
    valid_viewpoints: list
    thresholds: dict
    confidence_min: float
    cue_pass_vi: str
    cue_warn_vi: str
    cue_fail_vi: str
    priority: int


def depth_check(**overrides) -> Check:
    defaults = dict(
        id="c-depth", code="depth", metric="hip_depth_ratio", valid_viewpoints=["SAGITTAL"],
        thresholds={"pass_below": 1.10, "warn_below": 1.30}, confidence_min=0.70,
        cue_pass_vi="Độ sâu tốt.", cue_warn_vi="Hạ thêm chút nữa.", cue_fail_vi="Chưa đủ sâu.",
        priority=2)
    return Check(**{**defaults, **overrides})


def knee_check(**overrides) -> Check:
    defaults = dict(
        id="c-knee", code="knee_track", metric="knee_inward_travel", valid_viewpoints=["FRONTAL"],
        thresholds={"pass_below": 0.05, "warn_below": 0.13}, confidence_min=0.70,
        cue_pass_vi="Gối ổn.", cue_warn_vi="Gối hơi chụm.", cue_fail_vi="Gối chụm vào trong.",
        priority=1)
    return Check(**{**defaults, **overrides})


def test_threshold_shapes():
    smaller_better = {"pass_below": 1.10, "warn_below": 1.30}
    assert verdict_for_value(1.05, smaller_better) == PASS
    assert verdict_for_value(1.10, smaller_better) == PASS      # biên là ĐẠT
    assert verdict_for_value(1.20, smaller_better) == WARN
    assert verdict_for_value(1.40, smaller_better) == FAIL

    bigger_better = {"pass_above": 0.90, "warn_above": 0.75}
    assert verdict_for_value(0.95, bigger_better) == PASS
    assert verdict_for_value(0.80, bigger_better) == WARN
    assert verdict_for_value(0.50, bigger_better) == FAIL

    in_range = {"pass_between": [10, 55], "warn_between": [5, 65]}
    assert verdict_for_value(30, in_range) == PASS
    assert verdict_for_value(60, in_range) == WARN
    assert verdict_for_value(8, in_range) == WARN               # thân quá thẳng cũng là cảnh báo
    assert verdict_for_value(80, in_range) == FAIL

    # Ngưỡng lạ là lỗi cấu hình, phải nổ chứ không âm thầm cho qua.
    try:
        verdict_for_value(1.0, {"min": 1, "max": 2})
        raise AssertionError("phải ném ThresholdShapeError")
    except ThresholdShapeError:
        pass


def test_wrong_viewpoint_is_not_applicable_not_fail():
    # Clip quay ngang thì check gối (chỉ tin ở chính diện) KHÔNG được báo lỗi.
    result = score_check(knee_check(), "SAGITTAL", [RepMeasurement(0.30, 0.95)])
    assert result["verdict"] == NOT_APPLICABLE
    assert "chính diện" in result["cue_text_vi"]


def test_low_confidence_is_separate_from_fail():
    result = score_check(depth_check(), "SAGITTAL", [RepMeasurement(1.9, 0.40)])
    assert result["verdict"] == LOW_CONFIDENCE
    assert result["confidence"] == 0.40
    # Không được kết luận "chưa đủ sâu" khi landmark không đáng tin.
    assert result["cue_text_vi"] != depth_check().cue_fail_vi


def test_worst_rep_decides_and_counts_are_reported():
    result = score_check(depth_check(), "SAGITTAL", [
        RepMeasurement(1.05, 0.9),   # PASS
        RepMeasurement(1.20, 0.9),   # WARN
        RepMeasurement(1.60, 0.9),   # FAIL
    ])
    assert result["verdict"] == FAIL
    assert result["measured"]["reps_scored"] == 3
    assert result["measured"]["reps_passed"] == 1
    assert result["measured"]["worst_value"] == 1.6


def test_rep_below_confidence_is_dropped_not_scored():
    result = score_check(depth_check(), "SAGITTAL", [
        RepMeasurement(1.05, 0.9),
        RepMeasurement(9.99, 0.10),  # rác, phải bị loại chứ không kéo verdict xuống FAIL
    ])
    assert result["verdict"] == PASS
    assert result["measured"]["reps_scored"] == 1


def test_exactly_one_primary_and_priority_wins():
    knee = knee_check()
    depth = depth_check()
    results = [
        score_check(knee, "FRONTAL", [RepMeasurement(0.30, 0.9)]),    # FAIL, priority 1
        score_check(depth, "SAGITTAL", [RepMeasurement(1.60, 0.9)]),  # FAIL, priority 2
    ]
    pick_primary(results, {knee.id: knee, depth.id: depth})

    primaries = [r for r in results if r["is_primary"]]
    assert len(primaries) == 1
    assert primaries[0]["code"] == "knee_track"


def test_no_primary_when_everything_passes():
    depth = depth_check()
    results = [score_check(depth, "SAGITTAL", [RepMeasurement(1.0, 0.9)])]
    pick_primary(results, {depth.id: depth})
    assert not any(r["is_primary"] for r in results)


def test_fail_outranks_warn_even_at_lower_priority():
    knee = knee_check()
    depth = depth_check()
    results = [
        score_check(knee, "FRONTAL", [RepMeasurement(0.08, 0.9)]),    # WARN, priority 1
        score_check(depth, "SAGITTAL", [RepMeasurement(1.60, 0.9)]),  # FAIL, priority 2
    ]
    pick_primary(results, {knee.id: knee, depth.id: depth})
    assert [r["code"] for r in results if r["is_primary"]] == ["depth"]


if __name__ == "__main__":
    failures = 0
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"ok   {name}")
            except AssertionError as e:
                failures += 1
                print(f"FAIL {name}: {e}")
    print(f"\n{failures} failure(s)")
    sys.exit(1 if failures else 0)

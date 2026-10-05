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
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from analyzer.scoring import (  # noqa: E402
    FAIL, LOW_CONFIDENCE, NOT_APPLICABLE, PASS, WARN,
    RepMeasurement, ThresholdShapeError, grade_check, overall, pick_primary, range_verdict,
    score_check, verdict_for_value,
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


# ── Chấm theo ngưỡng admin nhập (doc/design-cham-form-nguong-v1.md §6) ──

@dataclass
class Threshold:
    id: str = "c1"
    code: str = "SAGITTAL-knee-PEAK"
    name_vi: str = "Ngồi đủ sâu"
    metric: str = "knee"
    moment: str = "PEAK"
    valid_viewpoints: list = field(default_factory=lambda: ["SAGITTAL"])
    thresholds: dict = field(default_factory=lambda: {"from": None, "to": 100, "warn": 15})
    cue_fail_vi: str = "Hạ hông tới khi đùi song song sàn."
    priority: int = 1


def side(left, right=None, near="l"):
    """Một clip góc ngang; mỗi rep một cặp góc gối trái, phải ở điểm xa nhất."""
    right = right or left
    return {"views": [{"clip": 1, "view": "SAGITTAL", "near": near,
                       "reps": [{"rep": i + 1, "knee_l_P": a, "knee_r_P": b}
                                for i, (a, b) in enumerate(zip(left, right))]}]}


def test_range_verdict_three_shapes():
    assert range_verdict(100, None, 100, 15) == PASS
    assert range_verdict(115, None, 100, 15) == WARN
    assert range_verdict(116, None, 100, 15) == FAIL
    assert range_verdict(158, 165, None, 10) == WARN
    assert range_verdict(150, 165, None, 10) == FAIL
    assert range_verdict(75, 80, 110, 10) == WARN
    assert range_verdict(121, 80, 110, 10) == FAIL
    assert range_verdict(101, None, 100, 0) == FAIL


def test_overall_needs_two_bad_reps():
    assert overall([PASS, PASS, FAIL]) == PASS
    assert overall([PASS, WARN, FAIL]) == WARN
    assert overall([WARN, WARN]) == WARN
    assert overall([FAIL, PASS, FAIL]) == FAIL


def test_grade_one_bad_rep_is_not_a_fault():
    row = grade_check(Threshold(), side([88, 93, 85, 95, 105]))
    assert row["verdict"] == PASS and row["cue_text_vi"] is None
    m = row["measured"]
    assert m["worst"] == {"rep": 5, "value": 105} and len(m["values"]) == 5
    assert (m["view"], m["measure"], m["moment"], m["from"], m["to"], m["warn"]) == (
        "SAGITTAL", "knee", "PEAK", None, 100, 15)


def test_grade_two_failing_reps_fail_with_cue():
    row = grade_check(Threshold(), side([88, 120, 85, 95, 125]))
    assert row["verdict"] == FAIL and row["cue_text_vi"] == "Hạ hông tới khi đùi song song sàn."
    assert row["measured"]["worst"] == {"rep": 5, "value": 125}
    assert (row["name_vi"], row["form_check_id"], row["is_primary"]) == ("Ngồi đủ sâu", "c1", False)


def test_grade_view_not_recorded():
    row = grade_check(Threshold(valid_viewpoints=["FRONTAL"], metric="valgus"), side([90, 90]))
    assert row["verdict"] == NOT_APPLICABLE and "chính diện" in row["cue_text_vi"]


def test_grade_too_few_reps():
    row = grade_check(Threshold(), side([120]))
    assert row["verdict"] == LOW_CONFIDENCE and row["measured"]["reps"] == 1


def test_side_view_reads_near_side_only():
    # Bên xa (trái) bị thân che nên số sai; bên gần (phải) mới là số thật.
    row = grade_check(Threshold(), side([140, 140, 140], [90, 92, 95], near="r"))
    assert row["verdict"] == PASS


def test_front_view_takes_worse_side():
    check = Threshold(valid_viewpoints=["FRONTAL"], metric="valgus",
                      thresholds={"from": None, "to": 10, "warn": 5})
    features = {"views": [{"clip": 1, "view": "FRONTAL", "near": "l",
                           "reps": [{"rep": i, "valgus_l_P": 3, "valgus_r_P": 20} for i in (1, 2, 3)]}]}
    assert grade_check(check, features)["verdict"] == FAIL


def test_primary_follows_priority_among_graded():
    depth = Threshold(id="a", priority=2)
    valgus = Threshold(id="b", priority=1, metric="valgus", valid_viewpoints=["FRONTAL"],
                       thresholds={"from": None, "to": 10, "warn": 5})
    features = side([130, 130, 130])
    features["views"].append({"clip": 2, "view": "FRONTAL", "near": "l",
                              "reps": [{"rep": i, "valgus_l_P": 25, "valgus_r_P": 25} for i in (1, 2, 3)]})
    rows = [grade_check(c, features) for c in (depth, valgus)]
    pick_primary(rows, {"a": depth, "b": valgus})
    assert [r["is_primary"] for r in rows] == [False, True]


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

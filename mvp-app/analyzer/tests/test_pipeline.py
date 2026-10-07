# -*- coding: utf-8 -*-
"""Kiểm pipeline đa bài trên landmark giả lập (concept-recognition-v1.md §6).

Cần mediapipe/numpy (pose.py import chúng) nhưng KHÔNG cần video hay model —
không hàm nào ở đây chạy landmarker.

    python analyzer/tests/test_pipeline.py
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from synth import clip, lunge_frame, pushup_frame, raise_frame, squat_frame  # noqa: E402
from analyzer.analyze import analyze_frames  # noqa: E402
from analyzer.exercises import LUNGE, PUSHUP, SQUAT  # noqa: E402
from analyzer.pipeline.features import view_features  # noqa: E402
from analyzer.pipeline.geometry import frame_metrics  # noqa: E402
from analyzer.pipeline.recognize import recognize  # noqa: E402
from analyzer.pipeline.reps import segment, segment_generic  # noqa: E402
from analyzer.pipeline.viewpoint import classify  # noqa: E402
from analyzer.scoring import FAIL, NOT_APPLICABLE, PASS  # noqa: E402
from analyzer.viewpoints import FRONTAL, SAGITTAL  # noqa: E402

# Chụp từ code TRƯỚC khi đa bài hoá (2026-09-17). Đổi số này = đổi hành vi squat của worker.
SQUAT_REPS_BEFORE = [(14, 22, 33), (52, 60, 71), (90, 98, 109), (128, 136, 147), (166, 174, 185)]


def verdicts(results):
    return {r["code"]: r["verdict"] for r in results}


def test_squat_unchanged():
    for view, kw, expect in (("frontal", dict(valgus=0.12), FRONTAL), ("side", {}, SAGITTAL)):
        frames = clip(squat_frame, view=view, **kw)
        metrics = [frame_metrics(f) for f in frames]
        assert classify(frames, 0.5) == expect
        got = [(r.start, r.bottom, r.end) for r in segment(frames, metrics, 0.5)]
        assert got == SQUAT_REPS_BEFORE, got
        bottom = metrics[22]
        assert round(bottom.hip_angle_deg, 4) == 61.3402
        assert round(bottom.depth_ratio, 4) == 0.5091
        assert np.allclose(bottom.torso_axis, [0.5736, 0.8192, 0.0], atol=1e-4)
    assert [round(v, 4) for v in metrics[22].knee_lateral_m] == [0.0, 0.0]


def test_squat_two_views_merged():
    results, notes, _ = analyze_frames(
        [clip(squat_frame, view="frontal", valgus=0.12), clip(squat_frame, view="side")],
        SQUAT.checks, 0.5, SQUAT.signal)
    by = {r["code"]: r for r in results}
    assert by["knee_track"]["verdict"] == FAIL and by["knee_track"]["is_primary"]
    assert by["depth"]["verdict"] == PASS and by["torso_lean"]["verdict"] == PASS
    assert any("5 rep" in n for n in notes), notes


def test_pushup():
    frames = clip(pushup_frame)
    metrics = [frame_metrics(f) for f in frames]
    assert classify(frames, 0.5) == SAGITTAL
    assert len(segment(frames, metrics, 0.5, PUSHUP.signal)) == 5
    results, _, _ = analyze_frames([frames], PUSHUP.checks, 0.5, PUSHUP.signal)
    assert verdicts(results) == {"pushup_depth": PASS, "hip_sag": PASS}, verdicts(results)
    results, _, _ = analyze_frames([clip(pushup_frame, sag=0.2)], PUSHUP.checks, 0.5, PUSHUP.signal)
    assert verdicts(results)["hip_sag"] == FAIL


def test_lunge():
    frames = clip(lunge_frame)
    metrics = [frame_metrics(f) for f in frames]
    assert classify(frames, 0.5) == SAGITTAL
    assert len(segment(frames, metrics, 0.5, LUNGE.signal)) == 5
    results, _, _ = analyze_frames([frames], LUNGE.checks, 0.5, LUNGE.signal)
    assert verdicts(results) == {"front_knee": PASS, "torso_lean": PASS,
                                 "knee_track": NOT_APPLICABLE}, verdicts(results)


def test_recognize():
    cases = ((squat_frame, dict(view="side"), "squat"), (pushup_frame, {}, "pushup"),
             (lunge_frame, {}, "lunge"))
    for make, kw, label in cases:
        frames = clip(make, **kw)
        r = recognize(frames, [frame_metrics(f) for f in frames])
        assert r.label == label and r.confidence >= 0.5, (label, r)
    still = [squat_frame(i, 0.0) for i in range(30)]
    assert recognize(still, [frame_metrics(f) for f in still]).label == "unknown"


def test_segment_generic_counts_every_exercise():
    cases = ((squat_frame, dict(view="side")), (squat_frame, dict(view="frontal")),
             (pushup_frame, {}), (lunge_frame, {}), (raise_frame, {}))
    for make, kw in cases:
        frames = clip(make, **kw)
        metrics = [frame_metrics(f) for f in frames]
        seg = segment_generic(frames, metrics, 0.5)
        assert len(seg.reps) == 5, (make.__name__, kw, seg)
        for rep in seg.reps:
            assert rep.start < rep.bottom < rep.end, rep


def test_segment_generic_raise_goes_up():
    frames = clip(raise_frame)
    metrics = [frame_metrics(f) for f in frames]
    seg = segment_generic(frames, metrics, 0.5)
    assert seg.joint == "shoulder", seg.joint
    # Điểm xa nhất của nâng tay là góc vai LỚN nhất, không phải nhỏ nhất.
    for rep in seg.reps:
        assert metrics[rep.bottom].shoulder_mean_deg > metrics[rep.start].shoulder_mean_deg + 60


def test_segment_generic_still_has_no_reps():
    still = [squat_frame(i, 0.0) for i in range(60)]
    seg = segment_generic(still, [frame_metrics(f) for f in still], 0.5)
    assert seg.joint is None and seg.reps == []


def test_features_side_squat():
    frames = clip(squat_frame, view="side")
    metrics = [frame_metrics(f) for f in frames]
    v = view_features(1, SAGITTAL, frames, metrics, segment_generic(frames, metrics, 0.5))
    assert (v["clip"], v["view"], v["near"], v["reps_total"], v["reps_used"]) == (1, SAGITTAL, "l", 5, 5)
    first = v["reps"][0]
    assert first["rep"] == 1
    assert first["hip_l_S"] > 170 and first["hip_l_P"] < 80        # đứng thẳng → ngồi sâu
    assert first["knee_l_S"] > 170 and first["knee_l_P"] < 120
    assert first["ankle_l_S"] == 90 and first["ankle_l_P"] < 70     # cẳng chân đổ ra trước
    assert first["line_S"] == 180
    assert first["asym_knee_P"] == 0 and first["valgus_l_P"] == 0   # squat giả lập đối xứng
    assert {"torso_S", "torso_P", "asym_hip_P", "asym_shoulder_S"} <= set(first)
    assert all(isinstance(x, int) for x in first.values())


def test_features_frontal_valgus_in_degrees():
    frames = clip(squat_frame, view="frontal", valgus=0.12)
    metrics = [frame_metrics(f) for f in frames]
    v = view_features(2, FRONTAL, frames, metrics, segment_generic(frames, metrics, 0.5))
    assert all(r["valgus_l_P"] > 20 and r["valgus_r_P"] > 20 for r in v["reps"]), v["reps"]
    assert all(r["valgus_l_S"] == 0 for r in v["reps"])   # đứng thẳng thì gối chưa chụm


def test_features_drop_low_confidence_reps():
    frames = clip(squat_frame, view="side")
    for f in frames[8:31]:   # rep 1 lúc hạ và đáy: đủ để tách rep (≥ 0.5) nhưng dưới 0.7
        f.vis[:] = 0.6
    metrics = [frame_metrics(f) for f in frames]
    v = view_features(1, SAGITTAL, frames, metrics, segment_generic(frames, metrics, 0.5))
    assert v["reps_total"] == 5 and v["reps_used"] == 4
    assert [r["rep"] for r in v["reps"]] == [2, 3, 4, 5]    # giữ số thứ tự gốc


def test_near_side_is_the_more_visible_side():
    frames = clip(squat_frame, view="side")
    # Đặt bên trái (vai, hông, gối, cổ chân) thấp hơn → bên phải gần camera hơn
    from analyzer.pipeline.pose import LM
    for f in frames:
        f.vis[[LM["l_sho"], LM["l_hip"], LM["l_knee"], LM["l_ankle"]]] = 0.8
    metrics = [frame_metrics(f) for f in frames]
    v = view_features(1, SAGITTAL, frames, metrics, segment_generic(frames, metrics, 0.5))
    assert v["near"] == "r"  # bên phải hiện rõ hơn
    assert v["reps_total"] == 5 and v["reps_used"] == 5  # reps vẫn sinh ra được


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("OK", name)

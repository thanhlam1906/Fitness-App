# -*- coding: utf-8 -*-
"""Bộ số từng rep, dùng chung cho MỌI bài — doc/design-cham-form-llm-v1.md §4.3.

Không có số nào theo bài. Code tính hết; LLM chỉ đọc bảng này để nhận diện và chấm, và mọi kết
luận của nó phải trỏ về đúng một ô ở đây (judge.py kiểm).
"""
from __future__ import annotations

from typing import Any

import numpy as np

from ..feature_keys import rounded
from .geometry import FrameMetrics, angle_deg, shoulder_width_m
from .metrics import knee_inward_travel, torso_lean_deg
from .pose import LM, Frame
from .reps import GENERIC_SIGNALS, GenericSegmentation, Rep

MIN_REP_CONFIDENCE = 0.70   # như confidence_min mặc định của form_checks
_TORSO = [LM["l_sho"], LM["r_sho"], LM["l_hip"], LM["r_hip"]]


def _at(frame: Frame, m: FrameMetrics) -> dict[str, float]:
    w = frame.world
    shoulder = (w[LM["l_sho"]] + w[LM["r_sho"]]) / 2.0
    hip = (w[LM["l_hip"]] + w[LM["r_hip"]]) / 2.0
    ankle = (w[LM["l_ankle"]] + w[LM["r_ankle"]]) / 2.0
    width = shoulder_width_m(frame)
    return {
        "knee_l": m.knee_angle_deg[0], "knee_r": m.knee_angle_deg[1],
        "hip_l": m.hip_side_deg[0], "hip_r": m.hip_side_deg[1],
        "elbow_l": m.elbow_angle_deg[0], "elbow_r": m.elbow_angle_deg[1],
        "shoulder_l": m.shoulder_angle_deg[0], "shoulder_r": m.shoulder_angle_deg[1],
        "torso_tilt": m.torso_tilt_deg,
        "body_line": angle_deg(shoulder - hip, ankle - hip),
        "depth_ratio": m.depth_ratio,
        # Rộng vai vô lý (landmark hỏng) thì không chia, như knee_inward_travel.
        "stance": (float(np.linalg.norm(w[LM["l_ankle"]] - w[LM["r_ankle"]])) / width
                   if width >= 0.05 else 0.0),
    }


def rep_features(rep: Rep, frames: list[Frame], metrics: list[FrameMetrics]) -> dict[str, int | float]:
    s = _at(frames[rep.start], metrics[rep.start])
    p = _at(frames[rep.bottom], metrics[rep.bottom])
    out: dict[str, int | float] = {}
    for key in s:
        out[f"{key}_S"] = rounded(key, s[key])
        out[f"{key}_P"] = rounded(key, p[key])
    out["torso_lean"] = rounded("torso_lean", torso_lean_deg(rep, frames, metrics))
    out["knee_in"] = rounded("knee_in", knee_inward_travel(rep, frames, metrics))
    for joint in ("knee", "hip", "elbow", "shoulder"):
        out[f"{joint}_asym"] = rounded(f"{joint}_asym", abs(p[f"{joint}_l"] - p[f"{joint}_r"]))
    return out


def rep_confidence(rep: Rep, frames: list[Frame], joint: str) -> float:
    """Visibility thấp nhất của thân và các khớp của góc chủ ở đầu rep và điểm xa nhất. Không đòi
    đủ mọi khớp: quay ngang thì khớp phía xa hay bị che (spec §4.3)."""
    joints = sorted(set(_TORSO + GENERIC_SIGNALS[joint][1]))
    return float(min(np.min(frames[rep.start].vis[joints]), np.min(frames[rep.bottom].vis[joints])))


def view_features(clip: int, view: str, frames: list[Frame], metrics: list[FrameMetrics],
                  seg: GenericSegmentation) -> dict[str, Any]:
    """Một clip → một mục của features["views"]. Rep kém tin cậy bị bỏ nhưng giữ số thứ tự gốc,
    để "rep 4" trên màn kết quả đúng là rep thứ tư người dùng đã tập."""
    reps = [{"rep": n, **rep_features(rep, frames, metrics)}
            for n, rep in enumerate(seg.reps, start=1)
            if rep_confidence(rep, frames, seg.joint) >= MIN_REP_CONFIDENCE]
    return {"clip": clip, "view": view, "dominant": seg.joint,
            "reps_total": len(seg.reps), "reps_used": len(reps), "reps": reps}

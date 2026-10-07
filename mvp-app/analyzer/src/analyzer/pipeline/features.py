# -*- coding: utf-8 -*-
"""Bộ số từng rep, dùng chung cho MỌI bài — doc/design-cham-form-nguong-v1.md §3.

Không có số nào theo bài. Code tính hết; scoring.grade_check so từng số với ngưỡng admin nhập.
Khoá "<số đo>_<bên>_<lúc>" cho khớp có hai bên (knee_l_P), "<số đo>_<lúc>" cho số một giá trị
(torso_P, asym_knee_P). Lúc: S = đầu rep, P = điểm xa nhất. Mọi số là độ nguyên.
"""
from __future__ import annotations

from typing import Any

import numpy as np

from ..feature_keys import degrees
from .geometry import FrameMetrics, angle_deg
from .pose import LM, Frame
from .reps import GENERIC_SIGNALS, GenericSegmentation, Rep

MIN_REP_CONFIDENCE = 0.70   # như confidence_min mặc định của form_checks
_TORSO = [LM["l_sho"], LM["r_sho"], LM["l_hip"], LM["r_hip"]]
_SIDE = {s: [LM[f"{s}_sho"], LM[f"{s}_hip"], LM[f"{s}_knee"], LM[f"{s}_ankle"]] for s in ("l", "r")}


def _at(frame: Frame, m: FrameMetrics) -> dict[str, float]:
    w = frame.world
    shoulder = (w[LM["l_sho"]] + w[LM["r_sho"]]) / 2.0
    hip = (w[LM["l_hip"]] + w[LM["r_hip"]]) / 2.0
    ankle = (w[LM["l_ankle"]] + w[LM["r_ankle"]]) / 2.0
    out = {"torso": m.torso_tilt_deg, "line": angle_deg(shoulder - hip, ankle - hip)}
    for i, s in enumerate(("l", "r")):
        out[f"ankle_{s}"] = m.ankle_angle_deg[i]
        out[f"knee_{s}"] = m.knee_angle_deg[i]
        out[f"hip_{s}"] = m.hip_side_deg[i]
        out[f"shoulder_{s}"] = m.shoulder_angle_deg[i]
        out[f"elbow_{s}"] = m.elbow_angle_deg[i]
        out[f"valgus_{s}"] = m.valgus_deg[i]
    return out


def rep_features(rep: Rep, frames: list[Frame], metrics: list[FrameMetrics]) -> dict[str, int]:
    out: dict[str, int] = {}
    for at, i in (("S", rep.start), ("P", rep.bottom)):
        values = _at(frames[i], metrics[i])
        for key, value in values.items():
            out[f"{key}_{at}"] = degrees(value)
        for joint in ("knee", "hip", "shoulder"):
            out[f"asym_{joint}_{at}"] = degrees(abs(values[f"{joint}_l"] - values[f"{joint}_r"]))
    return out


def rep_confidence(rep: Rep, frames: list[Frame], joint: str) -> float:
    """Visibility thấp nhất của thân và các khớp của góc chủ ở đầu rep và điểm xa nhất. Không đòi
    đủ mọi khớp: quay ngang thì khớp phía xa hay bị che (spec §4.3)."""
    joints = sorted(set(_TORSO + GENERIC_SIGNALS[joint][1]))
    return float(min(np.min(frames[rep.start].vis[joints]), np.min(frames[rep.bottom].vis[joints])))


def near_side(frames: list[Frame]) -> str:
    """Bên gần camera khi quay ngang: bên có visibility trung bình cao hơn. Bên xa bị thân che
    nên số của nó không tin được (doc/design-cham-form-nguong-v1.md §3)."""
    mean = {s: float(np.mean([f.vis[j] for f in frames for j in joints])) for s, joints in _SIDE.items()}
    return "l" if mean["l"] >= mean["r"] else "r"


def view_features(clip: int, view: str, frames: list[Frame], metrics: list[FrameMetrics],
                  seg: GenericSegmentation) -> dict[str, Any]:
    """Một clip → một mục của features["views"]. Rep kém tin cậy bị bỏ nhưng giữ số thứ tự gốc,
    để "rep 4" trên màn kết quả đúng là rep thứ tư người dùng đã tập."""
    reps = [{"rep": n, **rep_features(rep, frames, metrics)}
            for n, rep in enumerate(seg.reps, start=1)
            if rep_confidence(rep, frames, seg.joint) >= MIN_REP_CONFIDENCE]
    return {"clip": clip, "view": view, "near": near_side(frames), "dominant": seg.joint,
            "reps_total": len(seg.reps), "reps_used": len(reps), "reps": reps}

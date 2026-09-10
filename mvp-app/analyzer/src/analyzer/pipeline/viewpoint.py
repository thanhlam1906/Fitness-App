# -*- coding: utf-8 -*-
"""Phân loại góc quay: chính diện / ngang / ~45°.

Heuristic: tỉ lệ rộng-vai trên dài-thân TRÊN ẢNH. Quay chính diện thì vai
rộng, quay ngang thì hai vai gần chồng nhau.

Tên góc và nhãn tiếng Việt ở `analyzer/viewpoints.py` — module không phụ thuộc
gì, để scoring.py dùng được mà không kéo theo mediapipe.

A3 concept-analyzer-v1.md §11: hai ngưỡng 0.42 / 0.28 là số của demo, chưa
kiểm trên nhiều dáng người. Đo lại khi có bộ clip regression.
"""
from __future__ import annotations

from ..viewpoints import DIAGONAL, FRONTAL, SAGITTAL, UNKNOWN
from .pose import LM, Frame

FRONTAL_MIN_RATIO = 0.42
SAGITTAL_MAX_RATIO = 0.28


def classify(frames: list[Frame], min_visibility: float) -> str:
    ratios = []
    for frame in frames[:300]:
        v, n = frame.vis, frame.norm
        if min(v[LM["l_sho"]], v[LM["r_sho"]], v[LM["l_hip"]], v[LM["r_hip"]]) < min_visibility:
            continue
        shoulder_span = abs(n[LM["l_sho"]][0] - n[LM["r_sho"]][0])
        torso_len = abs(
            (n[LM["l_sho"]][1] + n[LM["r_sho"]][1]) / 2.0 - (n[LM["l_hip"]][1] + n[LM["r_hip"]][1]) / 2.0)
        if torso_len > 0.03:
            ratios.append(shoulder_span / torso_len)

    if not ratios:
        return UNKNOWN
    ratio = sum(ratios) / len(ratios)
    if ratio >= FRONTAL_MIN_RATIO:
        return FRONTAL
    if ratio <= SAGITTAL_MAX_RATIO:
        return SAGITTAL
    return DIAGONAL

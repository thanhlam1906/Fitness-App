# -*- coding: utf-8 -*-
"""Chuẩn hoá trục và số đo hình học từng frame. Từ `_frame_metrics` của demo.

Trục đứng = hông→vai, trục ngang = hông trái→hông phải. Mọi số đo có hướng
tính trong hệ này, nên nghiêng máy quay không làm lệch kết quả
(concept-analyzer-v1.md §5 bước 5).
"""
from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .pose import LM, Frame


@dataclass
class FrameMetrics:
    hip_angle_deg: float       # góc hông: (hông→vai) vs (hông→gối). Nhỏ = đang ngồi sâu
    depth_ratio: float         # (hông trên cổ chân)/(gối trên cổ chân). ≈1 là ngang gối
    torso_axis: np.ndarray     # vector đơn vị hông→vai
    knee_lateral_m: list[float]  # lệch ngang gối so cổ chân, dương = RA NGOÀI, mét
    knee_angle_deg: list[float]    # [trái, phải] góc hông–gối–cổ chân
    elbow_angle_deg: list[float]   # [trái, phải] góc vai–khuỷu–cổ tay
    elbow_mean_deg: float          # tín hiệu rep push-up
    front_knee_angle_deg: float    # min hai gối — tín hiệu rep lunge
    torso_tilt_deg: float          # trục hông→vai TRÊN ẢNH so với phương đứng của ảnh; ~90 = nằm ngang


def angle_deg(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = float(np.linalg.norm(a)), float(np.linalg.norm(b))
    if na < 1e-9 or nb < 1e-9:
        return 0.0
    cos = float(np.dot(a, b)) / (na * nb)
    return math.degrees(math.acos(max(-1.0, min(1.0, cos))))


def frame_metrics(frame: Frame) -> FrameMetrics:
    w = frame.world
    shoulder = (w[LM["l_sho"]] + w[LM["r_sho"]]) / 2.0
    hip = (w[LM["l_hip"]] + w[LM["r_hip"]]) / 2.0
    knee = (w[LM["l_knee"]] + w[LM["r_knee"]]) / 2.0

    torso = shoulder - hip
    up = torso / (np.linalg.norm(torso) + 1e-9)
    lateral = w[LM["r_hip"]] - w[LM["l_hip"]]
    lateral_n = lateral / (np.linalg.norm(lateral) + 1e-9)

    ratio = 0.0
    for h, k, a in ((LM["l_hip"], LM["l_knee"], LM["l_ankle"]),
                    (LM["r_hip"], LM["r_knee"], LM["r_ankle"])):
        # sàn 0.05 m: chân gần như duỗi thẳng thì mẫu số tiến về 0 và tỉ lệ nổ tung
        denominator = max(float(np.dot(w[k] - w[a], up)), 0.05)
        ratio += float(np.dot(w[h] - w[a], up)) / denominator
    ratio /= 2.0

    # Chuẩn hoá dấu theo từng chân để "dương = ra ngoài" đúng cho cả hai bên.
    knee_lateral = [
        -1.0 * float(np.dot(w[LM["l_knee"]] - w[LM["l_ankle"]], lateral_n)),
        +1.0 * float(np.dot(w[LM["r_knee"]] - w[LM["r_ankle"]], lateral_n)),
    ]

    knee_angle = [
        angle_deg(w[LM[f"{s}_hip"]] - w[LM[f"{s}_knee"]], w[LM[f"{s}_ankle"]] - w[LM[f"{s}_knee"]])
        for s in ("l", "r")]
    elbow_angle = [
        angle_deg(w[LM[f"{s}_sho"]] - w[LM[f"{s}_elbow"]], w[LM[f"{s}_wrist"]] - w[LM[f"{s}_elbow"]])
        for s in ("l", "r")]

    # Trên ảnh y hướng xuống, nên "đứng thẳng" là vector (0, -1). world không có trọng lực
    # để so — giả định máy quay đặt ngang (A6 concept-recognition-v1.md).
    n = frame.norm
    torso_img = ((n[LM["l_sho"]] + n[LM["r_sho"]]) / 2.0 - (n[LM["l_hip"]] + n[LM["r_hip"]]) / 2.0)[:2]
    tilt = angle_deg(torso_img, np.array([0.0, -1.0]))

    return FrameMetrics(
        hip_angle_deg=angle_deg(shoulder - hip, knee - hip),
        depth_ratio=ratio,
        torso_axis=up,
        knee_lateral_m=knee_lateral,
        knee_angle_deg=knee_angle,
        elbow_angle_deg=elbow_angle,
        elbow_mean_deg=(elbow_angle[0] + elbow_angle[1]) / 2.0,
        front_knee_angle_deg=min(knee_angle),
        torso_tilt_deg=tilt,
    )


def shoulder_width_m(frame: Frame) -> float:
    """Kích thước cơ thể để chuẩn hoá số đo tuyệt đối — A0 concept-analyzer-v1.md §11."""
    w = frame.world
    return float(np.linalg.norm(w[LM["l_sho"]] - w[LM["r_sho"]]))

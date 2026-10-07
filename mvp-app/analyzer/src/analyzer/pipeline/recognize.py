# -*- coding: utf-8 -*-
"""T3 — nhận diện bài tập từ chuỗi khớp (concept-recognition-v1.md §3).

v0: luật trên đặc trưng cửa sổ, không cần dữ liệu. Thân nằm ngang + khuỷu gập →
push-up; gối gập đối xứng → squat; gối gập lệch hai chân → lunge.

v1 (khi có MM-Fit + clip tự quay): kNN/MLP trên CHÍNH `features` này, cùng chữ ký.
Vì thế hàm luôn trả `features` — mỗi lần chạy là một dòng dataset.
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .geometry import FrameMetrics
from .pose import Frame

HORIZONTAL_TILT_DEG = 60.0   # thân nghiêng hơn mức này so với phương đứng của ảnh = nằm ngang
MIN_ROM_DEG = 40.0           # biên độ góc dưới mức này = chưa có chuyển động đáng kể
LUNGE_ASYMMETRY_DEG = 25.0   # hai gối lệch biên độ hơn mức này = một chân trước một chân sau


@dataclass(frozen=True)
class Recognition:
    label: str          # "squat" | "pushup" | "lunge" | "unknown"
    confidence: float   # 0..1
    features: dict[str, float]


def _rom(values: list[float]) -> float:
    return float(max(values) - min(values)) if values else 0.0


def _margin(value: float, threshold: float) -> float:
    """Vượt ngưỡng bao xa, chuẩn hoá về [0, 1] với 1 = vượt gấp đôi ngưỡng."""
    return float(np.clip((value - threshold) / threshold, 0.0, 1.0))


def recognize(frames: list[Frame], metrics: list[FrameMetrics]) -> Recognition:
    knee_rom = [_rom([m.knee_angle_deg[i] for m in metrics]) for i in (0, 1)]
    features = {
        "torso_tilt_med": float(np.median([m.torso_tilt_deg for m in metrics])) if metrics else 0.0,
        "elbow_rom": _rom([m.elbow_mean_deg for m in metrics]),
        "knee_rom_max": max(knee_rom) if metrics else 0.0,
        "knee_rom_asym": abs(knee_rom[0] - knee_rom[1]) if metrics else 0.0,
        "hip_rom": _rom([m.hip_angle_deg for m in metrics]),
        "frames": float(len(metrics)),
    }

    if features["torso_tilt_med"] >= HORIZONTAL_TILT_DEG and features["elbow_rom"] >= MIN_ROM_DEG:
        return Recognition("pushup", _margin(features["elbow_rom"], MIN_ROM_DEG), features)
    if features["knee_rom_max"] >= MIN_ROM_DEG:
        knee = _margin(features["knee_rom_max"], MIN_ROM_DEG)
        asym = features["knee_rom_asym"]
        if asym >= LUNGE_ASYMMETRY_DEG:
            return Recognition("lunge", min(knee, _margin(asym, LUNGE_ASYMMETRY_DEG)), features)
        # đối xứng: tin cậy giảm dần khi lệch tiến về ngưỡng lunge
        return Recognition("squat", min(knee, float(np.clip(1.0 - asym / LUNGE_ASYMMETRY_DEG, 0.0, 1.0))),
                           features)
    return Recognition("unknown", 0.0, features)

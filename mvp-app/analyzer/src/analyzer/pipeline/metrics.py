# -*- coding: utf-8 -*-
"""RANH GIỚI P7. Bên trái file này là CÔNG THỨC ĐO — đổi phải deploy.
Bên phải (bảng `form_checks` trong DB) là NGƯỠNG và TEXT — HLV đổi bất cứ lúc nào.

Ranh giới đó chỉ có một chỗ, và nó là file này (concept-analyzer-v1.md §4, §6.2).

`metric` trong DB không có trong bảng METRICS → job FAILED kèm lỗi rõ ràng,
KHÔNG âm thầm bỏ qua check. Admin gõ nhầm tên metric là lỗi cấu hình, phải
nhìn thấy ngay.
"""
from __future__ import annotations

from typing import Callable

from .geometry import FrameMetrics, angle_deg, shoulder_width_m
from .pose import Frame
from .reps import Rep

# Mỗi hàm đo nhận (rep, frames, metrics) và trả về MỘT số cho rep đó.
MetricFn = Callable[[Rep, list[Frame], list[FrameMetrics]], float]


def hip_depth_ratio(rep: Rep, frames: list[Frame], metrics: list[FrameMetrics]) -> float:
    """Tỉ lệ độ sâu ở đáy rep. ≈1.0 là hông ngang gối; nhỏ hơn là sâu hơn."""
    return metrics[rep.bottom].depth_ratio


def torso_lean_deg(rep: Rep, frames: list[Frame], metrics: list[FrameMetrics]) -> float:
    """Nghiêng thân ở đáy so với tư thế đứng CỦA CHÍNH REP ĐÓ, tính bằng độ."""
    return angle_deg(metrics[rep.start].torso_axis, metrics[rep.bottom].torso_axis)


def knee_inward_travel(rep: Rep, frames: list[Frame], metrics: list[FrameMetrics]) -> float:
    """Gối chụm vào trong khi hạ, CHIA CHO RỘNG VAI (không đơn vị).

    A0 concept-analyzer-v1.md §11: demo đo bằng mét tuyệt đối, nên người cao
    và người thấp cùng lỗi lại ra hai con số khác nhau. Chuẩn hoá theo kích
    thước cơ thể là điều kiện để hiệu chỉnh ngưỡng có nghĩa.
    """
    top = metrics[rep.start]
    bottom = metrics[rep.bottom]
    worst_m = max(top.knee_lateral_m[leg] - bottom.knee_lateral_m[leg] for leg in (0, 1))
    width = shoulder_width_m(frames[rep.start])
    if width < 0.05:
        return 0.0  # rộng vai vô lý (landmark hỏng) — không kết luận, để check khác nói
    return worst_m / width


METRICS: dict[str, MetricFn] = {
    "hip_depth_ratio": hip_depth_ratio,
    "torso_lean_deg": torso_lean_deg,
    "knee_inward_travel": knee_inward_travel,
}


class UnknownMetricError(Exception):
    def __init__(self, metric: str):
        super().__init__(
            f"form_checks.metric = '{metric}' không có trong metrics.py. "
            f"Tên hợp lệ: {', '.join(sorted(METRICS))}")

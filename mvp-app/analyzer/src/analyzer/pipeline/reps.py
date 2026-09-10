# -*- coding: utf-8 -*-
"""State machine phân đoạn rep trên chuỗi góc hông. Từ `_segment_reps` của demo.

Đây là bước NỘI BỘ — §6.5 ke-hoach-chi-tiet-chuc-nang-v1.md: không hiển thị
số đếm rep cho người dùng.

Baseline theo rep: mỗi rep mang theo frame "đứng" (start) và frame "đáy"
(bottom) của CHÍNH NÓ. Mọi check so hai frame trong cùng một rep, nên sai số
hệ thống do góc máy tự triệt tiêu, không cần calibrate (§5.1).
"""
from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .geometry import FrameMetrics
from .pose import CORE_JOINTS, Frame

DOWN_THRESHOLD_DEG = 128.0   # góc hông nhỏ hơn = đã bắt đầu hạ xuống
UP_THRESHOLD_DEG = 148.0     # lớn hơn = đã đứng thẳng lại, kết thúc rep
MIN_REP_FRAMES = 6
MIN_BOTTOM_DEG = 115.0       # rep không xuống dưới mức này là nhún nhẹ, không tính


@dataclass(frozen=True)
class Rep:
    start: int   # chỉ số trong danh sách frame, không phải chỉ số frame gốc
    bottom: int
    end: int


def segment(frames: list[Frame], metrics: list[FrameMetrics], min_visibility: float) -> list[Rep]:
    reps: list[Rep] = []
    in_rep = False
    start = bottom = 0
    min_angle = 999.0
    frame_count = 0

    for i, (frame, m) in enumerate(zip(frames, metrics)):
        angle = m.hip_angle_deg
        visible = float(np.min(frame.vis[CORE_JOINTS])) >= min_visibility

        if in_rep:
            if visible and angle < min_angle:
                min_angle = angle
                bottom = i
            frame_count += 1
            if angle > UP_THRESHOLD_DEG:
                if frame_count >= MIN_REP_FRAMES and min_angle < MIN_BOTTOM_DEG:
                    reps.append(Rep(start=start, bottom=bottom, end=i))
                in_rep = False
        elif visible and angle < DOWN_THRESHOLD_DEG:
            in_rep = True
            start = bottom = i
            min_angle = angle
            frame_count = 1

    return reps

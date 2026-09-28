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

MIN_REP_FRAMES = 6


@dataclass(frozen=True)
class RepSignal:
    """Góc nào GIẢM khi hạ xuống, và ba ngưỡng của state machine — mỗi bài một bộ
    (concept-recognition-v1.md §2). Ngưỡng bài khác squat là số tạm (A5)."""
    attr: str                 # tên trường trong FrameMetrics
    down_deg: float           # nhỏ hơn = đã bắt đầu hạ xuống
    up_deg: float             # lớn hơn = đã trở lại tư thế đầu, kết thúc rep
    min_bottom_deg: float     # rep không xuống dưới mức này là nhún nhẹ, không tính
    core_joints: list[int]    # khớp phải rõ thì frame mới dùng được


SQUAT_SIGNAL = RepSignal("hip_angle_deg", 128.0, 148.0, 115.0, CORE_JOINTS)


@dataclass(frozen=True)
class Rep:
    start: int   # chỉ số trong danh sách frame, không phải chỉ số frame gốc
    bottom: int
    end: int


def segment(frames: list[Frame], metrics: list[FrameMetrics], min_visibility: float,
            signal: RepSignal = SQUAT_SIGNAL) -> list[Rep]:
    reps: list[Rep] = []
    in_rep = False
    start = bottom = 0
    min_angle = 999.0
    frame_count = 0

    for i, (frame, m) in enumerate(zip(frames, metrics)):
        angle = getattr(m, signal.attr)
        visible = float(np.min(frame.vis[signal.core_joints])) >= min_visibility

        if in_rep:
            if visible and angle < min_angle:
                min_angle = angle
                bottom = i
            frame_count += 1
            if angle > signal.up_deg:
                if frame_count >= MIN_REP_FRAMES and min_angle < signal.min_bottom_deg:
                    reps.append(Rep(start=start, bottom=bottom, end=i))
                in_rep = False
        elif visible and angle < signal.down_deg:
            in_rep = True
            start = bottom = i
            min_angle = angle
            frame_count = 1

    return reps

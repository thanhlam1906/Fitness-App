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
from .pose import CORE_JOINTS, LM, Frame

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


# Tách rep dùng chung cho MỌI bài (doc/design-cham-form-llm-v1.md §4.2): không có ngưỡng
# theo bài. Góc nào dao động nhiều nhất trong clip thì góc đó là nhịp của động tác.
_TORSO = [LM["l_sho"], LM["r_sho"], LM["l_hip"], LM["r_hip"]]
GENERIC_SIGNALS: dict[str, tuple[str, list[int]]] = {
    "hip": ("hip_angle_deg", _TORSO + [LM["l_knee"], LM["r_knee"]]),
    "knee": ("front_knee_angle_deg", [LM["l_hip"], LM["r_hip"], LM["l_knee"], LM["r_knee"],
                                      LM["l_ankle"], LM["r_ankle"]]),
    "elbow": ("elbow_mean_deg", [LM["l_sho"], LM["r_sho"], LM["l_elbow"], LM["r_elbow"],
                                 LM["l_wrist"], LM["r_wrist"]]),
    "shoulder": ("shoulder_mean_deg", _TORSO + [LM["l_elbow"], LM["r_elbow"]]),
}
MIN_GENERIC_ROM_DEG = 30.0   # dưới mức này là đứng yên hoặc rung tay, chưa phải rep
BAND = 0.15                  # vùng trễ quanh điểm giữa biên độ, như countCycle của demo


@dataclass(frozen=True)
class GenericSegmentation:
    joint: str | None   # khoá của GENERIC_SIGNALS; None = không có chuyển động đáng kể
    reps: list[Rep]


def segment_generic(frames: list[Frame], metrics: list[FrameMetrics],
                    min_visibility: float) -> GenericSegmentation:
    best = None
    for joint, (attr, joints) in GENERIC_SIGNALS.items():
        idx = [i for i, f in enumerate(frames) if float(np.min(f.vis[joints])) >= min_visibility]
        if len(idx) < MIN_REP_FRAMES:
            continue
        values = np.array([getattr(metrics[i], attr) for i in idx])
        # p5–p95 chứ không min–max: một frame landmark nhảy không được thành biên độ.
        low, high = (float(v) for v in np.percentile(values, [5, 95]))
        if best is None or high - low > best[0]:
            best = (high - low, joint, idx, values, low, high)
    if best is None or best[0] < MIN_GENERIC_ROM_DEG:
        return GenericSegmentation(None, [])

    rom, joint, idx, values, low, high = best
    middle, band = (low + high) / 2, rom * BAND
    # Tư thế đầu ở phía góc lớn (squat, push-up) thì rep đi xuống; ở phía góc nhỏ (nâng tay)
    # thì đi lên. Đổi dấu để "xa tư thế đầu" luôn là số âm.
    rel = (values - middle) * (1.0 if np.median(values[:10]) >= middle else -1.0)

    reps: list[Rep] = []
    in_rep, rest, far = False, 0, 0
    for k, r in enumerate(rel):
        if not in_rep:
            if r > rel[rest]:
                rest = k        # frame gần tư thế đầu nhất trước khi rời đi = đầu rep
            if r < -band:
                in_rep, far = True, k
        else:
            if r < rel[far]:
                far = k         # frame xa tư thế đầu nhất = điểm đo "bottom"
            if r > band:
                if k - rest >= MIN_REP_FRAMES:
                    reps.append(Rep(start=idx[rest], bottom=idx[far], end=idx[k]))
                in_rep, rest = False, k
    return GenericSegmentation(joint, reps)

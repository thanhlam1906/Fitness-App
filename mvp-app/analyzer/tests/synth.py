# -*- coding: utf-8 -*-
"""Landmark giả lập cho test: khung sagittal x tới trước, y lên, z sang ngang (mét).

Chỉ dựng các khớp pipeline dùng (vai, khuỷu, cổ tay, hông, gối, cổ chân); khớp
khác = 0, visibility = 1. `d` ∈ [0, 1]: 0 = tư thế đầu, 1 = đáy rep.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from analyzer.pipeline.pose import Frame  # noqa: E402

# Cùng chỉ số với analyzer.pipeline.pose.LM — khai lại để synth chạy được trước khi LM có khuỷu.
J = dict(nose=0, l_sho=11, r_sho=12, l_elbow=13, r_elbow=14, l_wrist=15, r_wrist=16,
         l_hip=23, r_hip=24, l_knee=25, r_knee=26, l_ankle=27, r_ankle=28)
SIDE_Z = {"l": -0.15, "r": +0.15}


def _frame(index: int, joints: dict, view: str, horizontal: bool = False) -> Frame:
    """joints: tên không tiền tố → (x, y) hoặc (x, y, z_offset_thêm). Trải ra hai bên theo z."""
    world = np.zeros((33, 3))
    for name, p in joints.items():
        for side, z in SIDE_Z.items():
            q = np.array([p[0], p[1], z + (p[2] if len(p) > 2 else 0.0) * (1 if side == "r" else -1)])
            world[J[f"{side}_{name}"]] = q
    norm = np.zeros((33, 3))
    span = 0.2 if view == "frontal" else 0.03
    if horizontal:   # thân nằm ngang trên ảnh (push-up quay ngang)
        sho, hip = (0.7, 0.50), (0.45, 0.52)
    else:
        sho, hip = (0.5, 0.30), (0.5, 0.60)
    for side, sx in (("l", -span / 2), ("r", span / 2)):
        norm[J[f"{side}_sho"]] = [sho[0] + sx, sho[1], 0]
        norm[J[f"{side}_hip"]] = [hip[0] + sx, hip[1], 0]
    return Frame(index=index, norm=norm, vis=np.ones(33), world=world)


def _knee_for_angle(hip, ankle, angle_deg: float, forward: float):
    """Đặt gối sao cho góc hông–gối–cổ chân đúng bằng angle_deg; forward = ±1 hướng đỉnh gối."""
    hip, ankle = np.array(hip, float), np.array(ankle, float)
    mid, d = (hip + ankle) / 2, np.linalg.norm(hip - ankle)
    n = np.array([(hip - ankle)[1], -(hip - ankle)[0]])
    n = n / (np.linalg.norm(n) + 1e-9) * forward
    return tuple(mid + n * (d / 2) / math.tan(math.radians(angle_deg) / 2))


def squat_frame(i, d, view="frontal", valgus=0.0):
    lean = math.radians(35 * d)
    hip = (-0.25 * d, 0.9 - 0.45 * d)
    knee = (0.2 * d, 0.45 - 0.05 * d, -valgus * d)   # z âm cả 2 bên = chụm vào trong
    sho = (hip[0] + 0.5 * math.sin(lean), hip[1] + 0.5 * math.cos(lean))
    return _frame(i, dict(sho=sho, hip=hip, knee=knee, ankle=(0, 0),
                          elbow=(sho[0], sho[1] - 0.3), wrist=(sho[0], sho[1] - 0.55)), view)


def pushup_frame(i, d, sag=0.0):
    ankle = np.array([0.0, 0.05])
    y_s = 0.45 - 0.3 * d
    sho = np.array([math.sqrt(1.4 ** 2 - (y_s - 0.05) ** 2), y_s])
    hip = ankle + (sho - ankle) * (0.9 / 1.4) - np.array([0, sag * d])
    knee = ankle + (sho - ankle) * (0.45 / 1.4)
    elbow = (sho[0] - 0.2 * d, 0.22 - 0.1 * d)
    return _frame(i, dict(sho=tuple(sho), hip=tuple(hip), knee=tuple(knee), ankle=tuple(ankle),
                          elbow=elbow, wrist=(sho[0], 0.0)), "side", horizontal=True)


def lunge_frame(i, d):
    """Chân trái trước gập 165°→85°, chân phải sau gập 170°→140°. Hai bên chỉ khác nhau ở gối/cổ chân."""
    hip = (0.0, 0.9 - 0.35 * d)
    lean = math.radians(25 * d)
    sho = (hip[0] + 0.5 * math.sin(lean), hip[1] + 0.5 * math.cos(lean))
    f = _frame(i, dict(sho=sho, hip=hip, knee=(0, 0), ankle=(0, 0),
                       elbow=(sho[0], sho[1] - 0.3), wrist=(sho[0], sho[1] - 0.55)), "side")
    front_ankle, back_ankle = (0.3, 0.0), (-0.5, 0.0)
    fk = _knee_for_angle(hip, front_ankle, 165 - 80 * d, forward=+1)
    bk = _knee_for_angle(hip, back_ankle, 170 - 30 * d, forward=-1)
    f.world[J["l_ankle"]][:2] = front_ankle
    f.world[J["r_ankle"]][:2] = back_ankle
    f.world[J["l_knee"]][:2] = fk
    f.world[J["r_knee"]][:2] = bk
    return f


def raise_frame(i, d, view="frontal"):
    """Nâng tạ ngang vai: tay duỗi dạng từ 10° (thả) lên 90° (ngang vai). Góc vai TĂNG khi tập,
    ngược với squat — để kiểm tách rep chung không ngầm giả định "rep là đi xuống"."""
    a = math.radians(10 + 80 * d)
    sho = (0.0, 1.4)

    def arm(r):
        return (sho[0], sho[1] - r * math.cos(a), r * math.sin(a))

    return _frame(i, dict(sho=sho, hip=(0.0, 0.9), knee=(0.0, 0.45), ankle=(0.0, 0.0),
                          elbow=arm(0.3), wrist=arm(0.55)), view)


def clip(make, reps=5, hold=8, half=15, **kw):
    """Chuỗi frame: [đứng]*hold, hạ 1..half, lên half-1..0, lặp `reps` lần, kết thúc đứng."""
    frames, i = [], 0
    for _ in range(reps):
        for _ in range(hold):
            frames.append(make(i, 0.0, **kw)); i += 1
        for k in range(1, half + 1):
            frames.append(make(i, k / half, **kw)); i += 1
        for k in range(half - 1, -1, -1):
            frames.append(make(i, k / half, **kw)); i += 1
    for _ in range(hold):
        frames.append(make(i, 0.0, **kw)); i += 1
    return frames

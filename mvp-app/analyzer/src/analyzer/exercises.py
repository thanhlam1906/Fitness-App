# -*- coding: utf-8 -*-
"""Hồ sơ bài tập: tín hiệu rep, góc quay cần có, và bộ check dùng khi KHÔNG có DB
(demo camera trực tiếp). App thật vẫn đọc `form_checks` từ DB; squat ở đây chép
đúng số của `R__seed_content.sql` để hai đường cho cùng kết quả.

MỌI ngưỡng push-up / lunge là số tạm — A5 concept-recognition-v1.md §7.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .pipeline.pose import LM
from .pipeline.reps import SQUAT_SIGNAL, RepSignal
from .viewpoints import FRONTAL, SAGITTAL


@dataclass(frozen=True)
class Check:
    """Cùng trường với bảng form_checks (db.FormCheck) + name_vi để demo hiển thị."""
    id: str
    code: str
    name_vi: str
    metric: str
    valid_viewpoints: list[str]
    thresholds: dict[str, Any]
    cue_pass_vi: str
    cue_warn_vi: str
    cue_fail_vi: str
    priority: int
    confidence_min: float = 0.70


@dataclass(frozen=True)
class ExerciseProfile:
    slug: str
    label_vi: str
    signal: RepSignal
    protocol: list[str]          # thứ tự góc quay demo yêu cầu
    checks: list[Check] = field(default_factory=list)


_LEGS = [LM["l_hip"], LM["r_hip"], LM["l_knee"], LM["r_knee"], LM["l_ankle"], LM["r_ankle"],
         LM["l_sho"], LM["r_sho"]]
_PUSHUP_JOINTS = [LM["l_sho"], LM["r_sho"], LM["l_elbow"], LM["r_elbow"], LM["l_wrist"], LM["r_wrist"],
                  LM["l_hip"], LM["r_hip"], LM["l_ankle"], LM["r_ankle"]]

SQUAT = ExerciseProfile(
    slug="squat", label_vi="Squat", signal=SQUAT_SIGNAL, protocol=[FRONTAL, SAGITTAL],
    checks=[
        Check("squat-knee", "knee_track", "Gối không chụm vào trong (valgus)", "knee_inward_travel",
              [FRONTAL], {"pass_below": 0.053, "warn_below": 0.13},
              "Gối di chuyển ổn định, thẳng theo hướng mũi chân.",
              "Gối hơi chụm vào trong khi hạ — chủ động đẩy gối ra ngoài theo hướng mũi chân.",
              "Gối chụm vào trong khi hạ xuống. Đẩy gối ra ngoài theo hướng mũi chân, "
              "giữ đầu gối thẳng hàng với ngón chân giữa.", 1),
        Check("squat-depth", "depth", "Độ sâu — hông hạ xuống tới ~ngang gối", "hip_depth_ratio",
              [SAGITTAL], {"pass_below": 1.10, "warn_below": 1.30},
              "Độ sâu tốt: đùi đã xuống ngang sàn (song song) hoặc sâu hơn.",
              "Sát ngưỡng — hạ hông thêm một chút nữa là chạm mức song song.",
              "Chưa xuống đủ sâu. Hạ hông cho tới khi mặt trên đùi song song sàn.", 2),
        Check("squat-torso", "torso_lean", "Thân & lưng trong tư thế squat", "torso_lean_deg",
              [SAGITTAL], {"pass_between": [10, 55], "warn_between": [5, 65]},
              "Độ nghiêng thân hợp lý, lưng giữ được đường thẳng.",
              "Thân nghiêng hơi nhiều — giữ ngực mở, đẩy hông ra sau.",
              "Thân nghiêng quá nhiều khi hạ xuống. Siết bụng, giữ ngực nâng, đẩy hông ra sau.", 3),
    ])

PUSHUP = ExerciseProfile(
    slug="pushup", label_vi="Push-up",
    signal=RepSignal("elbow_mean_deg", 120.0, 150.0, 100.0, _PUSHUP_JOINTS),
    protocol=[SAGITTAL],
    checks=[
        Check("pushup-depth", "pushup_depth", "Độ sâu — ngực hạ gần sàn", "pushup_depth_deg",
              [SAGITTAL], {"pass_below": 95, "warn_below": 110},
              "Hạ đủ sâu, khuỷu gập tốt.",
              "Gần đủ sâu — hạ ngực thấp thêm một chút.",
              "Chưa hạ đủ sâu. Hạ ngực xuống cho tới khi khuỷu gập khoảng 90°.", 2),
        Check("pushup-hip", "hip_sag", "Thân thẳng — không võng hông / chổng mông", "hip_sag_deg",
              [SAGITTAL], {"pass_above": 165, "warn_above": 155},
              "Thân giữ thẳng từ vai tới gót.",
              "Hông hơi lệch khỏi đường thẳng — siết bụng, siết mông.",
              "Hông võng xuống hoặc đẩy lên quá cao. Siết bụng và mông để thân thẳng từ vai tới gót.", 1),
    ])

LUNGE = ExerciseProfile(
    slug="lunge", label_vi="Lunge",
    signal=RepSignal("front_knee_angle_deg", 130.0, 155.0, 110.0, _LEGS),
    protocol=[SAGITTAL, FRONTAL],
    checks=[
        Check("lunge-knee", "front_knee", "Gối trước gập ~90° ở đáy", "front_knee_angle_bottom",
              [SAGITTAL], {"pass_between": [80, 110], "warn_between": [70, 120]},
              "Gối trước gập đúng khoảng 90°.",
              "Gối trước gập hơi lệch 90° — điều chỉnh độ dài bước.",
              "Gối trước gập quá ít hoặc quá nhiều. Bước dài vừa để đùi trước song song sàn.", 2),
        Check("lunge-torso", "torso_lean", "Thân giữ thẳng khi hạ", "torso_lean_deg",
              [SAGITTAL], {"pass_between": [10, 55], "warn_between": [5, 65]},
              "Thân giữ được đường thẳng.",
              "Thân nghiêng hơi nhiều — giữ ngực mở.",
              "Thân đổ về trước quá nhiều. Giữ ngực nâng, mắt nhìn thẳng.", 3),
        Check("lunge-valgus", "knee_track", "Gối trước không chụm vào trong", "knee_inward_travel",
              [FRONTAL], {"pass_below": 0.053, "warn_below": 0.13},
              "Gối trước thẳng theo hướng mũi chân.",
              "Gối trước hơi chụm vào trong — đẩy gối theo hướng mũi chân.",
              "Gối trước chụm vào trong khi hạ. Đẩy gối ra theo hướng mũi chân.", 1),
    ])

PROFILES: dict[str, ExerciseProfile] = {p.slug: p for p in (SQUAT, PUSHUP, LUNGE)}

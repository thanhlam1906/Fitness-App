# -*- coding: utf-8 -*-
"""Bảng khoá của bộ số từng rep — doc/design-cham-form-llm-v1.md §4.3.

KHÔNG phụ thuộc gì, như viewpoints.py: judge.py dùng bảng này để viết prompt và gắn nhãn dẫn
chứng, mà judge.py phải test được bằng python trần, không numpy, không mediapipe.
"""
from __future__ import annotations

from .viewpoints import FRONTAL, SAGITTAL

_BOTH = f"{SAGITTAL} và {FRONTAL}"

# Đo ở hai khung: S = đầu rep (tư thế đầu), P = điểm xa nhất của động tác.
# Khoá thật trong bảng số là knee_l_S, knee_l_P… Giá trị: (nhãn ngắn cho màn kết quả,
# ghi chú đơn vị cho LLM, góc quay tin được).
FRAME_KEYS: dict[str, tuple[str, str, str]] = {
    "knee_l": ("góc gối trái", "độ; 180 = duỗi thẳng", SAGITTAL),
    "knee_r": ("góc gối phải", "độ; 180 = duỗi thẳng", SAGITTAL),
    "hip_l": ("góc hông trái", "vai–hông–gối, độ; 180 = đứng thẳng", SAGITTAL),
    "hip_r": ("góc hông phải", "vai–hông–gối, độ; 180 = đứng thẳng", SAGITTAL),
    "elbow_l": ("góc khuỷu trái", "độ; 180 = duỗi thẳng", SAGITTAL),
    "elbow_r": ("góc khuỷu phải", "độ; 180 = duỗi thẳng", SAGITTAL),
    "shoulder_l": ("góc vai trái", "hông–vai–khuỷu, độ; 0 = tay sát thân", _BOTH),
    "shoulder_r": ("góc vai phải", "hông–vai–khuỷu, độ; 0 = tay sát thân", _BOTH),
    "torso_tilt": ("độ nghiêng thân", "so với phương đứng, độ; 0 = đứng thẳng, 90 = nằm ngang",
                   SAGITTAL),
    "body_line": ("đường vai–hông–cổ chân", "độ; 180 = thân thẳng một đường", SAGITTAL),
    "depth_ratio": ("tỉ lệ độ sâu", "độ cao hông chia độ cao gối, tính từ cổ chân; "
                                    "1 = hông ngang gối, nhỏ hơn = sâu hơn", SAGITTAL),
    "stance": ("độ rộng chân", "khoảng cách hai cổ chân chia rộng vai", FRONTAL),
}
# Đo trên cả rep, không theo khung.
REP_KEYS: dict[str, tuple[str, str, str]] = {
    "torso_lean": ("thân đổ thêm", "độ đổi trục thân từ đầu rep tới điểm xa nhất, độ", SAGITTAL),
    "knee_in": ("gối chụm vào trong", "độ chụm khi hạ, chia rộng vai; 0 = không chụm", FRONTAL),
    "knee_asym": ("chênh gối trái phải", "ở điểm xa nhất, độ", FRONTAL),
    "hip_asym": ("chênh hông trái phải", "ở điểm xa nhất, độ", FRONTAL),
    "elbow_asym": ("chênh khuỷu trái phải", "ở điểm xa nhất, độ", FRONTAL),
    "shoulder_asym": ("chênh vai trái phải", "ở điểm xa nhất, độ", FRONTAL),
}
RATIO_KEYS = {"depth_ratio", "stance", "knee_in"}   # 2 chữ số; còn lại là góc, số nguyên
AT_VI = {"S": "ở tư thế đầu", "P": "ở điểm xa nhất"}


def rounded(key: str, value: float) -> int | float:
    """Làm tròn trước khi lưu và gửi LLM: dẫn chứng so khớp đúng từng số, nên số phải cố định."""
    return round(float(value), 2) if key in RATIO_KEYS else int(round(float(value)))


def label_vi(feature: str) -> str:
    """'knee_l_P' → 'góc gối trái ở điểm xa nhất'. Khoá lạ trả nguyên văn."""
    if feature in REP_KEYS:
        return REP_KEYS[feature][0]
    base, _, at = feature.rpartition("_")
    if base in FRAME_KEYS and at in AT_VI:
        return f"{FRAME_KEYS[base][0]} {AT_VI[at]}"
    return feature


def glossary() -> dict[str, str]:
    """Bảng giải thích cho prompt: khoá → nghĩa, đơn vị, góc quay tin được."""
    out = {f"{k}_S, {k}_P": f"{label} ({note}); tin ở góc {views}"
           for k, (label, note, views) in FRAME_KEYS.items()}
    out.update({k: f"{label} ({note}); tin ở góc {views}"
                for k, (label, note, views) in REP_KEYS.items()})
    return out

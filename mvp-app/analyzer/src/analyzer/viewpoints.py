# -*- coding: utf-8 -*-
"""Tên góc quay và nhãn tiếng Việt. KHÔNG phụ thuộc gì.

Tách khỏi `pipeline/viewpoint.py` (nơi có thuật toán phân loại, kéo theo
mediapipe/opencv) vì scoring.py cũng cần các tên này để viết lời nhắc "quay
thêm góc ...", mà scoring.py phải test được trên máy chưa cài mediapipe.

Giá trị khớp đúng `form_checks.valid_viewpoints` trong DB — một cách gọi cho
cả hệ, không map qua lại giữa "side" và "SAGITTAL" như demo.
"""
from __future__ import annotations

FRONTAL = "FRONTAL"
SAGITTAL = "SAGITTAL"
DIAGONAL = "DIAGONAL"
UNKNOWN = "UNKNOWN"

LABEL_VI = {
    FRONTAL: "chính diện",
    SAGITTAL: "ngang",
    DIAGONAL: "chéo ~45°",
    UNKNOWN: "chưa xác định",
}

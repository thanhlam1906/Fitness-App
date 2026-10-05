# -*- coding: utf-8 -*-
"""Khoá số đo của bộ số từng rep — doc/design-cham-form-nguong-v1.md §3.

Khoá: ankle, knee, hip, shoulder, elbow, valgus (có bên trái, phải), torso, line, asym_knee,
asym_hip, asym_shoulder. Trùng backend FormMeasures.java và web src/lib/formMeasures.ts: admin
chọn ở web, backend kiểm, analyzer tính. KHÔNG phụ thuộc gì, để scoring.py test được bằng python trần.
"""
from __future__ import annotations

SIDED = ("ankle", "knee", "hip", "shoulder", "elbow", "valgus")   # có bên trái, bên phải
MOMENT_SUFFIX = {"START": "S", "PEAK": "P"}                      # knee_l_P, torso_S


def degrees(value: float) -> int:
    """Mọi số đo là độ nguyên: admin nhập độ nguyên, màn kết quả hiện độ nguyên."""
    return int(round(float(value)))

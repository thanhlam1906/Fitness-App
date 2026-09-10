# -*- coding: utf-8 -*-
"""Ghép pipeline: clip → số đo → verdict. Bảy bước của concept-analyzer-v1.md §5.

Nhiều clip cùng một yêu cầu: mỗi clip được phân loại góc riêng, và mỗi check
chỉ chấm trên những clip có góc hợp lệ với nó (§6.4). Không có clip nào đúng
góc thì check đó là NOT_APPLICABLE, kèm lời nhắc quay thêm góc còn thiếu.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

from .pipeline import reps as reps_mod
from .pipeline.geometry import frame_metrics
from .pipeline.metrics import METRICS, UnknownMetricError
from .pipeline.pose import CORE_JOINTS, PoseError, PoseReader
from .pipeline.viewpoint import classify
from .viewpoints import LABEL_VI
from .scoring import NOT_APPLICABLE, RepMeasurement, pick_primary, score_check


@dataclass
class AnalyzedClip:
    path: Path
    viewpoint: str
    frames: list
    metrics: list
    reps: list
    coverage: float


def analyze_request(
    clip_paths: list[Path],
    checks: list,
    reader: PoseReader,
    min_visibility: float,
    max_frames: int,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Trả (results, notes). Ném PoseError nếu không clip nào dùng được."""
    for check in checks:
        if check.metric not in METRICS:
            raise UnknownMetricError(check.metric)

    clips: list[AnalyzedClip] = []
    notes: list[str] = []
    for path in clip_paths:
        frames, total = reader.read(path, max_frames)
        metrics = [frame_metrics(f) for f in frames]
        viewpoint = classify(frames, min_visibility)
        segments = reps_mod.segment(frames, metrics, min_visibility)
        coverage = len(frames) / max(total, 1)

        notes.append(f"{path.name}: góc {LABEL_VI.get(viewpoint, viewpoint)}, {len(segments)} rep.")
        if coverage < 0.6:
            notes.append(
                f"{path.name}: chỉ {int(coverage * 100)}% khung hình thấy người rõ — "
                f"kết quả kém tin cậy hơn bình thường.")
        if segments:
            clips.append(AnalyzedClip(path, viewpoint, frames, metrics, segments, coverage))

    if not clips:
        raise PoseError(
            "Không tách được rep nào từ các clip đã gửi. Thực hiện 3–5 lần liên tục, "
            "hạ xuống rõ ràng rồi đứng lên, và quay lại.",
            "NO_REPS")

    results = [_score(check, clips) for check in checks]
    pick_primary(results, {c.id: c for c in checks})
    return results, notes


def _score(check, clips: list[AnalyzedClip]) -> dict[str, Any]:
    usable = [c for c in clips if c.viewpoint in check.valid_viewpoints]
    if not usable:
        # Góc thực tế của clip đầu tiên là thứ người dùng cần biết để quay lại.
        return score_check(check, clips[0].viewpoint, [])

    measure = METRICS[check.metric]
    measurements: list[RepMeasurement] = []
    for clip in usable:
        for rep in clip.reps:
            measurements.append(RepMeasurement(
                value=measure(rep, clip.frames, clip.metrics),
                confidence=_rep_confidence(clip, rep),
            ))
    return score_check(check, usable[0].viewpoint, measurements)


def _rep_confidence(clip: AnalyzedClip, rep) -> float:
    """Độ tin cậy của rep = visibility thấp nhất trong hai frame thật sự dùng để đo."""
    return float(min(
        np.min(clip.frames[rep.start].vis[CORE_JOINTS]),
        np.min(clip.frames[rep.bottom].vis[CORE_JOINTS]),
    ))


__all__ = ["analyze_request", "AnalyzedClip", "NOT_APPLICABLE"]

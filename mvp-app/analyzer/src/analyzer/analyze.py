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
from .pipeline.pose import PoseError, PoseReader
from .pipeline.reps import SQUAT_SIGNAL, RepSignal
from .pipeline.viewpoint import classify
from .viewpoints import LABEL_VI
from .scoring import NOT_APPLICABLE, RepMeasurement, pick_primary, score_check


@dataclass
class AnalyzedClip:
    name: str
    viewpoint: str
    frames: list
    metrics: list
    reps: list
    coverage: float
    signal: RepSignal


def analyze_request(
    clip_paths: list[Path],
    checks: list,
    reader: PoseReader,
    min_visibility: float,
    max_frames: int,
    signal: RepSignal = SQUAT_SIGNAL,
) -> tuple[list[dict[str, Any]], list[str]]:
    """Đọc clip từ file rồi chấm. Trả (results, notes). Ném PoseError nếu không clip nào dùng được."""
    clips, totals, names = [], [], []
    for path in clip_paths:
        frames, total = reader.read(path, max_frames)
        clips.append(frames)
        totals.append(total)
        names.append(path.name)
    results, notes, _ = analyze_frames(clips, checks, min_visibility, signal, names, totals)
    return results, notes


def analyze_frames(
    clips: list[list],
    checks: list,
    min_visibility: float,
    signal: RepSignal = SQUAT_SIGNAL,
    names: list[str] | None = None,
    totals: list[int] | None = None,
) -> tuple[list[dict[str, Any]], list[str], list[AnalyzedClip]]:
    """Ruột của pipeline: chuỗi Frame đã có (từ file hoặc từ trình duyệt) → (results, notes, clips).

    `totals` = tổng frame đã đọc mỗi clip (để tính độ phủ); thiếu thì coi mọi frame đều thấy người.
    `clips` trả về chỉ gồm clip tách được rep — góc quay và số rep của từng clip cho UI.
    """
    for check in checks:
        if check.metric not in METRICS:
            raise UnknownMetricError(check.metric)

    analyzed: list[AnalyzedClip] = []
    notes: list[str] = []
    for i, frames in enumerate(clips):
        name = names[i] if names else f"clip {i + 1}"
        total = totals[i] if totals else len(frames)
        metrics = [frame_metrics(f) for f in frames]
        viewpoint = classify(frames, min_visibility)
        segments = reps_mod.segment(frames, metrics, min_visibility, signal)
        coverage = len(frames) / max(total, 1)

        notes.append(f"{name}: góc {LABEL_VI.get(viewpoint, viewpoint)}, {len(segments)} rep.")
        if coverage < 0.6:
            notes.append(
                f"{name}: chỉ {int(coverage * 100)}% khung hình thấy người rõ — "
                f"kết quả kém tin cậy hơn bình thường.")
        if segments:
            analyzed.append(AnalyzedClip(name, viewpoint, frames, metrics, segments, coverage, signal))

    if not analyzed:
        raise PoseError(
            "Không tách được rep nào từ các clip đã gửi. Thực hiện 3–5 lần liên tục, "
            "hạ xuống rõ ràng rồi trở lại tư thế đầu, và quay lại.",
            "NO_REPS")

    results = [_score(check, analyzed) for check in checks]
    pick_primary(results, {c.id: c for c in checks})
    return results, notes, analyzed


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
    joints = clip.signal.core_joints
    return float(min(
        np.min(clip.frames[rep.start].vis[joints]),
        np.min(clip.frames[rep.bottom].vis[joints]),
    ))


__all__ = ["analyze_request", "analyze_frames", "AnalyzedClip", "NOT_APPLICABLE"]

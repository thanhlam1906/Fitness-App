# -*- coding: utf-8 -*-
"""Một job chấm form — doc/design-cham-form-nguong-v1.md §6.

clip (.json từ màn camera, hoặc video) → tách rep chung → bộ số → so với ngưỡng admin nhập
(form_checks) → lưu. Tách khỏi __main__.py để test bằng Db giả: file này không import psycopg.

Ném exception = lỗi tạm (mạng, DB): vòng poll requeue, tối đa 3 lần.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

from .pipeline.features import view_features
from .pipeline.geometry import frame_metrics
from .pipeline.pose import Frame, PoseError
from .pipeline.reps import segment_generic
from .pipeline.viewpoint import classify
from .scoring import grade_check, pick_primary
from .viewpoints import DIAGONAL, FRONTAL, SAGITTAL

log = logging.getLogger("analyzer")
_VIEWS = {SAGITTAL, FRONTAL, DIAGONAL}


def process(job, db, storage, reader, cfg) -> None:
    features = job.features
    if features is None:
        try:
            features = _features(db.load_clips(job.id), storage, reader, cfg)
        except PoseError as e:
            # Clip không dùng được: người dùng tập/quay lại, không phải lỗi hệ thống.
            db.mark_rejected(job.id, e.reject_reason, e.message)
            delete_clips(db, storage, job.id)
            return
        db.save_features(job.id, features)
    # Có bộ số rồi thì clip hết việc: xoá ngay (N2).
    delete_clips(db, storage, job.id)

    # Không có bài: yêu cầu gửi từ màn camera cũ, hồi LLM còn đoán bài (trước 10-05).
    checks = db.load_form_checks(job.exercise_id) if job.exercise_id else []
    if not checks:
        db.mark_failed(job.id, "Bài này chưa có tiêu chí chấm.")
        return
    rows = [grade_check(c, features) for c in checks]
    pick_primary(rows, {c.id: c for c in checks})
    db.save_results(job.id, rows)
    db.mark_done(job.id)
    log.info("Chấm xong %s: %s", job.id, ", ".join(f"{r['name_vi']}={r['verdict']}" for r in rows))


def delete_clips(db, storage, request_id: str) -> None:
    """N2: xoá mọi clip chưa xoá của request, ở mọi nhánh kết thúc. Gọi lại nhiều lần vô hại."""
    for clip in db.load_clips(request_id):
        try:
            storage.delete(clip.storage_key)
        except OSError:
            log.exception("Không xoá được clip %s — ClipCleanupJob sẽ dọn sau", clip.storage_key)
        db.mark_clip_deleted(clip.id)


def _features(clips, storage, reader, cfg) -> dict:
    views = []
    for n, clip in enumerate(clips, start=1):
        path = storage.path_of(clip.storage_key)
        frames = read_landmarks(path) if path.suffix == ".json" else reader.read(path, cfg.max_frames)[0]
        metrics = [frame_metrics(f) for f in frames]
        seg = segment_generic(frames, metrics, cfg.min_visibility)
        # Góc màn camera đã xác nhận lúc đếm rep đáng tin hơn phân loại lại trên cả clip: lúc
        # ngồi xuống tỉ lệ vai/thân trên ảnh đổi và có thể ra "chéo". Clip gửi tay không ghi góc
        # thì mới phân loại.
        view = clip.viewpoint if clip.viewpoint in _VIEWS else classify(frames, cfg.min_visibility)
        # Góc đã quay mà không tách được rep vẫn ghi lại: chấm ra LOW_CONFIDENCE ("quay lại rõ
        # hơn") thay vì NOT_APPLICABLE ("chưa quay góc này").
        views.append(view_features(n, view, frames, metrics, seg) if seg.reps else
                     {"clip": n, "view": view, "dominant": seg.joint,
                      "reps_total": 0, "reps_used": 0, "reps": []})
    if not any(v["reps_total"] for v in views):
        raise PoseError("Không tách được rep nào. Làm 5 rep liên tục, đi hết biên độ rồi trở về "
                        "tư thế đầu, và thử lại.", "NO_REPS")
    if not any(v["reps_used"] for v in views):
        raise PoseError("Không nhìn rõ người trong các rep. Đủ sáng, cả người trong khung, rồi "
                        "thử lại.", "LOW_VISIBILITY")
    return {"views": views}


def read_landmarks(path: Path) -> list[Frame]:
    """File .json màn camera gửi: {"frames": [{norm 33×3, vis 33, world 33×3} | null]}. Frame
    sai shape coi như không thấy người, như `_frames_from_json` của demo."""
    try:
        items = json.loads(path.read_text(encoding="utf-8"))["frames"]
    except (OSError, ValueError, KeyError, TypeError) as e:
        raise PoseError("Không đọc được dữ liệu gửi lên. Thử lại.", "UNREADABLE") from e
    if not isinstance(items, list):
        raise PoseError("Không đọc được dữ liệu gửi lên. Thử lại.", "UNREADABLE")
    frames = []
    for i, item in enumerate(items):
        try:
            norm = np.asarray(item["norm"], dtype=float)
            vis = np.asarray(item["vis"], dtype=float)
            world = np.asarray(item["world"], dtype=float)
        except (TypeError, KeyError, ValueError):
            continue
        if norm.shape == (33, 3) and vis.shape == (33,) and world.shape == (33, 3):
            frames.append(Frame(index=i, norm=norm, vis=vis, world=world))
    if not frames:
        raise PoseError("Không thấy người trong khung hình. Đứng cả người trong khung, đủ sáng.",
                        "LOW_VISIBILITY")
    return frames

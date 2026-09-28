# -*- coding: utf-8 -*-
"""Một job chấm form — doc/design-cham-form-llm-v1.md §4.

clip (.json từ màn camera, hoặc video) → tách rep chung → bộ số → LLM nhận diện bài → LLM chấm
→ judge.py kiểm → lưu. Tách khỏi __main__.py để test bằng Db/LLM giả: file này không import
psycopg hay httpx.

Ném exception = lỗi tạm (mạng, LLM trả rác): vòng poll requeue, tối đa 3 lần.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path

import numpy as np

from .judge import judgment_messages, parse_recognition, recognition_messages, validate_judgment
from .pipeline.features import view_features
from .pipeline.geometry import frame_metrics
from .pipeline.pose import Frame, PoseError
from .pipeline.reps import segment_generic
from .pipeline.viewpoint import classify

log = logging.getLogger("analyzer")
_CANDIDATE_FIELDS = ("slug", "name_vi", "name_en", "description", "muscle_groups", "equipment")


def process(job, db, storage, reader, llm, cfg) -> None:
    if not llm.enabled:
        db.mark_failed(job.id, "Chấm form chưa được cấu hình (thiếu OPENAI_API_KEY).")
        delete_clips(db, storage, job.id)
        return

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
    # Có bộ số rồi thì clip hết việc: xoá ngay, không đợi LLM (N2).
    delete_clips(db, storage, job.id)

    exercise_id = job.exercise_id
    if exercise_id is None:
        exercise_id = _recognize(llm, features, db.load_candidates())
        if exercise_id is None:
            db.mark_rejected(job.id, "UNKNOWN_EXERCISE", "Chưa nhận ra bài bạn tập.")
            return
        db.set_exercise(job.id, exercise_id)

    exercise = db.load_exercise(exercise_id)
    rows = validate_judgment(llm.ask_json(judgment_messages(exercise, features)), features, exercise)
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


def _recognize(llm, features: dict, candidates: list[dict]) -> str | None:
    """exercise_id của bài LLM chọn, hoặc None khi LLM không nhận ra."""
    ids = {c["slug"]: c["id"] for c in candidates}
    public = [{k: c[k] for k in _CANDIDATE_FIELDS} for c in candidates]
    slug = parse_recognition(llm.ask_json(recognition_messages(features, public)), set(ids))
    return ids.get(slug) if slug else None


def _features(clips, storage, reader, cfg) -> dict:
    views = []
    for n, clip in enumerate(clips, start=1):
        path = storage.path_of(clip.storage_key)
        frames = read_landmarks(path) if path.suffix == ".json" else reader.read(path, cfg.max_frames)[0]
        metrics = [frame_metrics(f) for f in frames]
        seg = segment_generic(frames, metrics, cfg.min_visibility)
        view = classify(frames, cfg.min_visibility)
        # Góc đã quay mà không tách được rep vẫn ghi lại: LLM cần phân biệt "chưa quay"
        # (NOT_APPLICABLE) với "quay rồi nhưng không dùng được" (LOW_CONFIDENCE).
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

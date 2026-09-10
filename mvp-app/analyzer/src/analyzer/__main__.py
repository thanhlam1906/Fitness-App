# -*- coding: utf-8 -*-
"""Vòng poll: claim → process → sleep.

Analyzer không nhận HTTP và không gọi ngược Spring Boot. Nó chỉ nói chuyện với
Postgres và với thư mục clip (concept-analyzer-v1.md §1).

ponytail: không có health endpoint. Sống hay chết xem bằng `docker ps`, log,
và cột started_at của job đang PROCESSING. Thêm endpoint khi thật sự có hệ
thống giám sát cần tới — 100 tester thì chưa.

Chạy:  DB_URL=... CLIP_STORAGE_PATH=... python -m analyzer
"""
from __future__ import annotations

import logging
import signal
import sys
import time

from . import config as config_mod
from .advisor import Advisor
from .analyze import analyze_request
from .db import Db, Job
from .pipeline.metrics import UnknownMetricError
from .pipeline.pose import PoseError, PoseReader
from .storage import ClipStorage

log = logging.getLogger("analyzer")

_running = True


def _stop(*_args) -> None:
    global _running
    _running = False
    log.info("Nhận tín hiệu dừng — kết thúc sau job hiện tại.")


def process(job: Job, db: Db, storage: ClipStorage, reader: PoseReader,
            advisor: Advisor, cfg) -> None:
    clips = db.load_clips(job.id)
    if not clips:
        db.mark_failed(job.id, "Yêu cầu không có clip nào chưa xoá.")
        return

    checks = db.load_form_checks(job.exercise_id)
    if not checks:
        db.mark_failed(job.id, "Bài này chưa có form_checks đang bật — admin cần cấu hình.")
        _delete_clips(db, storage, clips)
        return

    paths = [storage.path_of(c.storage_key) for c in clips]
    try:
        results, notes = analyze_request(paths, checks, reader, cfg.min_visibility, cfg.max_frames)
    except PoseError as e:
        # Clip sai góc / không đủ điều kiện: người dùng quay lại, không phải lỗi hệ thống.
        db.mark_rejected(job.id, e.reject_reason, e.message)
        _delete_clips(db, storage, clips)
        return
    except UnknownMetricError as e:
        # Lỗi cấu hình: KHÔNG âm thầm bỏ qua check, để admin nhìn thấy ngay.
        db.mark_failed(job.id, str(e))
        _delete_clips(db, storage, clips)
        return

    advisor.rewrite_primary_cue(job.exercise_name, results)
    db.save_results(job.id, results)
    db.mark_done(job.id)
    _delete_clips(db, storage, clips)
    log.info("Chấm xong %s: %s | %s", job.id,
             ", ".join(f"{r['code']}={r['verdict']}" for r in results), " ".join(notes))


def _delete_clips(db: Db, storage: ClipStorage, clips) -> None:
    """N2: xoá NGAY sau khi chấm xong, kể cả khi FAILED. Không có ngoại lệ 'để debug'."""
    for clip in clips:
        try:
            storage.delete(clip.storage_key)
        except OSError:
            log.exception("Không xoá được clip %s — ClipCleanupJob sẽ dọn sau", clip.storage_key)
        db.mark_clip_deleted(clip.id)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    cfg = config_mod.load()
    db = Db(cfg.db_url)
    storage = ClipStorage(cfg.clip_storage_path)
    reader = PoseReader(cfg.pose_model)
    advisor = Advisor(cfg.llm_api_key, cfg.llm_base_url, cfg.llm_model)
    log.info("Analyzer sẵn sàng (model=%s, diễn giải LLM=%s)",
             cfg.pose_model, "bật" if advisor.enabled else "tắt")

    try:
        while _running:
            job = db.claim_job()
            if job is None:
                time.sleep(cfg.poll_interval_sec)
                continue
            try:
                process(job, db, storage, reader, advisor, cfg)
            except Exception:
                # Chưa hết lượt thử thì trả về hàng đợi; hết thì để job dọn bên
                # Spring Boot chuyển sang FAILED (attempts >= 3).
                log.exception("Job %s lỗi (lần thử %s)", job.id, job.attempts)
                if job.attempts < 3:
                    db.requeue(job.id)
                else:
                    db.mark_failed(job.id, "Chấm không thành công sau 3 lần thử.")
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

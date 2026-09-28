# -*- coding: utf-8 -*-
"""Vòng poll: claim → process → sleep.

Analyzer không nhận HTTP và không gọi ngược Spring Boot. Nó chỉ nói chuyện với
Postgres và với thư mục clip (concept-analyzer-v1.md §1). Một job làm gì: worker.py.

ponytail: không có health endpoint. Sống hay chết xem bằng `docker ps`, log,
và cột started_at của job đang PROCESSING. Thêm endpoint khi thật sự có hệ
thống giám sát cần tới — 100 tester thì chưa.

Chạy:  DB_URL=... CLIP_STORAGE_PATH=... OPENAI_API_KEY=... python -m analyzer
"""
from __future__ import annotations

import logging
import signal
import sys
import time

from . import config as config_mod
from .db import Db
from .llm import LlmClient
from .pipeline.pose import PoseReader
from .storage import ClipStorage
from .worker import delete_clips, process

log = logging.getLogger("analyzer")

_running = True


def _stop(*_args) -> None:
    global _running
    _running = False
    log.info("Nhận tín hiệu dừng — kết thúc sau job hiện tại.")


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    cfg = config_mod.load()
    db = Db(cfg.db_url)
    storage = ClipStorage(cfg.clip_storage_path)
    reader = PoseReader(cfg.pose_model)
    llm = LlmClient(cfg.llm_api_key, cfg.llm_base_url, cfg.llm_model)
    log.info("Analyzer sẵn sàng (model pose=%s, LLM=%s)", cfg.pose_model,
             cfg.llm_model if llm.enabled else "CHƯA CẤU HÌNH, mọi job sẽ FAILED")

    try:
        while _running:
            job = db.claim_job()
            if job is None:
                time.sleep(cfg.poll_interval_sec)
                continue
            try:
                process(job, db, storage, reader, llm, cfg)
            except Exception:
                # Chưa hết lượt thử thì trả về hàng đợi; hết thì FAILED và xoá clip ngay
                # (N2 kể cả khi chấm lỗi), không đợi ClipCleanupJob.
                log.exception("Job %s lỗi (lần thử %s)", job.id, job.attempts)
                if job.attempts < 3:
                    db.requeue(job.id)
                else:
                    db.mark_failed(job.id, "Chấm không thành công sau 3 lần thử.")
                    delete_clips(db, storage, job.id)
    finally:
        db.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())

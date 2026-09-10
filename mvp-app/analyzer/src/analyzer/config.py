# -*- coding: utf-8 -*-
"""Đọc thẳng os.environ, fail-fast nếu thiếu biến bắt buộc.

D1 của concept-analyzer-v1.md §0.1: demo import `dotenv` mà không khai trong
requirements. Bản thật bỏ hẳn dotenv — docker-compose tự nạp `.env`.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

_REQUIRED = ("DB_URL", "CLIP_STORAGE_PATH")


@dataclass(frozen=True)
class Config:
    db_url: str
    clip_storage_path: Path
    pose_model: str
    poll_interval_sec: float
    min_visibility: float
    max_frames: int
    llm_api_key: str | None
    llm_base_url: str
    llm_model: str


def load() -> Config:
    missing = [name for name in _REQUIRED if not os.environ.get(name)]
    if missing:
        raise SystemExit(f"Thiếu biến môi trường bắt buộc: {', '.join(missing)}")

    return Config(
        # libpq URI, ví dụ postgresql://fitness:...@localhost:55432/fitness
        db_url=os.environ["DB_URL"],
        clip_storage_path=Path(os.environ["CLIP_STORAGE_PATH"]),
        pose_model=os.environ.get("POSE_MODEL", "full"),
        poll_interval_sec=float(os.environ.get("POLL_INTERVAL_SEC", "5")),
        # A2 concept-analyzer-v1.md §11 — số khởi điểm, phải đo lại trên bộ clip.
        min_visibility=float(os.environ.get("MIN_VISIBILITY", "0.5")),
        max_frames=int(os.environ.get("MAX_FRAMES", "900")),
        # Thiếu key thì lớp diễn giải tắt, hệ thống chạy bằng text của rule.
        llm_api_key=os.environ.get("DEEPSEEK_API_KEY") or None,
        llm_base_url=os.environ.get("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        llm_model=os.environ.get("DEEPSEEK_MODEL", "deepseek-chat"),
    )

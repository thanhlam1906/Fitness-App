# -*- coding: utf-8 -*-
"""Chấm một hoặc vài clip bằng tay, không qua hàng đợi — để hiệu chỉnh ngưỡng.

    python -m analyzer.cli --exercise barbell-back-squat clip1.mp4 clip2.mp4

Ngưỡng vẫn đọc từ DB, đúng như worker: hiệu chỉnh bằng ngưỡng khác với ngưỡng
chạy thật thì vòng lặp "chỉnh ngưỡng → chấm lại → so sánh" là vô nghĩa.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from . import config as config_mod
from .analyze import analyze_request
from .db import Db
from .pipeline.pose import PoseError, PoseReader


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Chấm form một clip, in kết quả ra stdout")
    parser.add_argument("--exercise", required=True, help="slug của bài, vd barbell-back-squat")
    parser.add_argument("clips", nargs="+", type=Path)
    args = parser.parse_args(argv)

    cfg = config_mod.load()
    db = Db(cfg.db_url)
    try:
        with db._conn.cursor() as cur:  # noqa: SLF001 — CLI nội bộ, không dựng thêm API cho một câu
            cur.execute("SELECT id FROM exercises WHERE slug = %s", (args.exercise,))
            row = cur.fetchone()
        if row is None:
            print(f"Không có bài nào slug = {args.exercise}", file=sys.stderr)
            return 2
        checks = db.load_form_checks(str(row["id"]))
        if not checks:
            print(f"Bài {args.exercise} chưa có form_checks đang bật", file=sys.stderr)
            return 2

        reader = PoseReader(cfg.pose_model)
        try:
            results, notes = analyze_request(
                args.clips, checks, reader, cfg.min_visibility, cfg.max_frames)
        except PoseError as e:
            print(json.dumps({"rejected": e.reject_reason, "message": e.message},
                             ensure_ascii=False, indent=2))
            return 1
        print(json.dumps({"notes": notes, "results": results}, ensure_ascii=False, indent=2))
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())

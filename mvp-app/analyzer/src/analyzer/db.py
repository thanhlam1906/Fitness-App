# -*- coding: utf-8 -*-
"""Sáu câu SQL, không hơn (concept-analyzer-v1.md §4).

Hàng đợi là một bảng. `FOR UPDATE SKIP LOCKED` cho phép chạy nhiều analyzer
song song mà không sửa gì và không cần broker (concept-backend-v1.md §8).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Iterable

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Json


@dataclass(frozen=True)
class Job:
    id: str
    user_id: str
    exercise_id: str
    exercise_name: str
    attempts: int


@dataclass(frozen=True)
class FormCheck:
    id: str
    code: str
    metric: str
    valid_viewpoints: list[str]
    thresholds: dict[str, Any]
    confidence_min: float
    cue_pass_vi: str | None
    cue_warn_vi: str | None
    cue_fail_vi: str
    priority: int


@dataclass(frozen=True)
class Clip:
    id: str
    storage_key: str
    viewpoint: str | None


class Db:
    def __init__(self, db_url: str):
        self._conn = psycopg.connect(db_url, autocommit=True, row_factory=dict_row)

    def close(self) -> None:
        self._conn.close()

    def claim_job(self) -> Job | None:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                UPDATE video_review_requests
                   SET status = 'PROCESSING', started_at = now(), attempts = attempts + 1
                 WHERE id = (SELECT id FROM video_review_requests
                              WHERE status = 'PENDING'
                              ORDER BY created_at
                              FOR UPDATE SKIP LOCKED
                              LIMIT 1)
                RETURNING id, user_id, exercise_id, attempts
                """
            )
            row = cur.fetchone()
            if row is None:
                return None
            # Ten bai lay kem trong cung mot vong, khong them mot query rieng.
            cur.execute(
                "SELECT coalesce(name_vi, name_en) AS name FROM exercises WHERE id = %s",
                (row["exercise_id"],))
            name_row = cur.fetchone()
        return Job(str(row["id"]), str(row["user_id"]), str(row["exercise_id"]),
                   (name_row or {}).get("name") or "", row["attempts"])

    def load_form_checks(self, exercise_id: str) -> list[FormCheck]:
        with self._conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, code, metric, valid_viewpoints, thresholds, confidence_min,
                       cue_pass_vi, cue_warn_vi, cue_fail_vi, priority
                  FROM form_checks
                 WHERE exercise_id = %s AND is_active
                 ORDER BY priority
                """,
                (exercise_id,),
            )
            rows = cur.fetchall()
        return [
            FormCheck(
                id=str(r["id"]),
                code=r["code"],
                metric=r["metric"],
                valid_viewpoints=list(r["valid_viewpoints"]),
                thresholds=r["thresholds"],
                confidence_min=float(r["confidence_min"]),
                cue_pass_vi=r["cue_pass_vi"],
                cue_warn_vi=r["cue_warn_vi"],
                cue_fail_vi=r["cue_fail_vi"],
                priority=int(r["priority"]),
            )
            for r in rows
        ]

    def load_clips(self, request_id: str) -> list[Clip]:
        with self._conn.cursor() as cur:
            cur.execute(
                "SELECT id, storage_key, viewpoint FROM video_clips "
                "WHERE request_id = %s AND deleted_at IS NULL ORDER BY uploaded_at",
                (request_id,),
            )
            rows = cur.fetchall()
        return [Clip(str(r["id"]), r["storage_key"], r["viewpoint"]) for r in rows]

    def save_results(self, request_id: str, results: Iterable[dict[str, Any]]) -> None:
        """Ghi lại từ đầu mỗi lần chấm — lần thử thứ 2 không để lại kết quả cũ nửa vời."""
        with self._conn.transaction(), self._conn.cursor() as cur:
            cur.execute("DELETE FROM review_results WHERE request_id = %s", (request_id,))
            for r in results:
                cur.execute(
                    """
                    INSERT INTO review_results
                      (request_id, form_check_id, verdict, confidence, measured, cue_text_vi, is_primary)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """,
                    (
                        request_id,
                        r["form_check_id"],
                        r["verdict"],
                        r["confidence"],
                        Json(r["measured"]),
                        r["cue_text_vi"],
                        r["is_primary"],
                    ),
                )

    def mark_done(self, request_id: str) -> None:
        self._finish(request_id, "DONE", error=None, reject_reason=None)

    def mark_failed(self, request_id: str, error: str) -> None:
        self._finish(request_id, "FAILED", error=error[:500], reject_reason=None)

    def mark_rejected(self, request_id: str, reason: str, message: str) -> None:
        """Clip sai góc / không đủ điều kiện: người dùng quay lại, không phải lỗi hệ thống."""
        self._finish(request_id, "REJECTED", error=message[:500], reject_reason=reason)

    def mark_clip_deleted(self, clip_id: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute("UPDATE video_clips SET deleted_at = now() WHERE id = %s", (clip_id,))

    def requeue(self, request_id: str) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                "UPDATE video_review_requests SET status = 'PENDING', started_at = NULL WHERE id = %s",
                (request_id,),
            )

    def _finish(self, request_id: str, status: str, error: str | None, reject_reason: str | None) -> None:
        with self._conn.cursor() as cur:
            cur.execute(
                "UPDATE video_review_requests "
                "SET status = %s, error = %s, reject_reason = %s, finished_at = now() WHERE id = %s",
                (status, error, reject_reason, request_id),
            )

# -*- coding: utf-8 -*-
"""Kiểm một job chấm form bằng Db và kho clip giả — doc/design-cham-form-nguong-v1.md §10.

Cần numpy + mediapipe (pipeline import), KHÔNG cần psycopg, DB hay mạng: worker.py cố ý không
import db.py.

    mvp-app/analyzer-demo/.venv/Scripts/python.exe mvp-app/analyzer/tests/test_worker.py
"""
from __future__ import annotations

import json
import sys
import tempfile
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent))
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from synth import clip, squat_frame  # noqa: E402
from analyzer.worker import process  # noqa: E402

CFG = SimpleNamespace(min_visibility=0.5, max_frames=900)


def check(id, view, metric, to, priority, name):
    return SimpleNamespace(id=id, code=f"{view}-{metric}-PEAK", name_vi=name, metric=metric,
                           moment="PEAK", valid_viewpoints=[view],
                           thresholds={"from": None, "to": to, "warn": 5},
                           cue_fail_vi=f"Sửa: {name}.", priority=priority)


DEPTH = check("depth", "SAGITTAL", "knee", 100, 1, "Ngồi đủ sâu")
VALGUS = check("valgus", "FRONTAL", "valgus", 10, 2, "Gối không chụm")


class FakeDb:
    def __init__(self, clips, checks=(DEPTH, VALGUS)):
        self.clips, self.checks, self.deleted = clips, list(checks), set()
        self.features = self.rows = self.status = None

    def load_clips(self, request_id):
        return [c for c in self.clips if c.id not in self.deleted]

    def mark_clip_deleted(self, clip_id):
        self.deleted.add(clip_id)

    def save_features(self, request_id, features):
        self.features = features

    def load_form_checks(self, exercise_id):
        return self.checks

    def save_results(self, request_id, rows):
        self.rows = rows

    def mark_done(self, request_id):
        self.status = ("DONE",)

    def mark_failed(self, request_id, error):
        self.status = ("FAILED", error)

    def mark_rejected(self, request_id, reason, message):
        self.status = ("REJECTED", reason)


class FakeStorage:
    def __init__(self, root: Path):
        self.root = root

    def path_of(self, key):
        return self.root / key

    def delete(self, key):
        (self.root / key).unlink(missing_ok=True)


class NoReader:
    def read(self, path, max_frames):
        raise AssertionError("clip .json không được đọc bằng PoseReader")


def landmarks_json(frames) -> str:
    return json.dumps({"frames": [{"norm": f.norm.tolist(), "vis": f.vis.tolist(),
                                   "world": f.world.tolist()} for f in frames]})


def setup(root: Path, files: dict, checks=(DEPTH, VALGUS)):
    """files: tên file → (nội dung, góc màn camera ghi kèm hoặc None)."""
    clips = []
    for n, (name, (text, view)) in enumerate(files.items(), start=1):
        (root / name).write_text(text, encoding="utf-8")
        clips.append(SimpleNamespace(id=f"c{n}", storage_key=name, viewpoint=view))
    return FakeDb(clips, checks), FakeStorage(root)


def job(**overrides):
    return SimpleNamespace(**{"id": "r1", "exercise_id": "ex-squat", "attempts": 1,
                              "features": None, **overrides})


SIDE = landmarks_json(clip(squat_frame, view="side"))
FRONT_VALGUS = landmarks_json(clip(squat_frame, view="frontal", valgus=0.12))


def test_two_views_graded_and_clips_deleted():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        db, storage = setup(root, {"sagittal.json": (SIDE, "SAGITTAL"),
                                   "frontal.json": (FRONT_VALGUS, "FRONTAL")})
        process(job(), db, storage, NoReader(), CFG)
        assert db.status == ("DONE",)
        by = {r["form_check_id"]: r for r in db.rows}
        assert by["depth"]["verdict"] == "PASS" and by["valgus"]["verdict"] == "FAIL"
        assert by["valgus"]["is_primary"] and not by["depth"]["is_primary"]
        assert by["valgus"]["measured"]["worst"]["value"] > 10
        assert db.deleted == {"c1", "c2"} and not any(root.iterdir())


def test_missing_view_not_applicable():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"sagittal.json": (SIDE, "SAGITTAL")})
        process(job(), db, storage, NoReader(), CFG)
        assert {r["form_check_id"]: r["verdict"] for r in db.rows} == {
            "depth": "PASS", "valgus": "NOT_APPLICABLE"}


def test_declared_view_wins_over_classification():
    # Màn camera đã xác nhận góc lúc đếm rep; server không phân loại lại.
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"a.json": (SIDE, "FRONTAL")})
        process(job(), db, storage, NoReader(), CFG)
        assert db.features["views"][0]["view"] == "FRONTAL"


def test_undeclared_view_is_classified():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"a.json": (SIDE, None)})
        process(job(), db, storage, NoReader(), CFG)
        assert db.features["views"][0]["view"] == "SAGITTAL"


def test_no_active_checks_fails_after_deleting_clips():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        db, storage = setup(root, {"sagittal.json": (SIDE, "SAGITTAL")}, checks=())
        process(job(), db, storage, NoReader(), CFG)
        assert db.status == ("FAILED", "Bài này chưa có tiêu chí chấm.")
        assert db.deleted == {"c1"} and not any(root.iterdir())


def test_request_without_exercise_fails():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"sagittal.json": (SIDE, "SAGITTAL")})
        process(job(exercise_id=None), db, storage, NoReader(), CFG)
        assert db.status == ("FAILED", "Bài này chưa có tiêu chí chấm.")


def test_regrade_from_stored_features_needs_no_clips():
    with tempfile.TemporaryDirectory() as d:
        first, storage = setup(Path(d), {"sagittal.json": (SIDE, "SAGITTAL")})
        process(job(), first, storage, NoReader(), CFG)
    again = FakeDb([])
    process(job(features=first.features), again, None, NoReader(), CFG)
    assert again.status == ("DONE",) and again.features is None   # không tính lại, không ghi đè


def test_unreadable_json_rejected_and_deleted():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"sagittal.json": ("khong phai json", "SAGITTAL")})
        process(job(), db, storage, NoReader(), CFG)
        assert db.status == ("REJECTED", "UNREADABLE") and db.deleted == {"c1"}


def test_standing_still_rejected_no_reps():
    with tempfile.TemporaryDirectory() as d:
        still = landmarks_json([squat_frame(i, 0.0) for i in range(60)])
        db, storage = setup(Path(d), {"sagittal.json": (still, "SAGITTAL")})
        process(job(), db, storage, NoReader(), CFG)
        assert db.status == ("REJECTED", "NO_REPS") and db.deleted == {"c1"}


def test_clip_without_reps_is_low_confidence_not_missing():
    # Góc đã quay mà không tách được rep: "quay lại rõ hơn", không phải "chưa quay góc này".
    with tempfile.TemporaryDirectory() as d:
        still = landmarks_json([squat_frame(i, 0.0, view="frontal") for i in range(60)])
        db, storage = setup(Path(d), {"sagittal.json": (SIDE, "SAGITTAL"),
                                      "frontal.json": (still, "FRONTAL")})
        process(job(), db, storage, NoReader(), CFG)
        assert db.status == ("DONE",)
        assert {r["form_check_id"]: r["verdict"] for r in db.rows}["valgus"] == "LOW_CONFIDENCE"


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("OK", name)

# -*- coding: utf-8 -*-
"""Kiểm một job chấm form bằng Db, kho clip và LLM giả — doc/design-cham-form-llm-v1.md §8.

Cần numpy + mediapipe (pipeline import), KHÔNG cần psycopg, httpx, DB hay mạng: worker.py cố ý
không import db.py và llm.py.

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
from analyzer.judge import LlmError  # noqa: E402
from analyzer.worker import process  # noqa: E402

CANDIDATES = [{"id": "ex-squat", "slug": "bodyweight-squat", "name_vi": "Squat tay không",
               "name_en": "Bodyweight Squat", "description": "Hạ hông tới khi đùi ngang sàn.",
               "muscle_groups": ["QUADS"], "equipment": []}]
EXERCISE = {"name_vi": "Squat tay không", "name_en": "Bodyweight Squat",
            "description": "Hạ hông tới khi đùi ngang sàn.", "steps_vi": [], "mistakes_vi": []}
CFG = SimpleNamespace(min_visibility=0.5, max_frames=900)
RECOGNIZED = '{"exercise": "bodyweight-squat"}'


class FakeDb:
    def __init__(self, clips):
        self.clips, self.deleted = clips, set()
        self.features = self.exercise_id = self.rows = self.status = None

    def load_clips(self, request_id):
        return [c for c in self.clips if c.id not in self.deleted]

    def mark_clip_deleted(self, clip_id):
        self.deleted.add(clip_id)

    def save_features(self, request_id, features):
        self.features = features

    def load_candidates(self):
        return CANDIDATES

    def set_exercise(self, request_id, exercise_id):
        self.exercise_id = exercise_id

    def load_exercise(self, exercise_id):
        return EXERCISE

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


class FakeLlm:
    """Mỗi lần gọi lấy một câu trả lời: chuỗi, hoặc hàm nhận messages trả chuỗi."""

    def __init__(self, *answers, enabled=True):
        self.answers, self.enabled, self.calls = list(answers), enabled, []

    def ask_json(self, messages):
        self.calls.append(messages)
        answer = self.answers.pop(0)
        return answer(messages) if callable(answer) else answer


class NoReader:
    def read(self, path, max_frames):
        raise AssertionError("clip .json không được đọc bằng PoseReader")


def cite_first_rep(messages):
    """Câu trả lời chấm hợp lệ: trỏ đúng ô đầu tiên của bộ số LLM vừa nhận."""
    view = json.loads(messages[1]["content"])["features"]["views"][0]
    rep = view["reps"][0]
    return json.dumps({"items": [{
        "name_vi": "Độ sâu", "verdict": "FAIL", "cue_vi": "Hạ hông thấp hơn.",
        "evidence": [{"clip": view["clip"], "rep": rep["rep"], "feature": "hip_l_P",
                      "value": rep["hip_l_P"]}]}], "primary": "Độ sâu"}, ensure_ascii=False)


def landmarks_json(frames) -> str:
    return json.dumps({"frames": [{"norm": f.norm.tolist(), "vis": f.vis.tolist(),
                                   "world": f.world.tolist()} for f in frames]})


def setup(root: Path, files: dict[str, str]):
    clips = []
    for n, (name, text) in enumerate(files.items(), start=1):
        (root / name).write_text(text, encoding="utf-8")
        clips.append(SimpleNamespace(id=f"c{n}", storage_key=name, viewpoint=None))
    return FakeDb(clips), FakeStorage(root)


def job(**overrides):
    return SimpleNamespace(**{"id": "r1", "exercise_id": None, "attempts": 1, "features": None, **overrides})


def test_camera_clips_recognized_judged_and_deleted():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        db, storage = setup(root, {"sagittal.json": landmarks_json(clip(squat_frame, view="side")),
                                   "frontal.json": landmarks_json(clip(squat_frame, view="frontal"))})
        process(job(), db, storage, NoReader(), FakeLlm(RECOGNIZED, cite_first_rep), CFG)
        assert db.status == ("DONE",) and db.exercise_id == "ex-squat"
        assert [v["view"] for v in db.features["views"]] == ["SAGITTAL", "FRONTAL"]
        row = db.rows[0]
        assert row["is_primary"] and row["measured"]["evidence"][0]["view"] == "SAGITTAL"
        assert db.deleted == {"c1", "c2"} and not any(root.iterdir())


def test_unknown_exercise_rejected_but_features_kept():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"sagittal.json": landmarks_json(clip(squat_frame, view="side"))})
        process(job(), db, storage, NoReader(), FakeLlm('{"exercise": "khong-co-bai-nay"}'), CFG)
        assert db.status == ("REJECTED", "UNKNOWN_EXERCISE")
        assert db.features is not None and db.exercise_id is None and db.rows is None
        assert db.deleted == {"c1"}


def test_rejudge_from_stored_features_skips_clips_and_recognition():
    with tempfile.TemporaryDirectory() as d:
        first, storage = setup(Path(d), {"sagittal.json": landmarks_json(clip(squat_frame, view="side"))})
        process(job(), first, storage, NoReader(), FakeLlm(RECOGNIZED, cite_first_rep), CFG)
    again, llm = FakeDb([]), FakeLlm(cite_first_rep)
    process(job(exercise_id="ex-squat", features=first.features), again, None, NoReader(), llm, CFG)
    assert again.status == ("DONE",) and len(llm.calls) == 1
    assert again.features is None   # không tính lại, không ghi đè


def test_missing_key_fails_and_deletes_clips():
    with tempfile.TemporaryDirectory() as d:
        root = Path(d)
        db, storage = setup(root, {"sagittal.json": "{}"})
        process(job(), db, storage, NoReader(), FakeLlm(enabled=False), CFG)
        assert db.status == ("FAILED", "Chấm form chưa được cấu hình (thiếu OPENAI_API_KEY).")
        assert db.deleted == {"c1"} and not any(root.iterdir())


def test_unreadable_json_rejected_and_deleted():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"sagittal.json": "khong phai json"})
        process(job(), db, storage, NoReader(), FakeLlm(), CFG)
        assert db.status == ("REJECTED", "UNREADABLE") and db.deleted == {"c1"}


def test_standing_still_rejected_no_reps():
    with tempfile.TemporaryDirectory() as d:
        still = [squat_frame(i, 0.0) for i in range(60)]
        db, storage = setup(Path(d), {"sagittal.json": landmarks_json(still)})
        process(job(), db, storage, NoReader(), FakeLlm(), CFG)
        assert db.status == ("REJECTED", "NO_REPS") and db.deleted == {"c1"}


def test_bad_llm_answer_raises_after_clips_deleted():
    with tempfile.TemporaryDirectory() as d:
        db, storage = setup(Path(d), {"sagittal.json": landmarks_json(clip(squat_frame, view="side"))})
        try:
            process(job(), db, storage, NoReader(), FakeLlm(RECOGNIZED, '{"items": []}'), CFG)
        except LlmError:
            pass
        else:
            raise AssertionError("phải ném LlmError để vòng poll requeue")
        # Bộ số đã lưu nên lần thử lại không cần clip: clip xoá ngay, không đợi LLM.
        assert db.status is None and db.features is not None and db.deleted == {"c1"}


if __name__ == "__main__":
    for name, fn in list(globals().items()):
        if name.startswith("test_"):
            fn()
            print("OK", name)

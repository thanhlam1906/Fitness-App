# -*- coding: utf-8 -*-
"""Kiểm end-to-end demo qua HTTP (server phải đang chạy ở :8000): python test_engine.py

Landmark giả lập dùng chung với worker (analyzer/tests/synth.py): squat 2 góc gộp,
push-up 1 góc, và nhận diện 3 bài.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "analyzer" / "tests"))

from synth import clip, lunge_frame, pushup_frame, squat_frame  # noqa: E402

URL = "http://127.0.0.1:8000"


def post(path, payload):
    req = urllib.request.Request(f"{URL}{path}", data=json.dumps(payload).encode(),
                                 headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read())


def js(frames):
    return {"frames": [{"norm": f.norm.tolist(), "vis": f.vis.tolist(), "world": f.world.tolist()}
                       for f in frames]}


def main():
    r = post("/api/analyze-live", {"exercise": "squat", "clips": [
        js(clip(squat_frame, view="frontal", valgus=0.12)), js(clip(squat_frame, view="side"))]})
    st = {c["id"]: c["status"] for c in r["checks"]}
    assert r["ok"] and r["reps"] == 10 and r["viewpoint"]["code"] == "FRONTAL+SAGITTAL", r
    assert st == {"knee_track": "fail", "depth": "pass", "torso_lean": "pass"}, st
    assert r["primary_advice"] and not r["overall_ok"]
    llm = "on" if r.get("llm", {}).get("enabled") else "off"

    r = post("/api/analyze-live", {"exercise": "pushup", "clips": [js(clip(pushup_frame))]})
    assert r["ok"] and r["reps"] == 5 and r["overall_ok"], r
    assert {c["id"]: c["status"] for c in r["checks"]} == {"pushup_depth": "pass", "hip_sag": "pass"}

    for make, kw, label in ((squat_frame, {"view": "side"}, "squat"), (pushup_frame, {}, "pushup"),
                            (lunge_frame, {}, "lunge")):
        r = post("/api/recognize", js(clip(make, reps=3, **kw)))
        assert r["ok"] and r["label"] == label and r["confidence"] >= 0.5, r

    ex = json.loads(urllib.request.urlopen(f"{URL}/api/exercises").read())
    assert [e["slug"] for e in ex] == ["squat", "pushup", "lunge"]
    print("OK", st, "| llm:", llm)


if __name__ == "__main__":
    main()

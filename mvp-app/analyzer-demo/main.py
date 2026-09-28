# -*- coding: utf-8 -*-
"""Demo server: nhận video hoặc toạ độ khớp → pipeline chung của worker → trả kết quả.

Chạy:  .venv\\Scripts\\python -m uvicorn main:app --host 127.0.0.1 --port 8000
Mở:    http://127.0.0.1:8000        (gửi video)
       http://127.0.0.1:8000/live   (camera trực tiếp, tự nhận diện bài)

Pipeline KHÔNG nằm ở đây — import từ ../analyzer/src (concept-recognition-v1.md §1).
"""
from __future__ import annotations

import sys
import tempfile
import time
import traceback
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from dotenv import load_dotenv
from fastapi import Body, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse

BASE = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE.parent / "analyzer" / "src"))

from analyzer.analyze import AnalyzedClip, analyze_frames  # noqa: E402
from analyzer.exercises import PROFILES, SQUAT, ExerciseProfile  # noqa: E402
from analyzer.pipeline.geometry import frame_metrics  # noqa: E402
from analyzer.pipeline.pose import Frame, PoseError, PoseReader  # noqa: E402
from analyzer.pipeline.recognize import recognize  # noqa: E402
from analyzer.scoring import FAIL, WARN  # noqa: E402
from analyzer.viewpoints import LABEL_VI  # noqa: E402
from llm_advisor import advise  # noqa: E402

ALLOWED_EXT = {".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv"}
MAX_SIZE = 300 * 1024 * 1024  # 300 MB
MIN_VISIBILITY = 0.5
MAX_FRAMES = 900
REPS_PER_VIEW = 5
DISCLAIMER = ("Bản demo: ngưỡng chấm là số tạm, chưa qua hiệu chỉnh của HLV. "
              "Đây không phải công cụ y tế.")
STATUS = {"PASS": "pass", "WARN": "warn", "FAIL": "fail",
          "LOW_CONFIDENCE": "low", "NOT_APPLICABLE": "na"}

load_dotenv(BASE / ".env")  # DEEPSEEK_API_KEY / DEEPSEEK_MODEL nếu có

app = FastAPI(title="Demo phân tích form — pose + rule, đa bài, tự nhận diện")
_reader: Optional[PoseReader] = None


def get_reader() -> PoseReader:
    global _reader
    if _reader is None:
        _reader = PoseReader()
    return _reader


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    content = (BASE / "web" / "index.html").read_text(encoding="utf-8")
    # chống cache: trình duyệt luôn lấy bản HTML mới nhất (tránh chạy JS cũ sau mỗi lần sửa)
    return HTMLResponse(content=content, headers={"Cache-Control": "no-store"})


@app.get("/live", response_class=HTMLResponse)
def live() -> HTMLResponse:
    content = (BASE / "web" / "live.html").read_text(encoding="utf-8")
    return HTMLResponse(content=content, headers={"Cache-Control": "no-store"})


@app.get("/model/pose_landmarker_full.task")
def pose_model() -> FileResponse:
    """Phục vụ model pose cho trang /live (same-origin, không CORS)."""
    return FileResponse(BASE / "models" / "pose_landmarker_full.task",
                        media_type="application/octet-stream")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "analyzer-demo"}


@app.get("/api/exercises")
def exercises() -> list:
    """Hồ sơ bài cho JS: một nguồn ngưỡng duy nhất, trình duyệt không giữ số riêng."""
    return [{
        "slug": p.slug, "label": p.label_vi,
        "signal": {"attr": p.signal.attr, "down": p.signal.down_deg, "up": p.signal.up_deg,
                   "min_bottom": p.signal.min_bottom_deg, "core_joints": p.signal.core_joints},
        "protocol": [{"code": v, "label": LABEL_VI[v]} for v in p.protocol],
        "reps_per_view": REPS_PER_VIEW,
    } for p in PROFILES.values()]


def _profile(slug: Any) -> ExerciseProfile:
    if slug not in PROFILES:
        raise HTTPException(status_code=400, detail={"error": f"Bài '{slug}' không có trong demo.",
                                                     "hints": [f"Chọn một trong: {', '.join(PROFILES)}"]})
    return PROFILES[slug]


def _frames_from_json(items: Any) -> List[Frame]:
    """Frame nào không đúng shape (33×3, 33, 33×3) coi như frame không thấy người — bỏ qua."""
    frames: List[Frame] = []
    for i, f in enumerate(items):
        try:
            norm = np.asarray(f["norm"], dtype=float)
            vis = np.asarray(f["vis"], dtype=float)
            world = np.asarray(f["world"], dtype=float)
        except (TypeError, KeyError, ValueError):
            continue
        if norm.shape == (33, 3) and vis.shape == (33,) and world.shape == (33, 3):
            frames.append(Frame(index=i, norm=norm, vis=vis, world=world))
    return frames


def _clips_from_payload(clips_in: Any, max_clips: int) -> tuple[List[List[Frame]], List[int]]:
    if not isinstance(clips_in, list) or not 1 <= len(clips_in) <= max_clips:
        raise HTTPException(status_code=400, detail={"error": f"Cần 1–{max_clips} clip.", "hints": []})
    clips, totals = [], []
    for clip in clips_in:
        items = clip.get("frames") if isinstance(clip, dict) else None
        if not isinstance(items, list) or not 1 <= len(items) <= 3000:
            raise HTTPException(status_code=400,
                                detail={"error": "Mỗi clip cần 1–3000 frame.", "hints": []})
        clips.append(_frames_from_json(items))
        totals.append(len(items))
    return clips, totals


def _to_demo_result(profile: ExerciseProfile, results: list, notes: list,
                    analyzed: List[AnalyzedClip], t0: float) -> Dict[str, Any]:
    """Shape kết quả của demo (index.html / live.html / llm_advisor cùng đọc)."""
    by_id = {c.id: c for c in profile.checks}
    checks = []
    for r in results:
        m = r["measured"] or {}
        metric = None
        if "reps_scored" in m:
            metric = (f"{m['reps_passed']}/{m['reps_scored']} rep đạt — "
                      f"{m['metric']} tệ nhất {m['worst_value']}")
        checks.append({"id": r["code"], "name": by_id[r["form_check_id"]].name_vi,
                       "status": STATUS[r["verdict"]], "text": r["cue_text_vi"], "metric": metric})
    primary = next((r["cue_text_vi"] for r in results if r["is_primary"]), None)
    result = {
        "ok": True,
        "exercise": profile.label_vi, "slug": profile.slug,
        "viewpoint": {"code": "+".join(c.viewpoint for c in analyzed),
                      "label": " + ".join(LABEL_VI.get(c.viewpoint, c.viewpoint) for c in analyzed)},
        "reps": sum(len(c.reps) for c in analyzed),
        "checks": checks,
        "primary_advice": primary,
        "overall_ok": not any(r["verdict"] in (FAIL, WARN) for r in results),
        "notes": notes,
        "perf_ms": int((time.time() - t0) * 1000),
        "disclaimer": DISCLAIMER,
    }
    # Lớp LLM diễn giải (opt-in): chỉ đọc số liệu đã đo, không đổi kết luận; lỗi → vẫn trả bình thường.
    try:
        result["llm"] = advise(result)
    except Exception as exc:
        print(f"[llm] skip: {exc}")
        result["llm"] = {"enabled": False, "ok": False, "model": None, "advice": None,
                         "reason": "lỗi khi gọi lớp LLM"}
    return result


def _error(exc: PoseError) -> JSONResponse:
    print(f"[analyze] LOI-422: {exc.message} ({exc.reject_reason})")
    return JSONResponse(status_code=422, content={"ok": False, "error": exc.message, "hints": []})


@app.post("/api/recognize")
def recognize_live(payload: Dict[str, Any] = Body(...)) -> JSONResponse:
    """Toạ độ khớp vài giây → bài tập nào. T3 v0 (concept-recognition-v1.md §3)."""
    (frames,), _ = _clips_from_payload([{"frames": payload.get("frames")}], 1)
    if len(frames) < 10:
        return JSONResponse(status_code=422, content={"ok": False, "label": "unknown",
                                                      "error": "Không thấy đủ khung hình có người."})
    r = recognize(frames, [frame_metrics(f) for f in frames])
    print(f"[recognize] {r.label} ({r.confidence:.2f}) {r.features}")
    return JSONResponse(content={"ok": True, "label": r.label, "confidence": round(r.confidence, 3),
                                 "label_vi": PROFILES[r.label].label_vi if r.label in PROFILES else None,
                                 "features": r.features})


@app.post("/api/analyze-live")
def analyze_live(payload: Dict[str, Any] = Body(...)) -> JSONResponse:
    """Toạ độ 33 khớp/frame do trình duyệt tính (không nhận hình), mỗi clip một góc quay."""
    profile = _profile(payload.get("exercise", "squat"))
    clips, totals = _clips_from_payload(payload.get("clips"), 2)
    t0 = time.time()
    print(f"[live] {profile.slug}: {len(clips)} clip, {[len(c) for c in clips]} frame có người")
    try:
        results, notes, analyzed = analyze_frames(clips, profile.checks, MIN_VISIBILITY,
                                                  profile.signal, totals=totals)
    except PoseError as exc:
        return _error(exc)
    except Exception:
        traceback.print_exc()
        return JSONResponse(status_code=500, content={"ok": False, "error": "Lỗi nội bộ khi phân tích.",
                                                      "hints": ["Bấm Làm lại và thử lần nữa."]})
    result = _to_demo_result(profile, results, notes, analyzed, t0)
    print(f"[live] OK — {result['viewpoint']['code']} rep={result['reps']} "
          f"checks={ {c['id']: c['status'] for c in result['checks']} }")
    return JSONResponse(content=result)


@app.post("/api/analyze")
def analyze(file: UploadFile = File(...), exercise: str = Form("squat")) -> JSONResponse:
    profile = _profile(exercise)
    name = file.filename or "video.mp4"
    ext = Path(name).suffix.lower()
    if ext not in ALLOWED_EXT:
        raise HTTPException(
            status_code=400,
            detail={"error": f"Định dạng '{ext or '?'}' chưa hỗ trợ.",
                    "hints": ["Dùng .mp4/.mov/.webm quay từ điện thoại."]},
        )
    tmp = tempfile.NamedTemporaryFile(suffix=ext, delete=False)
    tmp_path = Path(tmp.name)
    try:
        size = 0
        while chunk := file.file.read(1024 * 1024):
            size += len(chunk)
            if size > MAX_SIZE:
                raise HTTPException(status_code=413, detail="Video quá lớn (tối đa 300 MB).")
            tmp.write(chunk)
        tmp.close()
        print(f"[analyze] nhận '{name}' ({size/1048576:.1f} MB, {ext}) bài={profile.slug}")
        t0 = time.time()
        try:
            frames, total = get_reader().read(tmp_path, MAX_FRAMES)
            results, notes, analyzed = analyze_frames([frames], profile.checks, MIN_VISIBILITY,
                                                      profile.signal, [name], [total])
        except PoseError as exc:
            return _error(exc)
        except Exception:
            traceback.print_exc()
            return JSONResponse(status_code=500,
                                content={"ok": False, "error": "Lỗi nội bộ khi phân tích video.",
                                         "hints": ["Thử video khác ngắn hơn (≤ 20 giây)."]})
        result = _to_demo_result(profile, results, notes, analyzed, t0)
        print(f"[analyze] OK — góc={result['viewpoint']['code']} rep={result['reps']} "
              f"checks={ {c['id']: c['status'] for c in result['checks']} }")
        return JSONResponse(content=result)
    finally:
        file.file.close()
        tmp_path.unlink(missing_ok=True)  # video KHÔNG được lưu lại (TTL = ngay lập tức)

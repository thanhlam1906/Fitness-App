# -*- coding: utf-8 -*-
"""Demo server: nhận video squat → phân tích (MediaPipe + rule) → trả kết quả.

Chạy:  .venv\\Scripts\\python -m uvicorn main:app --host 127.0.0.1 --port 8000
Mở:    http://127.0.0.1:8000
"""
from __future__ import annotations

import tempfile
import traceback
from pathlib import Path

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from dotenv import load_dotenv

from squat_engine import MODEL_DIR, AnalyzeError, get_engine
from llm_advisor import advise

BASE = Path(__file__).resolve().parent
ALLOWED_EXT = {".mp4", ".mov", ".m4v", ".avi", ".webm", ".mkv"}
MAX_SIZE = 300 * 1024 * 1024  # 300 MB

load_dotenv(BASE / ".env")  # đọc ANTHROPIC_API_KEY / CLAUDE_MODEL nếu có

app = FastAPI(title="Demo Squat AI — phân tích form bằng pose + rule")


@app.get("/", response_class=HTMLResponse)
def index() -> HTMLResponse:
    content = (BASE / "web" / "index.html").read_text(encoding="utf-8")
    # chống cache: trình duyệt luôn lấy bản HTML mới nhất (tránh chạy JS cũ sau mỗi lần sửa)
    return HTMLResponse(content=content, headers={"Cache-Control": "no-store"})


@app.get("/live", response_class=HTMLResponse)
def live() -> HTMLResponse:
    """Camera trực tiếp: pose on-device trong trình duyệt + overlay 33 khớp."""
    content = (BASE / "web" / "live.html").read_text(encoding="utf-8")
    return HTMLResponse(content=content, headers={"Cache-Control": "no-store"})


@app.get("/model/pose_landmarker_full.task")
def pose_model() -> FileResponse:
    """Phục vụ model pose cho trang /live (same-origin, không CORS)."""
    return FileResponse(MODEL_DIR / "pose_landmarker_full.task",
                        media_type="application/octet-stream")


@app.get("/api/health")
def health() -> dict:
    return {"ok": True, "service": "analyzer-demo"}


@app.post("/api/analyze")
def analyze(file: UploadFile = File(...)) -> JSONResponse:
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
        print(f"[analyze] nhận '{name}' ({size/1048576:.1f} MB, {ext})")
        try:
            result = get_engine().analyze(str(tmp_path))
            print(f"[analyze] OK — góc={result['viewpoint']['code']} "
                  f"rep={result['reps']} "
                  f"checks={ {c['id']: c['status'] for c in result['checks']} }")
            # Lớp LLM diễn giải (opt-in): LLM chỉ phân tích số liệu rule đã đo,
            # không nhìn video, không đổi kết luận; lỗi/thiếu key → vẫn chạy bình thường.
            try:
                result["llm"] = advise(result)
                print(f"[analyze] llm={result['llm']}")
            except Exception as exc:
                print(f"[analyze] llm-skip: {exc}")
                result["llm"] = {"enabled": False, "ok": False, "model": None,
                                 "advice": None, "reason": "lỗi khi gọi lớp LLM"}
        except AnalyzeError as exc:
            print(f"[analyze] LOI-422: {exc.message} | hints={exc.hints}")
            return JSONResponse(status_code=422, content={"ok": False, "error": exc.message,
                                                          "hints": exc.hints})
        except Exception:
            traceback.print_exc()
            return JSONResponse(status_code=500,
                                content={"ok": False,
                                         "error": "Lỗi nội bộ khi phân tích video.",
                                         "hints": ["Thử video khác ngắn hơn (≤ 20 giây)."]})
        return JSONResponse(content=result)
    finally:
        file.file.close()
        tmp_path.unlink(missing_ok=True)  # video KHÔNG được lưu lại (TTL = ngay lập tức)

# -*- coding: utf-8 -*-
"""
Demo: phân tích video Squat — Pose estimator (MediaPipe, chạy server) + Rule engine.

Kiến trúc (đúng kế hoạch kỹ thuật):
  video → MediaPipe Pose (33 khớp, world 3D) → lọc frame kém → phân loại góc nhìn
        → chuẩn hoá trục (dùng hướng thân làm trục đứng) → phân đoạn rep
        → chấm từng rep theo check hợp lệ với góc quay → tổng hợp góp ý.

QUAN TRỌNG: các ngưỡng trong RULES là NGƯỠNG DEMO (để kiểm chứng luồng).
Ngưỡng thật cần HLV hiệu chỉnh bằng clip đúng/sai (đặc tả Q1) và sau này
nằm trong DB (bảng form_checks) để web admin sửa được.
"""
from __future__ import annotations

import math
import os
import threading
import time
import urllib.request
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

HERE = Path(__file__).resolve().parent
MODEL_DIR = HERE / "models"
MODEL_URLS = {
    "full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
            "pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
            "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
}

# ---- Landmark indices (MediaPipe Pose, 33 điểm) ---------------------------
I = dict(nose=0, l_sho=11, r_sho=12, l_hip=23, r_hip=24,
         l_knee=25, r_knee=26, l_ankle=27, r_ankle=28)

# ---- Rule config mẫu (sẽ chuyển vào DB khi làm bản thật) ------------------
RULES: Dict[str, Any] = {
    "exercise": "squat",
    "checks": [
        {
            "id": "knee_track",
            "name": "Gối không chụm vào trong (valgus)",
            "viewpoint": "frontal",          # chỉ chấm khi clip quay chính diện
            "priority": 1,
            "fail_m": 0.05, "warn_m": 0.02,
            "pass_text": "Gối di chuyển ổn định, thẳng theo hướng mũi chân.",
            "warn_text": "Gối hơi chụm vào trong khi hạ xuống — chủ động đẩy gối ra ngoài theo hướng mũi chân.",
            "fail_text": "Gối có xu hướng chụm vào trong khi hạ xuống — đẩy gối ra ngoài theo hướng mũi chân, "
                         "để đầu gối thẳng hàng với ngón chân giữa.",
        },
        {
            "id": "depth",
            "name": "Độ sâu — hông hạ xuống tới ~ngang gối",
            "viewpoint": "side",             # chỉ chấm khi clip quay ngang
            "priority": 2,
            "pass_r": 1.30, "warn_r": 1.55,
            "pass_text": "Độ sâu tốt: hông hạ xuống ngang gối hoặc sâu hơn.",
            "warn_text": "Sát ngưỡng — hạ hông thêm một chút nữa là chạm mức song song.",
            "fail_text": "Chưa xuống đủ sâu — hãy hạ hông cho tới khi mặt trên đùi song song sàn (ngang gối).",
        },
        {
            "id": "torso",
            "name": "Thân & lưng trong tư thế squat",
            "viewpoint": "side",
            "priority": 3,
            "lo_deg": 10.0, "hi_deg": 55.0,
            "pass_text": "Độ nghiêng thân hợp lý, lưng giữ được đường thẳng.",
            "warn_text": "Thân nghiêng hơi nhiều — giữ ngực mở, lưng thẳng, đẩy hông ra sau.",
            "fail_text": "Thân nghiêng quá nhiều khi hạ xuống — siết bụng, giữ ngực nâng, đẩy hông ra sau. "
                         "Nếu thấy đau/thốn lưng, hãy dừng lại và nhờ người xem giúp tư thế.",
        },
    ],
    "priority_order": ["knee_track", "depth", "torso"],
    "min_visibility": 0.5,
}

VIEWPOINT_LABEL = {"frontal": "chính diện", "side": "ngang",
                   "diagonal": "~45°", "unknown": "chưa xác định"}


class AnalyzeError(Exception):
    """Lỗi có thông điệp thân thiện hiển thị được cho người dùng."""

    def __init__(self, message: str, hints: Optional[List[str]] = None):
        super().__init__(message)
        self.message = message
        self.hints = hints or []


# --------------------------------------------------------------------------
# Model loading (tải 1 lần, dùng lại)
# --------------------------------------------------------------------------
_engine_instance: Optional["SquatEngine"] = None


def get_engine() -> "SquatEngine":
    global _engine_instance
    if _engine_instance is None:
        _engine_instance = SquatEngine()
    return _engine_instance


def _ensure_model(kind: str) -> Path:
    MODEL_DIR.mkdir(exist_ok=True)
    dest = MODEL_DIR / f"pose_landmarker_{kind}.task"
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest
    url = MODEL_URLS[kind]
    print(f"[model] downloading {url}")
    urllib.request.urlretrieve(url, dest)
    print(f"[model] saved {dest}")
    return dest


def _angle_deg(a: np.ndarray, b: np.ndarray) -> float:
    na, nb = float(np.linalg.norm(a)), float(np.linalg.norm(b))
    if na < 1e-9 or nb < 1e-9:
        return 0.0
    c = float(np.dot(a, b)) / (na * nb)
    return float(math.degrees(math.acos(max(-1.0, min(1.0, c)))))


class SquatEngine:
    """Pipeline phân tích video squat."""

    def __init__(self, kind: str = "full"):
        if os.environ.get("POSE_MODEL", "full") == "lite":
            kind = "lite"
        model_path = _ensure_model(kind)
        base = mp_tasks.BaseOptions(model_asset_path=str(model_path))
        options = vision.PoseLandmarkerOptions(
            base_options=base,
            # CHẾ ĐỘ IMAGE: mỗi khung hình phân tích độc lập, KHÔNG giữ tracker
            # giữa các lần gọi → cùng một video luôn cho cùng kết quả, không bị
            # "trạng thái video trước ám video sau" như RunningMode.VIDEO.
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            output_segmentation_masks=False,
        )
        self.landmarker = vision.PoseLandmarker.create_from_options(options)
        self._lock = threading.Lock()  # detect() không an toàn khi gọi song song

    # --------------------------------------------------------------
    def analyze(self, video_path: str, max_frames: int = 900) -> Dict[str, Any]:
        t0 = time.time()
        frames, fps, stats = self._read_frames(video_path, max_frames)
        if len(frames) < 5:
            raise AnalyzeError(
                "Không đọc được nội dung video — file có thể hỏng hoặc không đúng định dạng video.",
                ["Thử lại với file .mp4 quay từ điện thoại."],
            )
        valid = [f for f in frames if f["ok"]]
        if not valid:
            msg = ("Không phát hiện thấy người nào trong video "
                   f"(pose tìm thấy người ở {stats['any_pose']}/{stats['total']} khung hình).")
            if stats["any_pose"] == 0:
                hints = ["Đứng trong khung hình với toàn bộ cơ thể hiện rõ, quay lại rồi thử lần nữa.",
                         "Kiểm tra video: có người trong đó không? Người có quá nhỏ/xa không?"]
            else:
                hints = ["Pose có thấy người nhưng các khớp quá mờ/kém tin cậy.",
                         "Quay gần hơn, đủ sáng, tránh ngược sáng và tránh quần áo sát màu nền."]
            raise AnalyzeError(msg, hints)
        cover = len(valid) / len(frames)
        notes: List[str] = []
        if cover < 0.6:
            notes.append(
                f"Chỉ {int(cover * 100)}% khung hình nhìn thấy người rõ — "
                f"video mờ hoặc bị che sẽ làm kết quả kém tin cậy.")

        viewpoint = self._classify_viewpoint(valid)
        notes.append(f"Góc nhìn phát hiện: {VIEWPOINT_LABEL[viewpoint]}.")

        metrics = [self._frame_metrics(f) for f in valid]
        for m, f in zip(metrics, valid):
            f["hip_ang"] = m["hip_ang"]
            f["torso"] = m["torso"]
            f["lat"] = m["lat"]
            f["knee_lat"] = m["knee_lat"]   # [chân trái, chân phải]: độ lệch ngang gối so cổ chân
            f["depth_r"] = m["depth_r"]

        reps = self._segment_reps(valid)
        if not reps:
            raise AnalyzeError(
                "Không tách được rep squat nào từ video.",
                ["Thực hiện 3–5 lần squat liên tục, hạ thấp rõ ràng rồi đứng lên; quay lại và thử lần nữa."],
            )
        notes.append(f"Tách được {len(reps)} rep từ clip.")

        checks = self._evaluate(reps, valid, viewpoint)
        primary, overall = self._pick_primary(checks)
        elapsed = int((time.time() - t0) * 1000)

        return {
            "ok": True,
            "exercise": "squat",
            "viewpoint": {"code": viewpoint, "label": VIEWPOINT_LABEL[viewpoint]},
            "reps": len(reps),
            "checks": checks,
            "primary_advice": primary,
            "overall_ok": overall,
            "notes": notes,
            "perf_ms": elapsed,
            "disclaimer": ("Bản demo: ngưỡng chấm là số tạm, chưa qua hiệu chỉnh của HLV. "
                           "Đây không phải công cụ y tế."),
        }

    # --------------------------------------------------------------
    # Đọc video + pose từng frame
    # --------------------------------------------------------------
    def _read_frames(self, video_path: str, max_frames: int
                     ) -> Tuple[List[Dict], float, Dict[str, int]]:
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            raise AnalyzeError("Không mở được file video.")
        fps = cap.get(cv2.CAP_PROP_FPS)
        if not fps or fps <= 0 or fps > 240:
            fps = 30.0
        frames: List[Dict[str, Any]] = []
        stats = {"total": 0, "any_pose": 0}
        idx = 0
        # giữ lock suốt vòng lặp: landmarker chung cho mọi request (chế độ IMAGE),
        # detect() không an toàn nếu 2 request gọi song song
        with self._lock:
            while idx < max_frames:
                ok, frame = cap.read()
                if not ok:
                    break
                stats["total"] += 1
                h, w = frame.shape[:2]
                if w > 640:
                    scale = 640.0 / w
                    frame = cv2.resize(frame, (int(w * scale), int(h * scale)))
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                try:
                    res = self.landmarker.detect(mp_img)
                except Exception:  # frame lẻ lỗi thì bỏ qua
                    frames.append({"ok": False, "t": idx})
                    idx += 1
                    continue
                rec = {"ok": False, "t": idx}
                if res.pose_landmarks and res.pose_world_landmarks:
                    stats["any_pose"] += 1
                    norm = np.array([[p.x, p.y, p.z] for p in res.pose_landmarks[0]])
                    vis = np.array([p.visibility for p in res.pose_landmarks[0]])
                    world = np.array([[p.x, p.y, p.z] for p in res.pose_world_landmarks[0]])
                    rec = {"ok": True, "t": idx, "norm": norm, "vis": vis, "world": world}
                frames.append(rec)
                idx += 1
        cap.release()
        return frames, fps, stats

    # --------------------------------------------------------------
    # Số đo hình học từng frame (world 3D, trục tự tham chiếu thân người)
    # --------------------------------------------------------------
    def _frame_metrics(self, f: Dict[str, Any]) -> Dict[str, Any]:
        w = f["world"]
        sho = (w[I["l_sho"]] + w[I["r_sho"]]) / 2.0
        hip = (w[I["l_hip"]] + w[I["r_hip"]]) / 2.0
        kne = (w[I["l_knee"]] + w[I["r_knee"]]) / 2.0

        # trục đứng gần đúng = hướng hông → vai; trục ngang = trái hông → phải hông
        torso = sho - hip
        up_n = torso / (np.linalg.norm(torso) + 1e-9)
        lat = w[I["r_hip"]] - w[I["l_hip"]]
        lat_n = lat / (np.linalg.norm(lat) + 1e-9)

        # góc hông (hip→shoulder vs hip→knee)
        hip_ang = _angle_deg(sho - hip, kne - hip)

        # độ sâu: (hông trên cổ chân) / (gối trên cổ chân) theo trục đứng
        ratio = 0.0
        for h, k, a in ((I["l_hip"], I["l_knee"], I["l_ankle"]),
                        (I["r_hip"], I["r_knee"], I["r_ankle"])):
            denom = max(float(np.dot(w[k] - w[a], up_n)), 0.05)
            ratio += float(np.dot(w[h] - w[a], up_n)) / denom
        ratio /= 2.0

        # độ lệch ngang của gối so với cổ chân cùng chân (mét, dương = ra ngoài)
        knee_lat = []
        for k, a, side in ((I["l_knee"], I["l_ankle"], -1.0),
                           (I["r_knee"], I["r_ankle"], +1.0)):
            knee_lat.append(side * float(np.dot(w[k] - w[a], lat_n)))

        return {"hip_ang": hip_ang, "depth_r": ratio,
                "torso": up_n, "lat": lat_n, "knee_lat": knee_lat}

    # --------------------------------------------------------------
    # Phân loại góc quay — heuristic: rộng vai / dài thân trên ảnh
    # --------------------------------------------------------------
    def _classify_viewpoint(self, frames: List[Dict]) -> str:
        ratios = []
        for f in frames[: min(len(frames), 300)]:
            n, v = f["norm"], f["vis"]
            if v[I["l_sho"]] < 0.5 or v[I["r_sho"]] < 0.5 or v[I["l_hip"]] < 0.5 or v[I["r_hip"]] < 0.5:
                continue
            sw = abs(n[I["l_sho"]][0] - n[I["r_sho"]][0])
            sho_y = (n[I["l_sho"]][1] + n[I["r_sho"]][1]) / 2.0
            hip_y = (n[I["l_hip"]][1] + n[I["r_hip"]][1]) / 2.0
            torso_len = abs(sho_y - hip_y)
            if torso_len > 0.03:
                ratios.append(sw / torso_len)
        if not ratios:
            return "unknown"
        ratio = float(np.mean(ratios))
        if ratio >= 0.42:
            return "frontal"
        if ratio <= 0.28:
            return "side"
        return "diagonal"

    # --------------------------------------------------------------
    # State machine phân đoạn rep squat (góc hông hạ → lên)
    # --------------------------------------------------------------
    def _segment_reps(self, frames: List[Dict], down_th: float = 128.0,
                      up_th: float = 148.0) -> List[Dict[str, int]]:
        reps: List[Dict[str, int]] = []
        in_rep = False
        start = bottom_i = 0
        min_a = 999.0
        count = 0
        idx = [I["l_hip"], I["r_hip"], I["l_knee"], I["r_knee"],
               I["l_ankle"], I["r_ankle"], I["l_sho"], I["r_sho"]]
        for i, f in enumerate(frames):
            a = f["hip_ang"]
            vis_ok = float(np.min(f["vis"][idx])) >= RULES["min_visibility"]
            if in_rep:
                if vis_ok and a < min_a:
                    min_a = a
                    bottom_i = i
                count += 1
                if a > up_th:
                    if count >= 6 and min_a < 115.0:
                        reps.append({"start": start, "bottom": bottom_i, "end": i})
                    in_rep = False
            else:
                if vis_ok and a < down_th:
                    in_rep = True
                    start = i
                    bottom_i = i
                    min_a = a
                    count = 1
        return reps

    # --------------------------------------------------------------
    # Chấm từng check — chỉ chấm khi góc quay hợp lệ (gate theo góc)
    # --------------------------------------------------------------
    def _evaluate(self, reps: List[Dict], frames: List[Dict],
                  viewpoint: str) -> List[Dict[str, Any]]:
        cfg_map = {c["id"]: c for c in RULES["checks"]}
        out: List[Dict[str, Any]] = []
        for cfg in RULES["checks"]:
            cid = cfg["id"]
            if cfg["viewpoint"] != viewpoint:
                out.append({
                    "id": cid, "name": cfg["name"], "status": "na",
                    "text": (f"Không kiểm tra được ở góc {VIEWPOINT_LABEL[viewpoint]}. "
                             f"Quay thêm một clip ở góc {VIEWPOINT_LABEL[cfg['viewpoint']]} "
                             f"để kiểm tra mục này."),
                    "metric": None,
                })
                continue

            rep_results: List[str] = []
            metrics_txt: List[str] = []
            for r in reps:
                st, txt = self._check_rep(cid, cfg, r, frames)
                rep_results.append(st)
                metrics_txt.append(txt)

            if "fail" in rep_results:
                status, base = "fail", cfg["fail_text"]
            elif "warn" in rep_results:
                status, base = "warn", cfg["warn_text"]
            else:
                status, base = "pass", cfg["pass_text"]
            n_pass = rep_results.count("pass")
            uniq = sorted(set(metrics_txt))[:3]
            out.append({
                "id": cid, "name": cfg["name"], "status": status,
                "text": base,
                "metric": f"{n_pass}/{len(rep_results)} rep đạt" + (f" — " + "; ".join(uniq) if uniq else ""),
            })
        return out

    def _check_rep(self, cid: str, cfg: Dict[str, Any], rep: Dict[str, int],
                   frames: List[Dict]) -> Tuple[str, str]:
        b = frames[rep["bottom"]]
        if cid == "depth":
            r = b["depth_r"]
            txt = f"tỷ lệ sâu ~{r:.2f} (≈1 là ngang gối)"
            if r <= cfg["pass_r"]:
                return "pass", txt
            if r <= cfg["warn_r"]:
                return "warn", txt
            return "fail", txt
        if cid == "torso":
            s = frames[rep["start"]]
            lean = _angle_deg(s["torso"], b["torso"])
            txt = f"nghiêng thân ~{lean:.0f}°"
            if cfg["lo_deg"] <= lean <= cfg["hi_deg"]:
                return "pass", txt
            if lean < cfg["lo_deg"]:
                # nghiêng rất ít: thường kèm gối chồm xa — chỉ cảnh báo nhẹ
                return "warn", txt + " (thân rất thẳng — kiểm tra gối có chồm quá xa không)"
            return "fail", txt
        # knee_track: valgus = gối chụm vào trong khi hạ (so với tư thế đứng của rep này).
        # knee_lat[chân] đã chuẩn hoá "dương = ra ngoài" cho cả 2 chân → chụm vào trong
        # ứng với giá trị knee_lat giảm khi hạ xuống.
        s = frames[rep["start"]]
        worst = 0.0
        for leg in (0, 1):
            inward = s["knee_lat"][leg] - b["knee_lat"][leg]
            worst = max(worst, inward)
        txt = f"chụm trong tối đa ~{worst * 100:.1f} cm"
        if worst <= cfg["warn_m"]:
            return "pass", txt
        if worst <= cfg["fail_m"]:
            return "warn", txt
        return "fail", txt

    # --------------------------------------------------------------
    # Chọn MỘT lỗi quan trọng nhất để góp ý (đặc tả §5.5)
    # --------------------------------------------------------------
    def _pick_primary(self, checks: List[Dict]) -> Tuple[Optional[str], bool]:
        order = {cid: i for i, cid in enumerate(RULES["priority_order"])}
        ranked = sorted([c for c in checks if c["status"] != "na"],
                        key=lambda c: order.get(c["id"], 99))
        for c in ranked:
            if c["status"] == "fail":
                return c["text"], False
        for c in ranked:
            if c["status"] == "warn":
                return c["text"], False
        return None, True

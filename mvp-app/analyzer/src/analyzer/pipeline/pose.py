# -*- coding: utf-8 -*-
"""Video → chuỗi landmark. Chuyển từ `_read_frames` của analyzer-demo.

RunningMode.IMAGE chứ không phải VIDEO: chế độ VIDEO giữ tracker giữa các lần
gọi nên cùng một clip cho kết quả khác nhau tuỳ thứ tự xử lý. Chấm form phải
tái lập được (concept-analyzer-v1.md §5 bước 2).
"""
from __future__ import annotations

import threading
import urllib.request
from dataclasses import dataclass
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks import python as mp_tasks
from mediapipe.tasks.python import vision

MODEL_DIR = Path(__file__).resolve().parents[3] / "models"
MODEL_URLS = {
    "full": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
            "pose_landmarker_full/float16/latest/pose_landmarker_full.task",
    "lite": "https://storage.googleapis.com/mediapipe-models/pose_landmarker/"
            "pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
}

# Landmark indices của MediaPipe Pose (33 điểm).
LM = dict(nose=0, l_sho=11, r_sho=12, l_hip=23, r_hip=24,
          l_knee=25, r_knee=26, l_ankle=27, r_ankle=28)

# Các khớp phải nhìn rõ thì frame mới dùng được để phân đoạn rep.
CORE_JOINTS = [LM["l_hip"], LM["r_hip"], LM["l_knee"], LM["r_knee"],
               LM["l_ankle"], LM["r_ankle"], LM["l_sho"], LM["r_sho"]]


class PoseError(Exception):
    """Lỗi có thông điệp hiển thị được cho người dùng, kèm lý do từ chối."""

    def __init__(self, message: str, reject_reason: str):
        super().__init__(message)
        self.message = message
        self.reject_reason = reject_reason


@dataclass
class Frame:
    index: int
    norm: np.ndarray      # toạ độ chuẩn hoá theo ảnh, dùng để phân loại góc
    vis: np.ndarray       # visibility từng landmark
    world: np.ndarray     # toạ độ world 3D, dùng cho mọi số đo hình học


def ensure_model(kind: str) -> Path:
    """Model .task vài chục MB — tải lần chạy đầu, không commit vào git."""
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    dest = MODEL_DIR / f"pose_landmarker_{kind}.task"
    if dest.exists() and dest.stat().st_size > 1_000_000:
        return dest
    urllib.request.urlretrieve(MODEL_URLS[kind], dest)
    return dest


class PoseReader:
    def __init__(self, kind: str = "full"):
        options = vision.PoseLandmarkerOptions(
            base_options=mp_tasks.BaseOptions(model_asset_path=str(ensure_model(kind))),
            running_mode=vision.RunningMode.IMAGE,
            num_poses=1,
            min_pose_detection_confidence=0.5,
            min_pose_presence_confidence=0.5,
            output_segmentation_masks=False,
        )
        self._landmarker = vision.PoseLandmarker.create_from_options(options)
        # detect() không an toàn khi gọi song song — worker xử lý 1 clip một lúc,
        # lock chỉ để giữ bất biến đó nếu sau này có ai gọi từ thread khác.
        self._lock = threading.Lock()

    def read(self, video_path: Path, max_frames: int) -> tuple[list[Frame], int]:
        """Trả (frame nhìn rõ người, tổng số frame đã đọc)."""
        cap = cv2.VideoCapture(str(video_path))
        if not cap.isOpened():
            raise PoseError("Không mở được file video.", "UNREADABLE")

        frames: list[Frame] = []
        total = 0
        with self._lock:
            while total < max_frames:
                ok, frame = cap.read()
                if not ok:
                    break
                index = total
                total += 1
                height, width = frame.shape[:2]
                if width > 640:
                    scale = 640.0 / width
                    frame = cv2.resize(frame, (int(width * scale), int(height * scale)))
                mp_image = mp.Image(
                    image_format=mp.ImageFormat.SRGB, data=cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
                try:
                    result = self._landmarker.detect(mp_image)
                except Exception:
                    continue  # frame lẻ lỗi thì bỏ qua, không hỏng cả clip
                if result.pose_landmarks and result.pose_world_landmarks:
                    frames.append(Frame(
                        index=index,
                        norm=np.array([[p.x, p.y, p.z] for p in result.pose_landmarks[0]]),
                        vis=np.array([p.visibility for p in result.pose_landmarks[0]]),
                        world=np.array([[p.x, p.y, p.z] for p in result.pose_world_landmarks[0]]),
                    ))
        cap.release()

        if total < 5:
            raise PoseError(
                "Không đọc được nội dung video — file có thể hỏng hoặc không phải video.", "UNREADABLE")
        if not frames:
            raise PoseError(
                "Không thấy người trong khung hình. Quay lại với toàn bộ cơ thể trong khung, đủ sáng.",
                "LOW_VISIBILITY")
        return frames, total

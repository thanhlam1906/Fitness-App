# Analyzer — chấm form qua video (TN2)

Worker Python. **Không nhận HTTP.** Nó chỉ nói chuyện với Postgres và với thư
mục clip: poll bảng `video_review_requests`, đọc clip, chấm bằng pose +
`form_checks` đọc từ DB, ghi `review_results`, rồi **xoá clip ngay**.

Thiết kế đầy đủ ở `concept-analyzer-v1.md`. File này chỉ nói cách chạy.

## Chạy

```bash
cd analyzer
python -m venv .venv && .venv/Scripts/activate      # Windows
pip install -r requirements.txt

export DB_URL="postgresql://fitness:fitness_dev_only@localhost:55432/fitness"
export CLIP_STORAGE_PATH="../backend/var"            # phải TRÙNG app.clip-storage-path của backend
PYTHONPATH=src python -m analyzer
```

Lần chạy đầu tự tải `pose_landmarker_full.task` (~30 MB) vào `analyzer/models/`.
File này không commit vào git.

## Biến môi trường

| Biến | Bắt buộc | Mặc định | Ghi chú |
|---|---|---|---|
| `DB_URL` | ✅ | — | URI libpq |
| `CLIP_STORAGE_PATH` | ✅ | — | Thư mục dùng chung với backend |
| `POSE_MODEL` | | `full` | `lite` khi máy yếu |
| `POLL_INTERVAL_SEC` | | `5` | |
| `MIN_VISIBILITY` | | `0.5` | A2 — đo lại trên bộ clip, đừng đoán |
| `MAX_FRAMES` | | `900` | 30 giây ở 30 fps |
| `DEEPSEEK_API_KEY` | | — | Thiếu thì lớp diễn giải LLM **tắt**, chạy bằng text của rule |

## Chấm một clip bằng tay

Dùng khi hiệu chỉnh ngưỡng cùng HLV. Ngưỡng vẫn đọc từ DB, đúng như worker.

```bash
PYTHONPATH=src python -m analyzer.cli --exercise barbell-back-squat clip1.mp4 clip2.mp4
```

## Test

```bash
python tests/test_scoring.py
```

Chạy được trên máy **chưa cài mediapipe/opencv**: `scoring.py` cố ý không import
tầng hình học. Bộ clip regression (`concept-analyzer-v1.md` §8) là việc khác —
nó kiểm *số đo*, cái này kiểm *luật chấm*.

## Ranh giới P7

`src/analyzer/pipeline/metrics.py` là ranh giới, và nó chỉ có một chỗ:

- **bên trái** — công thức đo, trong code, đổi phải deploy;
- **bên phải** — ngưỡng, góc hợp lệ, text góp ý, trong bảng `form_checks`,
  HLV sửa qua web admin, có hiệu lực ngay, không deploy.

`metric` trong DB không có trong bảng `METRICS` → job `FAILED` kèm lỗi rõ ràng.
Gõ nhầm tên metric là lỗi cấu hình, phải nhìn thấy ngay, không âm thầm bỏ qua.

## Giới hạn đã biết

- Ngưỡng trong `R__seed_content.sql` là **số suy ra, chưa hiệu chỉnh trên clip
  thật** (A1). Cần bộ clip regression trước khi tin kết quả.
- Chỉ squat có `form_checks`. 4 bài còn lại là Đợt 5 (A4) — thêm metric mới,
  không đổi kiến trúc.
- Xử lý **một clip một lúc**: `landmarker.detect()` không an toàn khi gọi song
  song. Hàng đợi ùn thì chạy thêm một process analyzer nữa; `SKIP LOCKED` đã lo
  phần tranh chấp, không phải sửa code.

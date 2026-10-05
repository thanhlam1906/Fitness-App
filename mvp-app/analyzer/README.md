# Analyzer — chấm form qua video (TN2)

Worker Python. **Không nhận HTTP.** Nó chỉ nói chuyện với Postgres và với thư
mục clip: poll bảng `video_review_requests`, đọc clip (video, hoặc file `.json`
toạ độ khớp từ màn camera), tách rep và tính bộ số dùng chung cho mọi bài, so
từng số với ngưỡng admin nhập ở `form_checks`, ghi `review_results`, rồi
**xoá clip ngay**.

Thiết kế ở `concept-analyzer-v1.md` và `doc/design-cham-form-nguong-v1.md`. File này
chỉ nói cách chạy.

## Chạy

```bash
cd analyzer
python -m venv .venv && .venv/Scripts/activate      # Windows
pip install -r requirements.txt

export DB_URL="postgresql://fitness:fitness_dev_only@localhost:15432/fitness"
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
| `POLL_INTERVAL_SEC` | | `5` | Compose đặt 1: màn camera chờ kết quả trên màn hình |
| `MIN_VISIBILITY` | | `0.5` | A2 — đo lại trên bộ clip, đừng đoán |
| `MAX_FRAMES` | | `900` | 30 giây ở 30 fps |

## Test

```bash
python tests/test_scoring.py     # luật chấm, không cần mediapipe
python tests/test_pipeline.py    # pipeline đa bài trên landmark giả lập, cần mediapipe/numpy
python tests/test_worker.py      # một job với Db, kho clip giả, cần mediapipe/numpy
```

`test_pipeline.py` chốt cứng kết quả tách rep squat trước khi đa bài hoá
(`concept-recognition-v1.md` §6) — đổi số đó là đổi hành vi analyzer-demo.

## Ranh giới

- **Code** (`pipeline/`, `scoring.py`): cách đo và luật gộp rep. Đổi phải deploy.
- **Bảng `form_checks`**: góc quay, khớp, lúc đo, khoảng độ, câu nhắc. Admin sửa
  trên web, có hiệu lực ngay.

Khoá số đo (`knee`, `valgus`…) trùng ở ba nơi: `feature_keys.py`, backend
`FormMeasures.java`, web `src/lib/formMeasures.ts`. Thêm khoá thì thêm cả ba.

## Giới hạn đã biết

- Ngưỡng nạp sẵn trong `R__seed_content.sql` là **số tạm, chưa kiểm trên người
  thật**. Admin chỉnh bằng cách tự tập trước camera rồi xem số từng rep.
- Xử lý **một clip một lúc**: `landmarker.detect()` không an toàn khi gọi song
  song. Hàng đợi ùn thì chạy thêm một process analyzer nữa; `SKIP LOCKED` đã lo
  phần tranh chấp, không phải sửa code.

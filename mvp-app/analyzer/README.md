# Analyzer — chấm form qua video (TN2)

Worker Python. **Không nhận HTTP.** Nó chỉ nói chuyện với Postgres và với thư
mục clip: poll bảng `video_review_requests`, đọc clip (video, hoặc file `.json`
toạ độ khớp từ màn camera), tách rep và tính bộ số dùng chung cho mọi bài, nhờ
LLM nhận diện bài và chấm (code kiểm từng dẫn chứng), ghi `review_results`, rồi
**xoá clip ngay**.

Thiết kế ở `concept-analyzer-v1.md` và `doc/design-cham-form-llm-v1.md`. File này
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
| `OPENAI_API_KEY` | | — | LLM nhận diện bài và chấm. Thiếu thì mọi job chấm form FAILED |
| `OPENAI_CHAT_MODEL` | | `gpt-4o-mini` | Model OpenAI |
| `OPENAI_BASE_URL` | | `https://api.openai.com/v1` | Đổi khi dùng endpoint tương thích OpenAI |

## Chấm một clip bằng tay

Chấm bằng rule theo ngưỡng trong DB, để đối chứng; worker chấm bằng LLM.

```bash
PYTHONPATH=src python -m analyzer.cli --exercise barbell-back-squat clip1.mp4 clip2.mp4
```

## Test

```bash
python tests/test_scoring.py     # luật chấm rule, không cần mediapipe
python tests/test_judge.py       # kiểm câu trả lời LLM, không cần mediapipe
python tests/test_pipeline.py    # pipeline đa bài trên landmark giả lập, cần mediapipe/numpy
python tests/test_worker.py      # một job với Db, kho clip, LLM giả, cần mediapipe/numpy
```

`test_pipeline.py` chốt cứng kết quả tách rep squat trước khi đa bài hoá
(`concept-recognition-v1.md` §6) — đổi số đó là đổi hành vi worker.

Chạy được trên máy **chưa cài mediapipe/opencv**: `scoring.py` cố ý không import
tầng hình học. Bộ clip regression (`concept-analyzer-v1.md` §8) là việc khác —
nó kiểm *số đo*, cái này kiểm *luật chấm*.

## Ranh giới P7

Chỉ áp cho đường chấm bằng rule (`cli.py`, analyzer-demo). Từ 09-27 worker chấm
bằng LLM, không đọc `form_checks`.

`src/analyzer/pipeline/metrics.py` là ranh giới, và nó chỉ có một chỗ:

- **bên trái** — công thức đo, trong code, đổi phải deploy;
- **bên phải** — ngưỡng, góc hợp lệ, text góp ý, trong bảng `form_checks`,
  HLV sửa qua web admin, có hiệu lực ngay, không deploy.

`metric` trong DB không có trong bảng `METRICS` → job `FAILED` kèm lỗi rõ ràng.
Gõ nhầm tên metric là lỗi cấu hình, phải nhìn thấy ngay, không âm thầm bỏ qua.

## Giới hạn đã biết

- Ngưỡng trong `R__seed_content.sql` là **số suy ra, chưa hiệu chỉnh trên clip
  thật** (A1). Cần bộ clip regression trước khi tin kết quả.
- LLM chấm zero-shot, chưa kiểm chứng trên dataset (việc 2 của
  `doc/design-cham-form-llm-v1.md`). Màn kết quả ghi rõ "AI đánh giá".
- Xử lý **một clip một lúc**: `landmarker.detect()` không an toàn khi gọi song
  song. Hàng đợi ùn thì chạy thêm một process analyzer nữa; `SKIP LOCKED` đã lo
  phần tranh chấp, không phải sửa code.

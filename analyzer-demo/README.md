# Demo — Gửi video Squat → Phân tích AI (pose + rule)

Kiểm chứng lõi Tính năng 2: người dùng gửi video squat, hệ thống dùng
**MediaPipe Pose (server)** + **rule engine** để chấm và đưa góp ý.

Pipeline: `video → 33 khớp/frame → lọc frame kém → phân loại góc quay
→ chuẩn hoá trục theo thân → state machine tách rep → chấm theo rule
(chỉ check hợp lệ với góc quay) → 1 góp ý quan trọng nhất`.

## Chạy

```powershell
cd analyzer-demo
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
# (lần đầu tự tải model pose_landmarker_full.task ~11MB vào models/)
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Mở `http://127.0.0.1:8000`, kéo thả video squat (3–5 rep, ≤ 20s,
toàn thân trong khung, quay NGANG hoặc CHÍNH DIỆN).

Đổi model nhẹ hơn nếu máy chậm: `$env:POSE_MODEL="lite"`.

## Gọi API trực tiếp

```powershell
curl.exe -F "file=@D:\path\to\squat.mp4" http://127.0.0.1:8000/api/analyze
```

## Lớp LLM diễn giải (opt-in)

Rule engine đo & kết luận (đạt/chưa đạt + số liệu) → **LLM (DeepSeek) phân tích các
số liệu đã đo** để viết góp ý tự nhiên như HLV. LLM không nhìn video, không bịa
số, không đổi kết luận. Thiếu key / LLM lỗi → app tự dùng lời khuyên rule.

Bật bằng cách tạo file `.env` cạnh `main.py`:

```
DEEPSEEK_API_KEY=sk-...
DEEPSEEK_MODEL=deepseek-chat
```

Sau đó khởi động lại server. Chi phí rất thấp (deepseek-chat ~vài phần nghìn $/lần).

## Cấu trúc

- `main.py` — FastAPI: nhận file, gọi engine, **xóa video ngay sau phân tích**
  (không lưu trữ — TTL tức thì, đúng tinh thần đặc tả §6.3).
- `squat_engine.py` — pipeline + rule config mẫu (`RULES`).
- `llm_advisor.py` — lớp LLM (DeepSeek) diễn giải số liệu (opt-in, an toàn khi không có key).
- `web/index.html` — UI demo tiếng Việt (1 file, không build).

## Lưu ý

- **Ngưỡng trong `RULES` là số tạm (demo)** — cần HLV hiệu chỉnh bằng clip
  đúng/sai (đặc tả Q1); bản thật sẽ đưa rule vào DB (bảng `form_checks`)
  để web admin sửa được.
- Góc quay quyết định check được chạy (đặc tả Tầng 2): NGANG → độ sâu +
  thân/lưng; CHÍNH DIỆN → gối; ~45° → không chấm số, chỉ báo cần quay góc khác.
- Video tự xóa ngay sau khi xử lý; kết luận (đạt/chưa đạt + số đo) luôn từ
  rule engine — LLM chỉ diễn giải các số liệu đó.

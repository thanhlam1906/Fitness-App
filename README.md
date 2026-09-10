# Fitness MVP

App tập luyện cho người mới: chọn chương trình từ template có sẵn, tập theo lịch tuần, log
từng set, và một engine **rule-based** điều chỉnh tải cho tuần sau — luôn kèm lý do đọc được.
Cộng thêm chấm form qua video bằng pose estimation, cũng rule-based.

**Bất biến của dự án:** LLM không quyết định con số nào. Chương trình tập không sinh từ số 0
— nó đến từ template và rule. Mọi thay đổi tải và mọi kết quả chấm form đều lưu kèm lý do
cấu trúc, và đều có nút "góp ý này sai".

## Ba thành phần

Codebase nằm trong [`mvp-app/`](mvp-app/). Tài liệu đặc tả/kế hoạch nằm trong [`doc/`](doc/) (không public).

```
mvp-app/web/         React 19 + Vite       — người dùng và admin, một app, phân quyền theo role
mvp-app/backend/     Java 21 + Spring Boot — API, engine tăng tải, hàng đợi chấm video
mvp-app/analyzer/    Python worker         — pose + rule engine, đọc hàng đợi Postgres, KHÔNG nhận HTTP
```

Chúng nói chuyện qua Postgres và một thư mục clip dùng chung. Analyzer không gọi backend,
backend không gọi analyzer.

```
người dùng ──POST clip──▶ backend ──ghi hàng đợi──▶ Postgres ◀──poll 5s── analyzer
                                                        │                     │
                              GET /reviews/{id} ◀────────┘        chấm → ghi kết quả → XOÁ CLIP
```

## Chạy local

```bash
cd mvp-app && docker compose up -d postgres

cd mvp-app/backend && ./gradlew bootRun          # http://localhost:8080
cd mvp-app/web     && npm install && npm run dev # http://localhost:5173

# TN2 (chấm video) — chỉ cần khi thử luồng gửi clip
cd mvp-app && docker compose --profile tn2 up -d analyzer
```

Flyway tự chạy migration và seed nội dung mẫu (5 bài, 2 template, 3 check form cho squat).
Đăng ký một tài khoản ở `/register` rồi đi hết onboarding.

Tài khoản admin: đăng ký như thường rồi đổi role trong DB.

```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'you@example.com';
```

## Test

```bash
cd mvp-app/backend && ./gradlew test        # cần Docker: Testcontainers Postgres, không H2
cd mvp-app/web     && npm test
python mvp-app/analyzer/tests/test_scoring.py
```

## Cấu hình

| Biến | Thành phần | Mặc định | Ghi chú |
|---|---|---|---|
| `DB_URL` `DB_USER` `DB_PASSWORD` | backend, analyzer | postgres local ở cổng 55432 | |
| `JWT_SECRET` | backend | dev-only | **Bắt buộc đặt ở môi trường thật**, ≥32 byte |
| `CLIP_STORAGE_PATH` | backend, analyzer | `mvp-app/backend/var` | Hai bên phải trỏ CÙNG một thư mục |
| `REVIEW_WEEKLY_LIMIT` | backend | `10` | Lượt gửi clip mỗi 7 ngày |
| `POSE_MODEL` | analyzer | `full` | `lite` khi máy yếu |
| `DEEPSEEK_API_KEY` | analyzer | — | Thiếu thì lớp diễn giải LLM tắt, chạy bằng text của rule |

## Video người dùng

Clip được xoá **ngay** sau khi chấm xong, kể cả khi chấm thất bại. Không có endpoint nào
trả về clip — kể cả cho admin. Web admin xem được hồ sơ người dùng, không xem được video.

## Đang còn dở

- Ngưỡng chấm form là **số suy ra, chưa hiệu chỉnh** trên clip thật. Cần bộ clip regression
  trước khi tin kết quả — xem `mvp-app/analyzer/README.md`.
- Chỉ squat có `form_checks`. 4 bài còn lại thêm metric mới, không đổi kiến trúc.
- Nội dung mới là seed giả lập (5 bài, 2 template), chưa phải bộ ~40 bài phát hành.
- Chưa có đo lường (PostHog/Sentry) và chưa có app mobile.

# CLAUDE.md — quy tắc làm việc cho Fitness App

File này để mọi session Claude (ở bất kỳ tài khoản nào) vào là làm tiếp được ngay.
Đọc thêm `README.md` (cách chạy, cấu hình) và README của từng thành phần trong `mvp-app/`.

## Ngôn ngữ

- Trả lời người dùng, viết commit message, comment code, chữ trên giao diện: **tiếng Việt**.
- Tên biến, hàm, lớp, file: tiếng Anh. Tên test Java được viết tiếng Việt không dấu (`codeTheoChuanCauTruc`).

## Bất biến của dự án — không bao giờ phá

- **LLM không quyết định con số nào.** Tải tập, ngưỡng chấm form, mức tạ đều đến từ rule và template.
  Lớp LLM (trợ lý, diễn giải) chỉ diễn đạt lại; `NumberGuard` (backend) và
  `advisor.py:numbers_are_grounded` (analyzer) chặn câu chứa số không có nguồn (N3).
- Chương trình tập không sinh từ số 0, nó đến từ template và rule.
- Mọi thay đổi tải và mọi kết quả chấm form lưu **kèm lý do có cấu trúc**, và có nút
  "góp ý này sai" (`WrongFeedbackButton` dùng chung trên web).
- **N2 — video:** clip bị xoá NGAY sau khi chấm xong, kể cả khi chấm lỗi. Không endpoint nào trả
  clip về, kể cả cho admin. Không có ngoại lệ "để debug".
- **TN2:** đánh giá form chỉ qua video. Trợ lý chat không đánh giá form bằng chữ (`SafetyGate`).
- Analyzer và backend chỉ nói chuyện qua Postgres + thư mục clip dùng chung. Không gọi HTTP lẫn nhau.

## Cấu trúc code (có test tự kiểm, lệch là test đỏ)

Chuẩn gốc: `doc/design-chuan-cau-truc-v1.md` §7.1 (thư mục `doc/` không có trong repo).

**Backend** (`mvp-app/backend`, Java 21 + Spring Boot) — `ArchitectureTest.java`:
- `com.fitness.<feature>.{controller,service,repository,entity,dto}`. Ngoài 5 tầng này chỉ có
  `config/`, `common/` và `FitnessApplication`.
- Controller không import repository/entity, không `@Transactional`, không trả kiểu khai báo trong service.
- Service không đọc `CurrentUser`, nhận `userId` qua tham số (trừ `AssistantTools`).
- Record trong `dto/` phải có hậu tố `Request` hoặc `Response`.
- Ghi (save/delete) vào bảng của feature khác phải đi qua service của feature đó.
- Migration Flyway: `src/main/resources/db/migration/V<n>__ten.sql`, tăng số tiếp theo
  (mới nhất hiện là V15). Không sửa migration đã có. Nội dung mẫu ở `R__seed_content.sql`.
- Test dùng Testcontainers Postgres, **không dùng H2**.

**Web** (`mvp-app/web`, React 19 + Vite + TS) — `src/architecture.test.ts`:
- File trong `src/features/<feature>/` chỉ nằm ở `pages/ components/ api/ utils/ types/`.
- Chỉ `api/` (gốc hoặc của feature) được gọi `api.get/post/postForm/put/patch/del`.
- File đuôi `Page.tsx` chỉ ở `pages/`, và `pages/` chỉ chứa file đuôi `Page`.
- Stack: Tailwind v4 (token ở `src/styles/index.css`), TanStack Query, React Router,
  react-hook-form + zod. Component `src/components/ui/` viết tay kiểu shadcn, không dùng CLI.
- Component dùng chung chỉ khi xuất hiện từ hai feature trở lên.
- Test: unit cho hàm thuần và component nhỏ; **không** test page/router, không mock toàn bộ API.

**Mobile** (`mvp-app/mobile`, Expo SDK 57 + expo-router) — `src/architecture.test.ts`:
- Màn nằm ở `app/`; feature trong `src/features/<feature>/{components,api,utils,types}`.
- Chỉ `api/` gọi server. Khoá đúng SDK của Expo Go trên App Store, không nâng SDK tự ý.

**Analyzer** (`mvp-app/analyzer`, Python): worker poll Postgres, không nhận HTTP.
- Khoá số đo (`knee`, `valgus`…) trùng ở 3 nơi: `feature_keys.py`, backend `FormMeasures.java`,
  web `src/lib/formMeasures.ts`. Thêm khoá thì thêm cả ba.
- Ngưỡng nằm ở bảng `form_checks` (admin sửa trên web); cách đo nằm trong code.

## Kiểm tra trước khi commit

Chạy phần liên quan tới thay đổi:

```bash
cd mvp-app/backend && ./gradlew test                      # cần Docker
cd mvp-app/web     && npm test && npm run lint && npm run build
cd mvp-app/mobile  && npx tsc --noEmit && npx jest
python mvp-app/analyzer/tests/test_scoring.py
```

Nếu môi trường không chạy được (ví dụ thiếu Docker cho backend) thì nói rõ là chưa chạy,
không báo là đã qua.

## Git

- Nhánh chính: `master`. Tính năng làm trên nhánh `feat/<ten-ngan>` (ví dụ `feat/quan-ly-user`,
  `feat/admin-buoi-tap`), xong thì merge vào `master` bằng merge commit
  `Merge branch 'feat/x' vào master: <mô tả>`.
- Commit theo dạng Conventional Commits, mô tả tiếng Việt, viết thường:
  `feat(admin): ...`, `fix(mobile): ...`, `style(admin): ...`. Scope là feature/thành phần
  (`admin`, `web`, `mobile`, `review`, `backend`…). Thân commit gạch đầu dòng khi có nhiều ý.
- Không commit: `.env`, `doc/`, `.claude/`, clip/video, model `.task`, corpus trợ lý (xem `.gitignore`).

## Cách làm việc với người dùng

- Người dùng là chủ dự án, trao đổi bằng tiếng Việt, muốn câu trả lời ngắn gọn, đi thẳng vào việc.
- Sửa xong review góp ý thì gom vào commit `fix(<scope>): sửa các góp ý review ...`.
- Đổi hành vi người dùng thấy thì cập nhật README liên quan (bảng màn, biến môi trường, "Đang còn dở").

## Trạng thái hiện tại

Đã xong: onboarding, chọn chương trình, lịch tuần, log buổi tập, engine tăng tải rule-based,
chấm form qua video (squat có `form_checks`), trợ lý chat có kho kiến thức PDF (pgvector),
trang admin (người dùng: khoá/đổi vai trò/mật khẩu tạm/xoá/nhật ký; bài tập; template;
Buổi tập dạng biểu đồ), mobile iPhone qua Expo Go (đủ màn người dùng trừ quay camera chấm form).

Còn dở: xem mục "Đang còn dở" trong `README.md` (ngưỡng chấm form chưa hiệu chỉnh trên clip thật,
chỉ squat có `form_checks`, nội dung còn là seed, chưa có PostHog/Sentry).

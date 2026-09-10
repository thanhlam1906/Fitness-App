# web

React 19 + Vite + TypeScript, theo `concept-frontend-v1.md`. Stack: Tailwind CSS v4
(token trong `src/styles/index.css`), TanStack Query, React Router, react-hook-form + zod.
Component `src/components/ui/` viết tay theo phong cách shadcn (không dùng CLI/registry) —
chỉ vài primitive đơn giản, chưa cần Radix.

## Chạy dev

```
npm install
npm run dev
```

Vite proxy `/api` sang backend tại `http://localhost:8080` (xem `vite.config.ts`) — chạy
`docker compose up -d postgres` và backend Spring Boot (`../backend/gradlew.bat bootRun`) trước.

## Các màn

Một app React duy nhất, phân quyền theo `role` trong JWT (P6). 12 màn của
`concept-frontend-v1.md` §4:

| # | Màn | Route |
|---|---|---|
| 1 | Đăng nhập / đăng ký | `/login` · `/register` |
| 2 | Onboarding 5 bước, lưu sau mỗi bước, bỏ dở quay lại tiếp được | `/onboarding?step=` |
| 3 | Chọn chương trình — xem cấu trúc tuần, ngày nghỉ, **mức tạ khởi điểm** | `/program` |
| 4 | **Lịch tuần** — lưới 7 ô ngày, lý do đổi tải hiện ngay tại chỗ | `/schedule` |
| 5–6 | Buổi tập: log set, RPE hỏi mềm, bỏ set kèm lý do, thay bài, báo đau cuối buổi | `/workout/:id` |
| 7 | Kiểm tra form — chọn bài | `/form-check` |
| 8 | Kiểm tra form — hướng dẫn quay + **opt-in gửi clip** | `/form-check/:exerciseId` |
| 9 | Kiểm tra form — kết quả, một lỗi quan trọng nhất, "góp ý này sai" | `/form-check/result/:reviewId` |
| 10 | Hồ sơ và cài đặt | `/settings` |
| 11 | Admin — người dùng | `/admin/users` · `/admin/users/:id` |
| 12 | Admin — bài tập + editor `form_checks` | `/admin/exercises` · `/admin/exercises/:id` |
| — | Admin — template | `/admin/templates` · `/admin/templates/:id` |

Bước 6 của onboarding trong tài liệu ("mức tạ khởi điểm") nằm ở màn 3: danh sách bài cần
nhập tạ chỉ biết được **sau khi** chọn template, hỏi sớm hơn là bắt người dùng đoán slug.

## Component dùng chung

Chỉ những cái xuất hiện từ hai feature trở lên (§4.3):

`StatusBadge` · `VerdictChip` · `LoadDeltaBadge` · `WrongFeedbackButton` · `Stepper`

`WrongFeedbackButton` dùng chung là **bắt buộc**: đặc tả yêu cầu nút "góp ý này sai" ở mọi
góp ý do máy sinh ra — kết quả chấm form lẫn quyết định tải. Một component thì không sót chỗ nào.

## Test

```
npm test
```

Theo §6: unit `lib/format.ts`, `LoadDeltaBadge` và `VerdictChip` render đúng từng trạng thái,
cộng `features/schedule/weeks.ts` (lịch 7 ô ngày). **Không** test page/router hay mock toàn bộ
API — kiểm tra bằng tay trên web nhanh hơn.

## Cố tình chưa làm

| Chưa làm | Khi nào làm |
|---|---|
| Offline / hàng đợi log set | Bắt buộc khi lên mobile ở Đợt 7 — phòng gym hay mất sóng |
| Theme sáng | Token đã ở dạng biến CSS, thêm sau chỉ là khai thêm một bộ giá trị |
| Biểu đồ tiến bộ | Khi có màn tiến bộ thật |
| Hình minh hoạ khung người ở màn 8 (F2) | Cần chụp hoặc vẽ, không code được |

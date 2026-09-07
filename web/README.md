# web

React 19 + Vite + TypeScript, theo `concept-frontend-v1.md`. Stack: Tailwind CSS v4 (token trong `src/styles/index.css`), TanStack Query, React Router, react-hook-form + zod. Component `src/components/ui/` viết tay theo phong cách shadcn (không dùng CLI/registry) — chỉ vài primitive đơn giản, chưa cần Radix.

## Chạy dev

```
npm install
npm run dev
```

Vite proxy `/api` sang backend tại `http://localhost:8080` (xem `vite.config.ts`) — chạy `docker compose up -d postgres` và backend Spring Boot (`../backend/gradlew.bat bootRun`) trước.

## Phạm vi hiện tại — chỉ 2 màn thật

Chưa có API đăng nhập, nên `RequireUser` yêu cầu dán thẳng một `user id` (UUID) đã có sẵn trong bảng `users` — tạo bằng tay qua `psql`, ví dụ:

```sql
INSERT INTO users (email, password_hash, role) VALUES ('you@example.com', 'x', 'USER') RETURNING id;
```

Chỉ 2 trong 12 màn của `concept-frontend-v1.md` §4 chạy được thật, vì backend hiện chỉ có 2 endpoint tương ứng:

| Màn | Route | API |
|---|---|---|
| Onboarding (rút gọn) | `/onboarding` | `PUT /api/v1/profiles/{userId}` |
| Chọn chương trình | `/program` | `GET /api/v1/programs/candidates`, `POST /api/v1/programs` |

10 màn còn lại (đăng nhập thật, lịch tuần, buổi tập, kiểm tra form qua video, admin...) chưa có route — thêm khi backend có endpoint tương ứng. "Xem cấu trúc tuần" và "mức tạ khởi điểm theo từng bài gợi ý" ở màn Chọn chương trình cũng chưa làm được vì chưa có endpoint trả `week_structure`/danh sách bài của một template; mức tạ khởi điểm hiện nhập tay theo slug.

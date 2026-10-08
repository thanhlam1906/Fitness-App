# Fitness-App

Code nằm trong `mvp-app/`: `backend` (Spring Boot, Gradle), `web` (Vite + React),
`mobile` (Expo), `analyzer` (Python), `analyzer-demo`, `pdf-hybrid`.

## Làm song song nhiều session

Nhiều session Claude có thể đang làm cùng lúc trên các branch khác nhau.
Luôn theo skill `.claude/skills/parallel-sessions/SKILL.md`:

- Bắt đầu task: branch mọc từ `origin/master` mới nhất, chạy
  `bash .claude/skills/parallel-sessions/scripts/check-overlap.sh`.
- Trước mỗi lần push: merge `origin/master`, chạy test phần đã sửa, chạy lại
  script (phải thoát 0).
- Không tạo commit orphan/bản chụp, không force-push `master`, không chép code
  giữa các branch thay cho merge.
- Migration Flyway mới lấy số lớn nhất trên `origin/master` + 1.

---
name: parallel-sessions
description: Quy trình git khi nhiều session Claude cùng làm trên repo Fitness-App một lúc — bắt đầu task, đồng bộ master, kiểm tra trùng file và số migration với branch khác, và trước mỗi lần push hoặc merge. Dùng khi bắt đầu bất kỳ task code nào, trước khi commit/push, trước khi tạo PR hoặc merge, và khi người dùng hỏi về branch, conflict, "còn gì chưa push".
---

# Làm song song nhiều session không conflict

Người dùng thường mở nhiều session cùng lúc, mỗi session một branch. Mọi branch
đều đi về `master`. Mục tiêu: mỗi branch luôn merge sạch vào `master`, không
session nào ghi đè hay đi lệch lịch sử của session khác.

Script kiểm tra dùng chung ở mọi bước:

```bash
bash .claude/skills/parallel-sessions/scripts/check-overlap.sh
```

Script báo: branch hiện tại hơn/kém `origin/master` bao nhiêu commit, có merge
sạch không, có trùng số migration Flyway không, và branch nào khác đang sửa
cùng file với mình. Mã thoát 1 = không được push.

## 1. Khi bắt đầu task

1. `git fetch origin master`.
2. Branch của session phải mọc từ `origin/master` mới nhất:
   - Branch chưa có commit nào của mình, hoặc PR cũ đã merge →
     `git checkout -B <branch> origin/master`.
   - Branch đã có commit riêng chưa merge → `git merge origin/master`
     (không rebase branch đã push).
3. Chạy script. Đọc phần "Branch khác còn commit chưa vào master":
   - Có branch đang sửa cùng file mình sắp sửa → báo người dùng một dòng
     (branch nào, file nào) và làm phần không đụng trước. Không tự sửa code trên
     branch của session khác.

## 2. Trong khi làm

- Giữ phạm vi nhỏ, đúng task. Không format lại, đổi tên, dời file ngoài task —
  đó là nguồn conflict lớn nhất giữa các session.
- Commit nhỏ, thường xuyên; mỗi lần push xong thì `git fetch origin master` và
  `git merge origin/master` nếu master đã đi tiếp.
- **File dễ đụng nhau** — sửa tối thiểu, chỉ thêm dòng, không sắp xếp lại:
  - `mvp-app/web/src/App.tsx` (routes), `mvp-app/web/src/components/AppShell.tsx`,
    `mvp-app/web/src/features/admin/components/AdminShell.tsx`
  - `mvp-app/mobile/app/**/_layout.tsx`
  - `mvp-app/backend/src/main/resources/application.yml`, `mvp-app/docker-compose.yml`
  - `package.json` / `package-lock.json`: thêm dependency bằng `npm install`,
    khi conflict thì lấy bản của master rồi chạy lại `npm install`, không sửa
    lock bằng tay.
- **Migration Flyway** (`mvp-app/backend/src/main/resources/db/migration/V<n>__*.sql`):
  git không báo conflict khi hai branch cùng tạo `V16__...` nhưng app sẽ hỏng
  khi chạy. Lấy số = lớn nhất trên `origin/master` + 1, và kiểm lại bằng script
  ngay trước khi push; nếu master đã có số đó thì đổi tên file sang số kế tiếp.

## 3. Trước mỗi lần push

1. `git fetch origin master && git merge origin/master`; giải conflict nếu có.
   Khi cả hai bên cùng đổi một logic và giữ bên nào cũng mất hành vi → hỏi
   người dùng, còn lại tự giải.
2. Chạy test/lint của phần mình đụng:
   - web: `cd mvp-app/web && npm run build && npx vitest run && npm run lint`
   - mobile: `cd mvp-app/mobile && npx jest`
   - analyzer: `cd mvp-app/analyzer && PYTHONPATH=src python -m pytest -q`
   - backend: `cd mvp-app/backend && ./gradlew test` (nếu môi trường chặn tải
     dependency thì nói rõ là chưa build được, không coi là pass)
3. Chạy script → phải thoát 0. Rồi `git push -u origin <branch>`.

## 4. Merge vào master và dọn branch

- Merge bằng PR hoặc `git merge --no-ff`, giữ lịch sử. **Không bao giờ**:
  tạo commit "bản chụp" không có cha (orphan), force-push `master`, hay chép
  code từ branch này sang branch khác thay vì merge — làm vậy git không còn
  biết branch cũ đã vào master, và các branch đó thành "chưa merge" giả, gây
  conflict hàng loạt.
- Sau khi branch đã vào master: báo người dùng branch đó có thể xoá
  (session cloud thường không có quyền xoá branch khác trên GitHub).
- Branch còn commit nhưng code đã có ở master dưới dạng khác → không merge;
  kiểm bằng `git grep` tính năng chính trên `origin/master`, rồi báo là lỗi thời.

## 5. Báo cáo cuối task

Một đoạn ngắn: branch, đã push chưa, hơn/kém master bao nhiêu commit, merge
vào master sạch hay không, test nào đã chạy và kết quả, branch nào khác đang
đụng cùng file (nếu có).

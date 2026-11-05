#!/usr/bin/env bash
# Đổi bản đang chạy trên một máy (staging hoặc production) sang bản <sha> (doc/design-trien-khai-v1.md §5).
# Workflow .github/workflows/deploy.yml chép file này (của commit workflow), docker-compose.prod.yml và giam-sat/
# (của ĐÚNG commit sẽ lên) vào thư mục riêng của lượt rồi chạy file này từ đó:
#   bash /opt/vfit/luot/<mã lượt>-<lần chạy>/deploy.sh <sha 40 ký tự> <staging|production>
# Bản mới không chạy được thì tự quay về bản trước và thoát mã 1 để workflow báo đỏ.
# Output hiện trong log Actions của repo công khai, ai cũng đọc được: không in bí mật, không đọc .env ra màn
# hình, không chạy `docker compose config` trần (bẫy C2, C6).
set -euo pipefail
luot=$(dirname "$(readlink -f "$0")")
# Output đi qua tee -p chứ không thẳng ra ssh (bẫy 4.19). ssh đứt (huỷ lượt trên Actions) mà sshd biết thì nó
# đóng pipe; phiên không có pty nên script chết ở lần ghi kế tiếp, có thể giữa lúc đổi bản và đường quay về
# (`docker compose up` ghi tiến độ ra stderr). tee -p bỏ qua pipe hỏng, vẫn ghi đủ vào nhat-ky của lượt, nên
# script chạy tới hết. Đặt trước `exec 9>` để tee không kế thừa fd khoá. `cat` đọc tiếp nếu tee thoát (ssh đứt
# cùng lúc ổ đầy, tee hết chỗ ghi), không thì script lại chết vì SIGPIPE.
exec > >(tee -p "$luot/nhat-ky"; cat > /dev/null) 2>&1
cd /opt/vfit

moi=${1:-}
moi_truong=${2:-}
[[ $moi =~ ^[0-9a-f]{40}$ ]] || { echo "Mã commit phải đủ 40 ký tự 0-9a-f"; exit 2; }
[[ $moi_truong =~ ^(staging|production)$ ]] || { echo "Môi trường phải là staging hoặc production"; exit 2; }

# Mỗi máy một lượt tại một lúc (bẫy 4.19). concurrency của workflow không đủ: huỷ lượt trên Actions chỉ cắt
# ssh, script trên máy vẫn chạy tiếp tới hết (nhờ tee ở trên), còn GitHub cho lượt sau chạy ngay.
# Gặp khoá thì dừng chứ không chờ: lượt đang chờ mà bị huỷ cũng thành script mồ côi trên máy, có khoá lúc nào
# là tự deploy lúc đó, có khi đè lên bản mới hơn. Khoá tự nhả khi script thoát hay chết.
exec 9> .khoa-deploy
flock -n 9 || { echo "::error::Máy đang chạy một lượt deploy khác (thường là lượt vừa bị huỷ trên Actions: huỷ không dừng được script trên máy, nó chạy tiếp tới hết, có thể tới 30 phút). Lượt này chưa đổi gì trên máy. Chờ rồi bấm Re-run failed jobs"; exit 1; }
# ponytail: huỷ trên Actions không dừng được lượt đang chạy; nó chạy hết, đổi bản hoặc quay về trọn vẹn, xem
# /opt/vfit/luot/<lượt>/nhat-ky. Cần dừng thật thì vào máy kill tiến trình đó.

# IMAGE_TAG là mã commit, không phải bí mật. Đọc sau khi có khoá: lượt trước có thể vừa đổi nó.
cu=$(sed -n 's/^IMAGE_TAG=//p' .env)
echo "Bản đang chạy: $cu"
echo "Bản mới:       $moi ($moi_truong)"

# 1. Kéo image bản mới trước khi đổi gì: kéo hỏng (vd. image chưa có hay gói GHCR còn private) thì máy vẫn
#    nguyên bản cũ. Biến shell thắng .env nên chỉ lệnh này dùng tag mới. Compose phải nằm ở /opt/vfit để đọc
#    .env ở đó. Tên không phải .moi: lỡ Re-run một lượt có từ trước khi có khoá (workflow cũ, chép rồi mv .moi,
#    không khoá) thì nó không giành mất compose của lượt này.
cp "$luot/docker-compose.prod.yml" docker-compose.prod.yml.sap-len
IMAGE_TAG=$moi docker compose -f docker-compose.prod.yml.sap-len pull --quiet backend web analyzer

# 2. Production: backup DB trước khi đổi (bẫy 4.9). Migration Flyway của bản mới không lùi được, quay về image
#    cũ không gỡ được nó; khi đó chỉ file này cứu được dữ liệu. < /dev/null: exec -T đọc stdin (bẫy 2.12).
if [ "$moi_truong" = production ]; then
  mkdir -p -m 700 backup
  f="backup/vfit-$(date -u +%Y%m%dT%H%M%SZ)-truoc-deploy-${moi:0:7}.dump"
  # Ghi ra .tam, đủ mới đổi tên: pg_dump hỏng giữa chừng (ổ đầy...) thì không để lại file trông như backup tốt.
  # pg_dump thoát 0 mới coi là đủ; pg_restore -l chỉ chứng minh phần đầu file đọc được, không bắt được file cụt đuôi.
  (umask 077; docker compose exec -T postgres pg_dump -U fitness -d fitness -Fc > "$f.tam" < /dev/null) \
    || { rm -f "$f.tam"; echo "::error::pg_dump hỏng, chưa đổi gì trên máy"; exit 1; }
  muc=$(docker compose exec -T postgres pg_restore -l < "$f.tam" | grep -c '^[0-9]')
  mv "$f.tam" "$f"
  echo "Backup: $f ($(du -h "$f" | cut -f1), $muc mục)"
fi

# 3. Đổi sang bản mới, giữ compose cũ để quay về. IMAGE_TAG ghi vào .env chứ không chỉ đặt ở dòng lệnh: ai gõ
#    `docker compose up -d` tay về sau vẫn chạy đúng bản đang chạy (bẫy 4.14). sed -i giữ quyền 600 của .env.
#    giam-sat: cấu hình Prometheus, Grafana (chỉ production chạy, chép cả hai máy cho giống nhau; không có bí mật).
#    Chép trước khi đổi compose: hỏng thì chưa đổi gì khác. cp ghi đè tại chỗ như scp trước đây nên file gắn vào
#    container vẫn là file đó. Quay về không trả lại bản cũ của nó.
cp -r "$luot/giam-sat" .
cp docker-compose.prod.yml docker-compose.prod.yml.cu
mv docker-compose.prod.yml.sap-len docker-compose.prod.yml
sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$moi/" .env

# Tên, số lần tự khởi động lại, trạng thái của mọi container trong project.
trang_thai_container() {
  docker compose ps -aq | xargs docker inspect -f '{{.Name}} {{.RestartCount}} {{.State.Status}}'
}

# Thử tài khoản trên staging (spec §5): mỗi lần một tài khoản mới, staging chỉ có dữ liệu thử.
# Mật khẩu ngẫu nhiên, không in, không lưu; token không in.
thu_tai_khoan() {
  local email mk token
  email="ci.$(date -u +%Y%m%d%H%M%S)@fitness.test"
  mk=$(openssl rand -hex 16) || return 1
  curl -fsS -o /dev/null -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$mk\",\"fullName\":\"CI deploy\",\"phone\":\"0900000000\"}" \
    http://127.0.0.1:8088/api/v1/auth/register || return 1
  token=$(curl -fsS -H 'Content-Type: application/json' \
    -d "{\"email\":\"$email\",\"password\":\"$mk\"}" \
    http://127.0.0.1:8088/api/v1/auth/login | jq -er .accessToken) || return 1
  curl -fsS -o /dev/null -H "Authorization: Bearer $token" http://127.0.0.1:8088/api/v1/me/profile || return 1
  echo "Tài khoản thử $email: đăng ký, đăng nhập, đọc hồ sơ đều được"
}

# Hàm này được gọi trong `if`, nên bash bỏ qua set -e bên trong: mỗi lệnh phải tự `|| return 1` (bẫy 4.15).
kiem() {
  local truoc sau h
  # Chờ postgres, backend, web báo healthy (bẫy 4.8). Backend lên lần đầu kèm Flyway cần vài chục giây.
  docker compose up -d --wait --wait-timeout 300 || return 1
  # analyzer, cloudflared không có healthcheck: --wait chỉ chờ chúng "running", chết lặp vẫn qua (bẫy 4.12).
  # So số lần tự khởi động lại trước và sau 30 giây.
  truoc=$(trang_thai_container) || return 1
  sleep 30
  sau=$(trang_thai_container) || return 1
  [ "$truoc" = "$sau" ] || { printf 'Container tự khởi động lại trong 30 giây:\n%s\n' "$sau"; return 1; }
  echo "$sau"
  # Gọi qua cổng 127.0.0.1:8088 của chính máy, không qua Cloudflare (staging bị Access chặn, bẫy 2.2).
  curl -fsS -o /dev/null http://127.0.0.1:8088/ || return 1
  h=$(curl -fsS http://127.0.0.1:8088/api/health) || return 1
  [[ $h == *'"status":"UP"'* ]] || { echo "/api/health trả: $h"; return 1; }
  echo "/api/health: $h"
  if [ "$moi_truong" = staging ]; then thu_tai_khoan || return 1; fi
}

if ! kiem; then
  echo "::error::Bản $moi không chạy được trên $moi_truong, quay về bản $cu"
  mv docker-compose.prod.yml.cu docker-compose.prod.yml
  sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=$cu/" .env
  docker compose up -d --wait --wait-timeout 300 \
    || echo "::error::Quay về bản $cu cũng không lên đủ, phải vào máy xem"
  docker compose ps -a --format '{{.Service}}: {{.Status}}'
  exit 1
fi
echo "Bản $moi chạy tốt trên $moi_truong"

# 4. Dọn image cũ cho khỏi đầy ổ (bẫy 4.10): giữ bản vừa lên và bản ngay trước để quay về ngay, bản cũ hơn vẫn
#    kéo lại được từ GHCR. `image prune` không có -a: chỉ xoá lớp lơ lửng, không xoá image nào đang có tag.
for phan in backend web analyzer; do
  docker image ls "ghcr.io/thanhlam1906/vfit-$phan" --format '{{.Tag}}' \
    | grep -vxF -e "$moi" -e "$cu" \
    | xargs -r -I{} docker image rm "ghcr.io/thanhlam1906/vfit-$phan:{}" > /dev/null || true
done
docker image prune -f > /dev/null
echo "Ổ đĩa: $(df -h / | tail -1)"

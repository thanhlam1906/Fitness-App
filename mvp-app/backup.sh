#!/usr/bin/env bash
# Backup DB production ra Google Drive, mỗi ngày một bản, giữ 7 bản (doc/design-trien-khai-v1.md §6 giai đoạn 5).
# Trên máy: /opt/vfit/backup.sh, crontab của user deploy gọi 15 phút một lần:
#   */15 * * * * bash /opt/vfit/backup.sh >> /opt/vfit/backup/backup.log 2>&1
# (gọi qua bash: git trên Windows lưu file .sh mode 644, không có quyền chạy, bẫy 1.17)
# Máy ảo tắt hay ngủ đúng giờ thì cron không chạy bù (bẫy 5.13), nên gọi dày: đã đẩy bản của hôm nay (giờ VN)
# thì thoát ngay, không ghi gì. Máy bật lúc nào thì trong 15 phút có bản của ngày đó.
# Bản dump được rclone crypt mã hoá trước khi lên Drive. Cấu hình rclone (token Drive, mật khẩu mã hoá) ở
# /opt/vfit/rclone/rclone.conf, quyền 600, do người dùng tự tạo bằng script đăng nhập; script này không đọc
# hay in nó, cũng không đọc .env (bẫy 5.12, C6). Dump trước mỗi lần deploy (deploy.sh) không đụng tới.
set -euo pipefail
cd /opt/vfit

GIU=7
# Ghim cả digest (bẫy C3, 5.11): image này cầm mật khẩu mã hoá.
ANH_RCLONE=rclone/rclone:1.75.2@sha256:2687085f718d3c628f7fdfb77c52a1d344332aed543110bb88088f2c70d43eb5
THU_MUC=backup/hang-ngay
# Chuỗi TZ kiểu POSIX (UTC-7 nghĩa là UTC+7): không cần tzdata trên máy, thiếu tzdata thì tên zone âm thầm
# thành UTC và tên ngày lệch 7 tiếng. VN không có giờ mùa hè nên đủ.
ngay=$(TZ=UTC-7 date +%Y%m%d)
ten=vfit-$ngay.dump
# Ghi tên bản vừa đẩy xong. Giờ sửa file = lần cuối thành công: giai đoạn 6 báo khi cũ hơn 26 giờ (bẫy 5.6).
moc=$THU_MUC/.lan-cuoi

mkdir -p -m 700 backup "$THU_MUC"
exec 9> "$THU_MUC/.khoa"
flock -n 9 || exit 0
[ "$(cat "$moc" 2> /dev/null)" = "$ten" ] && exit 0
# .tam của lượt bị giết giữa chừng (máy ảo tắt lúc đang dump) không bị ghi đè vì hôm sau tên đã khác.
rm -f "$THU_MUC"/vfit-*.dump.tam

ghi() { echo "$(date -u +%FT%TZ) $*"; }

# Chưa đăng nhập Google thì dừng ở đây: docker run -v với thư mục chưa có sẽ tạo nó bằng root, deploy không sửa
# được và script đăng nhập ghi config vào đó sẽ hỏng. Chỉ kiểm file có mặt, không đọc nội dung.
[ -f rclone/rclone.conf ] || { ghi "LỖI chưa có rclone/rclone.conf (chạy script đăng nhập trước)"; exit 1; }

# Image chạy root thì file nó ghi (kể cả rclone.conf khi tự làm mới token) thành của root: chạy bằng uid của
# deploy. Gắn cả thư mục config, không chỉ file: rclone đổi tên file khi ghi token mới (bẫy 5.11).
rclone() {
  docker run --rm --user "$(id -u):$(id -g)" \
    -v /opt/vfit/rclone:/config/rclone -v "$PWD/$THU_MUC:/data:ro" "$ANH_RCLONE" "$@"
}

# 1. Dump: pg_dump -Fc nhất quán khi DB đang chạy (bẫy 5.1). Ghi .tam, đủ mới đổi tên, như deploy.sh: hỏng
#    giữa chừng thì không để lại file trông như bản tốt. Đã có bản hôm nay (lượt trước đẩy hỏng) thì đẩy lại nó.
#    < /dev/null: exec -T đọc stdin (bẫy 2.12).
if [ ! -f "$THU_MUC/$ten" ]; then
  (umask 077; docker compose exec -T postgres pg_dump -U fitness -d fitness -Fc > "$THU_MUC/$ten.tam" < /dev/null) \
    || { rm -f "$THU_MUC/$ten.tam"; ghi "LỖI pg_dump, lượt sau thử lại"; exit 1; }
  mv "$THU_MUC/$ten.tam" "$THU_MUC/$ten"
fi

# 2. Đẩy lên Drive qua remote crypt (mã hoá trên máy), rồi kiểm bản trên Drive đúng từng byte với bản ở máy.
rclone copy -q "/data/$ten" vfit-mahoa: || { ghi "LỖI đẩy $ten lên Drive, lượt sau thử lại"; exit 1; }
rclone cryptcheck -q --one-way --include "$ten" /data vfit-mahoa: \
  || { ghi "LỖI bản $ten trên Drive không khớp bản ở máy"; exit 1; }

# 3. Giữ 7 bản mới nhất, trên Drive và ở máy. Tên có ngày nên xếp theo tên là xếp theo ngày. Xoá theo số đếm,
#    không dùng `rclone sync`: thư mục máy lỡ trống thì sync xoá sạch Drive (bẫy 5.15). Bản xoá trên Drive vào
#    thùng rác 30 ngày.
tren_drive=$(rclone lsf -q --files-only --include 'vfit-????????.dump' vfit-mahoa: | sort) \
  || { ghi "LỖI đọc danh sách bản trên Drive"; exit 1; }
for f in $(head -n -"$GIU" <<< "$tren_drive"); do
  rclone deletefile -q "vfit-mahoa:$f" || { ghi "LỖI xoá bản cũ $f trên Drive"; exit 1; }
done
printf '%s\n' "$THU_MUC"/vfit-????????.dump | sort | head -n -"$GIU" | xargs -r rm -f --

printf '%s\n' "$ten" > "$moc"
so=$(grep -c . <<< "$tren_drive" || true)
ghi "Đã đẩy $ten ($(du -h "$THU_MUC/$ten" | cut -f1)) lên Drive, trên Drive còn $((so < GIU ? so : GIU)) bản"

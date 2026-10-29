#!/usr/bin/env bash
# Người dùng tự chạy để Grafana gửi email cảnh báo qua Gmail. Từ PowerShell của laptop:
#   ssh -t deploy@vps-gia "bash /opt/vfit/giam-sat/nhap-mat-khau-gmail.sh"
# Dán "mật khẩu ứng dụng" 16 chữ của Google: chữ không hiện khi dán, không vào lịch sử lệnh, ghi thẳng vào
# /opt/vfit/.env (quyền 600) dòng GMAIL_APP_PASSWORD (bẫy C2, 2.1). Không in lại.
set -euo pipefail
cd /opt/vfit

read -rsp "Dán mật khẩu ứng dụng Gmail rồi Enter (chữ không hiện là bình thường): " mk
echo
# Google hiện mật khẩu thành 4 nhóm cách nhau bằng dấu cách; bỏ dấu cách đi.
mk=${mk// /}
if [[ ! $mk =~ ^[a-z]{16}$ ]]; then
  echo "Không phải 16 chữ thường a-z (đang có ${#mk} ký tự). Chưa ghi gì, chạy lại và dán lại."
  exit 1
fi
sed -i '/^GMAIL_APP_PASSWORD=/d' .env
# Dòng cuối thiếu xuống dòng thì dòng mới dính vào biến trước nó, hỏng cả hai.
[ -z "$(tail -c1 .env)" ] || echo >> .env
printf 'GMAIL_APP_PASSWORD=%s\n' "$mk" >> .env
unset mk
echo "Đã ghi vào /opt/vfit/.env. Báo lại cho Claude để bật Grafana và gửi thử email."

#!/usr/bin/env bash
# Tạo (hoặc làm lại) role Postgres chỉ đọc cho Grafana: grafana_doc, chỉ đọc cột status, created_at của
# video_review_requests (bảng Hàng đợi chấm form). Chạy trên máy production, user deploy:
#   bash /opt/vfit/giam-sat/tao-role-grafana.sh
# Chạy lại bao nhiêu lần cũng được. PHẢI chạy lại sau khi khôi phục DB vào Postgres mới (giai đoạn 8): role là
# đối tượng của cả cụm, pg_dump không mang theo (bẫy 5.3). Bản dump có lệnh GRANT cho grafana_doc, nên khôi phục
# vào cụm chưa có role thì pg_restore --exit-on-error dừng ở lỗi "role does not exist": chạy script này TRƯỚC
# pg_restore, hoặc khôi phục kèm --no-acl rồi chạy script này sau.
# Mật khẩu: lấy GRAFANA_DB_PASSWORD trong /opt/vfit/.env, chưa có thì sinh mới và ghi vào. Không in ra, không lên
# dòng lệnh: đi vào container bằng biến môi trường, psql đọc bằng \getenv (bẫy C2, C6, 2.1).
set -euo pipefail
cd /opt/vfit

if ! grep -q '^GRAFANA_DB_PASSWORD=.' .env; then
  # hex: không có ký tự nào cần thoát trong SQL hay trong file provisioning của Grafana.
  sed -i '/^GRAFANA_DB_PASSWORD=/d' .env
  # Dòng cuối thiếu xuống dòng thì dòng mới dính vào biến trước nó, hỏng cả hai.
  [ -z "$(tail -c1 .env)" ] || echo >> .env
  printf 'GRAFANA_DB_PASSWORD=%s\n' "$(openssl rand -hex 24)" >> .env
  echo "Đã sinh GRAFANA_DB_PASSWORD mới trong .env"
fi
GRAFANA_DB_PASSWORD=$(sed -n 's/^GRAFANA_DB_PASSWORD=//p' .env)
export GRAFANA_DB_PASSWORD

# 1. Role và quyền. Không có mật khẩu trong phần này nên lỗi in ra được.
docker compose exec -T postgres psql -U fitness -d fitness -v ON_ERROR_STOP=1 -q <<'SQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'grafana_doc') THEN
    CREATE ROLE grafana_doc LOGIN;
  END IF;
END
$$;
ALTER ROLE grafana_doc NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
-- Lỡ có câu ghi lọt qua cũng bị từ chối; truy vấn treo không giữ kết nối quá 10 giây.
ALTER ROLE grafana_doc SET default_transaction_read_only = on;
ALTER ROLE grafana_doc SET statement_timeout = '10s';
GRANT CONNECT ON DATABASE fitness TO grafana_doc;
GRANT USAGE ON SCHEMA public TO grafana_doc;
-- Chỉ hai cột: không đọc được user_id, lý do lỗi hay bảng nào khác.
GRANT SELECT (status, created_at) ON video_review_requests TO grafana_doc;
SQL

# 2. Mật khẩu. Lệnh lỗi thì psql in lại câu SQL đã thay biến (có mật khẩu), nên nuốt hết output, chỉ báo mã.
if docker compose exec -T -e GRAFANA_DB_PASSWORD postgres psql -U fitness -d fitness -v ON_ERROR_STOP=1 -q \
    > /dev/null 2>&1 <<'SQL'
\getenv mk GRAFANA_DB_PASSWORD
-- Lệnh lỗi thì server ghi cả câu (có mật khẩu) vào docker logs: tắt cho riêng phiên này.
SET log_min_error_statement = panic;
ALTER ROLE grafana_doc PASSWORD :'mk';
SQL
then
  echo "Role grafana_doc sẵn sàng"
else
  echo "LỖI đặt mật khẩu cho grafana_doc (output đã giấu vì có thể chứa mật khẩu)"
  exit 1
fi

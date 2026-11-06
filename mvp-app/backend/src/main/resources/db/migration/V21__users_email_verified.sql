-- doc/design-dang-nhap-mxh-v1.md §3. Đăng ký bằng email không xác minh email, nên người khác có thể đăng ký
-- trước bằng email của bạn. Lần đầu Google/Facebook chứng minh chủ email, mật khẩu cũ bị thay và mọi phiên
-- bị thu hồi; cờ này để những lần sau không làm lại (không thì mỗi lần bấm Google là đăng xuất máy khác).
ALTER TABLE users ADD COLUMN email_verified boolean NOT NULL DEFAULT false;

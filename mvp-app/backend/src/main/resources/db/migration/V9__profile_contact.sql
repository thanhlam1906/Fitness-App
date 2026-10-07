-- M1 doc/design-ui-m1-v1.md §4: form đăng ký hỏi họ tên, số điện thoại.
-- Cho phép null: user cũ và user đăng nhập mạng xã hội sau này không có hai trường này.
ALTER TABLE profiles
    ADD COLUMN full_name text,
    ADD COLUMN phone     text;

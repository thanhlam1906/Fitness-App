-- Chấm form theo ngưỡng admin nhập, bỏ LLM (doc/design-cham-form-nguong-v1.md §7).
-- Tên mục hiện trên màn kết quả; lúc đo trong mỗi rep: đầu rep hoặc điểm sâu nhất.
ALTER TABLE form_checks ADD COLUMN name_vi text;
ALTER TABLE form_checks ADD COLUMN moment text CHECK (moment IN ('START', 'PEAK'));
-- Ngưỡng kiểu cũ (pass_below…) tắt chứ không xoá: review_results cũ còn trỏ tới.
-- Viết "->'warn' IS NULL" thay toán tử "?" của jsonb để không lẫn với dấu tham số JDBC.
UPDATE form_checks SET is_active = false WHERE thresholds -> 'warn' IS NULL;

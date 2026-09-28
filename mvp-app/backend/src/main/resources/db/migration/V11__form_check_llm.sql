-- Chấm form bằng LLM (doc/design-cham-form-llm-v1.md §5.1).
-- Màn camera gửi toạ độ khớp khi chưa biết bài: analyzer nhận diện rồi mới điền exercise_id.
ALTER TABLE video_review_requests ALTER COLUMN exercise_id DROP NOT NULL;
-- Bộ số từng rep do analyzer tính. Chỉ số, không hình: clip vẫn xoá ngay sau khi chấm (N2),
-- còn bộ số giữ lại để chọn bài khác và chấm lại mà không phải tập lại.
ALTER TABLE video_review_requests ADD COLUMN features jsonb;
-- Mục do LLM chấm không gắn form_check nào; tên mục lưu thẳng ở đây.
ALTER TABLE review_results ALTER COLUMN form_check_id DROP NOT NULL;
ALTER TABLE review_results ADD COLUMN name_vi text;

-- Bất biến 3: câu trả lời trợ lý cũng có nút "cái này sai". Dùng chung bảng cue_feedback với kết
-- quả chấm form và quyết định tải để giữ được lời giải thích của người dùng (note); cột
-- assistant_messages.is_wrong (V7) không có chỗ cho note.
ALTER TABLE cue_feedback
    ADD COLUMN assistant_message_id uuid REFERENCES assistant_messages(id) ON DELETE CASCADE;

ALTER TABLE cue_feedback DROP CONSTRAINT cue_feedback_check;
ALTER TABLE cue_feedback
    ADD CONSTRAINT cue_feedback_check
        CHECK (num_nonnulls(review_result_id, load_decision_id, assistant_message_id) = 1);

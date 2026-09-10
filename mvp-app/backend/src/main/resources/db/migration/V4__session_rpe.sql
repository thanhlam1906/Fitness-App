-- Màn 6 concept-frontend-v1.md: "RPE hỏi mềm, bỏ qua được" ở mức CẢ BUỔI.
-- RPE từng set đã có ở set_logs; đây là cảm nhận chung của buổi, người dùng
-- trả lời một lần khi kết buổi. NULL = đã bỏ qua câu hỏi, không phải 0.
ALTER TABLE workout_sessions
    ADD COLUMN session_rpe smallint CHECK (session_rpe BETWEEN 1 AND 10);

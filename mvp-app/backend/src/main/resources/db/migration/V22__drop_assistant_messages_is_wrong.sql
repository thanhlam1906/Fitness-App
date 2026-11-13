-- Góp ý "cái này sai" cho câu trả lời trợ lý nằm ở cue_feedback (V12, có ghi chú), không ở cột này.
-- Field AssistantMessage.isWrong đã bỏ và bản đó đã lên production trước khi xoá cột: xoá cùng lúc thì
-- quay về bản cũ, Hibernate đòi cột không còn, backend không khởi động được (decisions 11-04).
ALTER TABLE assistant_messages DROP COLUMN IF EXISTS is_wrong;

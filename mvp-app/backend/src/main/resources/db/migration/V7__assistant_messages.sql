-- Log hội thoại trợ lý + nguồn dùng cho eval. concept-chatbot-v1.md §6.
-- Cũng LÀ bộ nhớ hội thoại: đọc N lượt gần nhất theo thread_id, không dùng
-- bảng ChatMemory riêng của Spring AI — một bảng phục vụ cả hai việc là đủ.
CREATE TABLE assistant_messages (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id    uuid NOT NULL,
    role         text NOT NULL CHECK (role IN ('USER','ASSISTANT')),
    content      text NOT NULL,
    intent       text,                -- 'A','B','C','D_BLOCKED'
    chunk_ids    uuid[],
    tools_called text[],
    guard_result text,                -- 'OK' | 'NUMBERS_UNGROUNDED' | 'BLOCKED_D'
    is_wrong     boolean,
    created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON assistant_messages (user_id, thread_id, created_at);

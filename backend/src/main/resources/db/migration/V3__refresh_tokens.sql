-- Auth thật: access token JWT ngắn hạn (15 phút) + refresh token đối trọng,
-- lưu DB để revoke được (JWT refresh sẽ không revoke được nếu không có bảng
-- này — concept-backend-v1.md §5 tự đánh dấu đây là việc "thêm khi cần").
-- Lưu HASH (SHA-256) của token, không lưu token thật — rò DB không lộ token.
CREATE TABLE refresh_tokens (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  text NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON refresh_tokens (user_id);

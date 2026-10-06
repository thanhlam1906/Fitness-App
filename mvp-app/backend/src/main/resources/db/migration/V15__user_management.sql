-- doc/design-quan-ly-user-v1.md §3. Mốc cắt tới giây vì JWT iat tính bằng giây:
-- token cấp ngay sau khi dời mốc trong cùng giây vẫn phải dùng được.
ALTER TABLE users
    ADD COLUMN tokens_valid_after   timestamptz NOT NULL DEFAULT date_trunc('second', now()),
    ADD COLUMN must_change_password boolean     NOT NULL DEFAULT false;

CREATE TABLE admin_audit_log (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id      uuid REFERENCES users(id) ON DELETE SET NULL,
    actor_email   text NOT NULL,
    -- NULL = tài khoản đã bị xoá; dòng nhật ký vẫn còn nhờ target_email.
    target_id     uuid REFERENCES users(id) ON DELETE SET NULL,
    target_email  text NOT NULL,
    action        text NOT NULL
                  CHECK (action IN ('CREATE','LOCK','UNLOCK','CHANGE_ROLE','RESET_PASSWORD','DELETE')),
    detail        jsonb,
    reason        text,
    created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX admin_audit_log_target ON admin_audit_log (target_id, created_at DESC);
CREATE INDEX admin_audit_log_created ON admin_audit_log (created_at DESC);

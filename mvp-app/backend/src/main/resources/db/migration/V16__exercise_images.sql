-- Ảnh minh hoạ bài tập do admin chọn (doc/design-anh-bai-tap-v1.md §3).
-- Cất trong Postgres để bản sao lưu DB hằng ngày giữ luôn ảnh, không phải sao lưu thêm thư mục.
-- Khoá theo slug, KHÔNG khoá ngoại sang exercises: Flyway chạy R__seed_content.sql (nơi tạo 20 bài)
-- SAU mọi migration có số, nên lúc V17 nạp ảnh chưa có bài nào. Slug bất biến sau khi tạo và bài
-- không bao giờ xoá cứng (ExerciseService chỉ tắt active), nên không có ảnh mồ côi.
CREATE TABLE exercise_images (
    slug         text        NOT NULL,
    kind         text        NOT NULL CHECK (kind IN ('STILL', 'ANIMATED')),
    content_type text        NOT NULL,
    bytes        bytea       NOT NULL,
    updated_at   timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (slug, kind)
);

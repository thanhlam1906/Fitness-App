-- Hướng dẫn ngắn ở khung chi tiết bài (doc/design-anh-dong-v1.md §3). Nội dung ở R__seed_content.sql.
ALTER TABLE exercises
    ADD COLUMN steps_vi    text[] NOT NULL DEFAULT '{}',
    ADD COLUMN mistakes_vi text[] NOT NULL DEFAULT '{}';

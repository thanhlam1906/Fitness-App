-- Tìm tên bài gần đúng cho trợ lý (doc/design-thu-vien-bai-v1.md §7.1).
CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- "Chưa duyệt" tách khỏi "đã xoá": cả hai đều is_active = false, nhưng trợ lý vẫn tra bài chưa duyệt (§4.2).
ALTER TABLE exercises ADD COLUMN is_draft boolean NOT NULL DEFAULT false;
-- Ảnh trên Cloudinary: dòng có url thay cho bytes; ảnh admin tải lên vẫn là bytes (§4.7).
ALTER TABLE exercise_images ADD COLUMN url text;
ALTER TABLE exercise_images ALTER COLUMN bytes DROP NOT NULL;
ALTER TABLE exercise_images ADD CONSTRAINT exercise_images_bytes_or_url CHECK (bytes IS NOT NULL OR url IS NOT NULL);

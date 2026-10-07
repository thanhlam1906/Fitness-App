-- File PDF đã thả nhưng CHƯA vào kho (doc/design-nap-tai-lieu-v1.md §4). Duyệt hoặc bỏ thì xoá
-- dòng; tài liệu đã duyệt nằm ở documents + doc_chunks như cũ.
CREATE TABLE corpus_uploads (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    file_name  text NOT NULL,   -- tên file gốc; thành documents.source khi duyệt
    status     text NOT NULL CHECK (status IN ('PROCESSING', 'READY', 'FAILED')),
    markdown   text,            -- có khi READY
    error      text,            -- có khi FAILED, chữ tiếng Việt hiện thẳng cho admin
    created_at timestamptz NOT NULL DEFAULT now()
);

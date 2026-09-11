-- Kho kiến thức cho trợ lý (concept-chatbot-v1.md §6). Bậc 1: full-text, KHÔNG embedding.
-- Chunk sinh offline bằng Docling → content/corpus/*.md → CorpusLoader nạp vào đây.
CREATE EXTENSION IF NOT EXISTS "unaccent";   -- "giam tai" khớp "giảm tải"

-- unaccent() là STABLE nên không được dùng trong cột GENERATED / index.
-- Ghim từ điển cố định thì kết quả không đổi → khai IMMUTABLE được.
CREATE FUNCTION immutable_unaccent(text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE STRICT
    RETURN public.unaccent('public.unaccent', $1);

CREATE TABLE documents (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title       text NOT NULL,
    source      text NOT NULL UNIQUE,   -- tên file trong content/corpus, khoá để nạp lại idempotent
    topic       text,
    license     text NOT NULL,          -- N5: 'unknown' ở MVP, phải rà trước khi phát hành
    ingested_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE doc_chunks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id  uuid NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    ord          integer NOT NULL,
    heading_path text,
    content      text NOT NULL,
    -- Cột sinh: ghi content là index tự đúng, không có bước "nhớ cập nhật".
    -- 'simple' + unaccent: tiếng Việt ít biến hình, không cần stemming.
    ts           tsvector GENERATED ALWAYS AS (to_tsvector('simple', immutable_unaccent(content))) STORED,
    UNIQUE (document_id, ord)
);
CREATE INDEX doc_chunks_ts_idx ON doc_chunks USING gin (ts);

-- Bậc 2 trợ lý (concept-chatbot-v1.md §5.2): thêm vector, KHÔNG thay thế FTS —
-- hybrid gộp cả hai bằng RRF ở tầng Java, đúng thiết kế §5.1 "bậc 2 chỉ đổi
-- một bean". Cột nullable: chunk cũ chưa có embedding vẫn tìm được qua FTS,
-- CorpusLoader nạp lại sẽ tự điền.
CREATE EXTENSION IF NOT EXISTS vector;

-- 512 chiều: text-embedding-3-small hỗ trợ rút gọn (Matryoshka), giảm 3 lần
-- dung lượng/tốc độ so với 1536 mặc định, đủ tốt cho corpus vài trăm chunk.
ALTER TABLE doc_chunks ADD COLUMN embedding vector(512);

-- HNSW + cosine — model OpenAI tối ưu cho cosine distance, không phải L2.
CREATE INDEX doc_chunks_embedding_idx ON doc_chunks USING hnsw (embedding vector_cosine_ops);

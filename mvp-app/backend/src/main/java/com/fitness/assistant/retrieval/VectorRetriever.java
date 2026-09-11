package com.fitness.assistant.retrieval;

import java.util.List;
import java.util.UUID;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Bậc 2 (concept-chatbot-v1.md §5.2): tìm theo nghĩa qua embedding, bắt được
 * câu hỏi khác từ với tài liệu ("giảm mỡ" ↔ "thâm hụt calo") mà FTS bỏ lỡ.
 *
 * Khác FTS ở một điểm quan trọng: vector search LUÔN trả về "hàng xóm gần
 * nhất" cho bất kỳ câu hỏi nào, kể cả câu hoàn toàn ngoài corpus — không có
 * tín hiệu "không tìm thấy gì" tự nhiên như FTS (`@@` không khớp → 0 dòng).
 * Không có ngưỡng thì mọi câu hỏi đều "có vẻ" tìm ra tài liệu, phá đúng hành
 * vi "không có trong tài liệu" đã chốt ở AssistantService. MAX_COSINE_DISTANCE
 * là hàng rào cho việc đó.
 */
@Service
public class VectorRetriever {

	// ponytail: ngưỡng tay, chưa hiệu chỉnh bằng dữ liệu lớn — tinh khi bộ eval
	// (§11) cho thấy chunk không liên quan vẫn lọt qua, hoặc chunk liên quan bị
	// loại oan. 0 = giống hệt, 2 = đối lập hoàn toàn (cosine distance).
	static final double MAX_COSINE_DISTANCE = 0.6;

	private final JdbcTemplate jdbc;
	private final EmbeddingModel embeddingModel;

	public VectorRetriever(JdbcTemplate jdbc, EmbeddingModel embeddingModel) {
		this.jdbc = jdbc;
		this.embeddingModel = embeddingModel;
	}

	public List<FtsRetriever.Chunk> search(String question, int limit) {
		String queryVector = EmbeddingFormat.toVectorLiteral(embeddingModel.embed(question));

		return jdbc.query("""
				SELECT c.id, d.title, c.heading_path, c.content
				FROM doc_chunks c
				JOIN documents d ON d.id = c.document_id
				WHERE c.embedding IS NOT NULL AND (c.embedding <=> ?::vector) < ?
				ORDER BY c.embedding <=> ?::vector
				LIMIT ?
				""",
				(rs, i) -> new FtsRetriever.Chunk(
						UUID.fromString(rs.getString("id")), rs.getString("title"),
						rs.getString("heading_path"), rs.getString("content")),
				queryVector, MAX_COSINE_DISTANCE, queryVector, limit);
	}
}

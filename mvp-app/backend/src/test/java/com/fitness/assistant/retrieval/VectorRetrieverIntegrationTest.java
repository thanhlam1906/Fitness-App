package com.fitness.assistant.retrieval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/**
 * §5.2: tìm theo cosine similarity thật qua pgvector, và MAX_COSINE_DISTANCE
 * phải loại được chunk không liên quan — khác FTS, vector search không có
 * "0 kết quả" tự nhiên nên ngưỡng này là hàng rào duy nhất.
 */
class VectorRetrieverIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private VectorRetriever retriever;
	@Autowired
	private JdbcTemplate jdbc;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	@Test
	void search_returnsCloseChunk_excludesFarChunk() {
		float[] closeVector = unitVector(5); // trùng hướng với câu hỏi
		float[] farVector = unitVector(6); // vuông góc — cosine distance = 1.0
		seedChunk("Gần", closeVector);
		seedChunk("Xa", farVector);
		when(embeddingModel.embed(anyString())).thenReturn(unitVector(5));

		List<FtsRetriever.Chunk> hits = retriever.search("câu hỏi", 5);

		assertThat(hits).extracting(FtsRetriever.Chunk::headingPath).contains("Gần").doesNotContain("Xa");
	}

	@Test
	void search_ranksClosestFirst() {
		seedChunk("Gần nhất", unitVector(5));
		seedChunk("Gần vừa", scaledVector(5, 6, 0.5f)); // lệch 1 chiều, vẫn dưới ngưỡng
		when(embeddingModel.embed(anyString())).thenReturn(unitVector(5));

		List<FtsRetriever.Chunk> hits = retriever.search("câu hỏi", 5);

		assertThat(hits.get(0).headingPath()).isEqualTo("Gần nhất");
	}

	private void seedChunk(String heading, float[] embedding) {
		UUID docId = jdbc.queryForObject(
				"INSERT INTO documents (title, source, license) VALUES (?, ?, 'unknown') RETURNING id",
				UUID.class, "Tài liệu test", "test-" + UUID.randomUUID());
		jdbc.update("""
				INSERT INTO doc_chunks (document_id, ord, heading_path, content, embedding)
				VALUES (?, 0, ?, 'nội dung', ?::vector)
				""", docId, heading, EmbeddingFormat.toVectorLiteral(embedding));
	}

	private static float[] unitVector(int dimension) {
		float[] v = new float[512];
		v[dimension] = 1f;
		return v;
	}

	private static float[] scaledVector(int mainDim, int secondaryDim, float secondaryWeight) {
		float[] v = new float[512];
		v[mainDim] = 1f;
		v[secondaryDim] = secondaryWeight;
		return v;
	}
}

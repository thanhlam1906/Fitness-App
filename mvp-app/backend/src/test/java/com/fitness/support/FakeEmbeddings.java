package com.fitness.support;

import java.util.ArrayList;
import java.util.List;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingResponse;

/**
 * Embedding giả cho test: đúng shape vector(512) để INSERT không lỗi, không cần đúng nghĩa.
 * KHÔNG toàn số 0: pgvector báo lỗi "zero vector" khi tính cosine, mà container Postgres dùng
 * chung giữa các test class — một hàng toàn 0 làm hỏng test khác quét cả bảng doc_chunks.
 */
public final class FakeEmbeddings {

	private FakeEmbeddings() {
	}

	public static EmbeddingResponse of(List<String> texts) {
		List<Embedding> embeddings = new ArrayList<>();
		for (int i = 0; i < texts.size(); i++) {
			float[] fake = new float[512];
			fake[0] = 1f;
			embeddings.add(new Embedding(fake, i));
		}
		return new EmbeddingResponse(embeddings);
	}
}

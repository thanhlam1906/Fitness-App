package com.fitness.assistant.retrieval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.fitness.assistant.retrieval.FtsRetriever.Chunk;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * RRF thuần, không cần Postgres/OpenAI — mock cả 2 retriever con để kiểm
 * đúng logic gộp hạng (concept-chatbot-v1.md §5.2).
 */
class HybridRetrieverTest {

	private final FtsRetriever fts = mock(FtsRetriever.class);
	private final VectorRetriever vector = mock(VectorRetriever.class);
	private final HybridRetriever hybrid = new HybridRetriever(fts, vector);

	@Test
	void chunkFoundByBothRetrievers_ranksAboveChunkFoundByOnlyOne() {
		Chunk both = chunk("cả hai tìm ra");
		Chunk onlyFts = chunk("chỉ FTS");
		Chunk onlyVector = chunk("chỉ vector");

		when(fts.search(anyString(), anyInt())).thenReturn(List.of(both, onlyFts));
		when(vector.search(anyString(), anyInt())).thenReturn(List.of(both, onlyVector));

		List<Chunk> result = hybrid.search("câu hỏi", 5);

		assertThat(result.get(0)).isEqualTo(both);
		assertThat(result).hasSize(3);
	}

	@Test
	void chunkFoundOnlyByVector_stillSurfaces() {
		// Đúng lý do hybrid tồn tại: câu hỏi khác từ với tài liệu, FTS trượt hoàn
		// toàn, nhưng vector vẫn tìm ra theo nghĩa (§5.2).
		Chunk semanticOnly = chunk("khác từ nhưng cùng nghĩa với câu hỏi");
		when(fts.search(anyString(), anyInt())).thenReturn(List.of());
		when(vector.search(anyString(), anyInt())).thenReturn(List.of(semanticOnly));

		List<Chunk> result = hybrid.search("câu hỏi", 5);

		assertThat(result).containsExactly(semanticOnly);
	}

	@Test
	void limitsResultCount_evenWhenBothRetrieversReturnMore() {
		List<Chunk> many = List.of(chunk("1"), chunk("2"), chunk("3"), chunk("4"));
		when(fts.search(anyString(), anyInt())).thenReturn(many);
		when(vector.search(anyString(), anyInt())).thenReturn(List.of());

		List<Chunk> result = hybrid.search("câu hỏi", 2);

		assertThat(result).hasSize(2);
	}

	private static Chunk chunk(String heading) {
		return new Chunk(UUID.randomUUID(), "Tài liệu", heading, "nội dung");
	}
}

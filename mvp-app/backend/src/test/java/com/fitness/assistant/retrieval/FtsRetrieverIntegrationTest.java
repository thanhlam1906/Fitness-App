package com.fitness.assistant.retrieval;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

/** §5.1: câu hỏi tự nhiên phải khớp (bỏ hư từ), câu ngoài corpus phải ra rỗng. */
class FtsRetrieverIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private FtsRetriever retriever;
	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void search_stripsStopwords_andFindsNaturalQuestion() {
		seedChunk("RPE và mức độ cố gắng", "RPE (Rate of Perceived Exertion) là thang đo mức độ cố gắng "
				+ "trong một set, từ 1 đến 10. RPE 8 nghĩa là còn 2 rep nữa mới thất bại.");

		List<FtsRetriever.Chunk> hits = retriever.search("RPE là gì vậy", 5);

		// contains, không containsExactly: container Postgres dùng chung giữa các
		// test class (PostgresIntegrationTest), chunk của test khác cũng có thể khớp "rpe".
		assertThat(hits).extracting(FtsRetriever.Chunk::headingPath).contains("RPE và mức độ cố gắng");
	}

	@Test
	void search_findsChunk_whenQuestionIsMostlyDomainGenericWords() {
		// eval-v1 A08 (eval/report-v1.md): "RPE dùng để làm gì trong theo dõi tập
		// luyện?" ra 0 chunk dù corpus nói rất nhiều về RPE — "tập"/"luyện"/"theo
		// dõi"/"dùng"/"làm" xuất hiện trong gần MỌI chunk nên pha loãng ngưỡng 50%.
		seedChunk("RPE và mức độ cố gắng", "RPE (Rate of Perceived Exertion) là thang đo mức độ cố gắng "
				+ "trong một set, từ 1 đến 10. RPE giúp điều chỉnh tải trọng tập luyện cho phù hợp.");

		List<FtsRetriever.Chunk> hits = retriever.search("RPE dùng để làm gì trong theo dõi tập luyện?", 5);

		assertThat(hits).extracting(FtsRetriever.Chunk::headingPath).contains("RPE và mức độ cố gắng");
	}

	@Test
	void search_returnsEmpty_whenQuestionOutsideCorpus() {
		seedChunk("RPE và mức độ cố gắng", "RPE (Rate of Perceived Exertion) là thang đo mức độ cố gắng.");

		// "ăn" và "mỡ" không có trong corpus; "giảm" có nhưng một từ chung
		// không đủ để coi là liên quan — minMatches lọc bỏ.
		List<FtsRetriever.Chunk> hits = retriever.search("ăn gì để giảm mỡ", 5);

		assertThat(hits).isEmpty();
	}

	private void seedChunk(String heading, String content) {
		UUID docId = jdbc.queryForObject(
				"INSERT INTO documents (title, source, license) VALUES (?, ?, 'unknown') RETURNING id",
				UUID.class, "Tài liệu test", "test-" + UUID.randomUUID());
		jdbc.update("INSERT INTO doc_chunks (document_id, ord, heading_path, content) VALUES (?, 0, ?, ?)",
				docId, heading, content);
	}
}

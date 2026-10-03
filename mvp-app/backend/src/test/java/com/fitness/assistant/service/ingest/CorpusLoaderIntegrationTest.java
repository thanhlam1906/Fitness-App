package com.fitness.assistant.service.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitness.support.FakeEmbeddings;
import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

/** Đưa Markdown vào kho: gộp mục ngắn, thay bản cùng source, FTS không dấu, embedding lỗi thì giữ bản cũ. */
class CorpusLoaderIntegrationTest extends PostgresIntegrationTest {

	static final String MARKDOWN = """
			# Bài kiểm thử

			## Tuần giảm tải

			Giảm tải là tuần tập nhẹ để phục hồi sau một mesocycle. Volume giảm còn khoảng
			một nửa, intensity giữ 60-80% 1RM, RPE dưới 7. Mục đích là xoá mệt mỏi tích luỹ
			trước khi bước sang khối tiếp theo với mức tạ cao hơn.

			## Tuần chuyển tiếp

			Nghỉ ngơi cả thể chất lẫn tinh thần sau thi đấu. Duy trì strength &amp; skill,
			xử lý các vấn đề đau nhức còn tồn đọng để sẵn sàng cho macrocycle tiếp theo.
			Không ép tăng tải, không kiểm tra 1RM trong giai đoạn này.

			### Đặc điểm:

			RPE < 7
			""";

	@Autowired
	private CorpusLoader loader;
	@Autowired
	private JdbcTemplate jdbc;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	@BeforeEach
	void stubEmbeddings() {
		when(embeddingModel.embedForResponse(anyList())).thenAnswer(inv -> FakeEmbeddings.of(inv.getArgument(0)));
	}

	@Test
	void publish_mergesShortSections_andFtsFindsUnaccented() {
		String source = UUID.randomUUID() + "-bai-test.pdf";

		CorpusLoader.Published published = loader.publish(source, "Bài kiểm thử", MARKDOWN);

		// "# Bài kiểm thử" gộp vào mục sau, "### Đặc điểm:" gộp vào mục trước → 2 chunk.
		assertThat(published.chunkCount()).isEqualTo(2);
		assertThat(jdbc.queryForObject("SELECT license FROM documents WHERE id = ?", String.class,
				published.documentId())).isEqualTo("unknown");
		List<String> hits = jdbc.queryForList("""
				SELECT c.heading_path FROM doc_chunks c
				WHERE c.document_id = ? AND c.ts @@ plainto_tsquery('simple', immutable_unaccent(?))
				""", String.class, published.documentId(), "giam tai");
		assertThat(hits).containsExactly("Tuần giảm tải");
		assertThat(jdbc.queryForObject("SELECT content FROM doc_chunks WHERE document_id = ? AND ord = 1",
				String.class, published.documentId()))
				.contains("strength & skill").contains("Đặc điểm:");
	}

	@Test
	void publish_sameSourceTwice_replacesOldDocument() {
		String source = UUID.randomUUID() + "-bai-test.pdf";

		CorpusLoader.Published first = loader.publish(source, "Bản cũ", MARKDOWN);
		CorpusLoader.Published second = loader.publish(source, "Bản mới", MARKDOWN);

		assertThat(second.documentId()).isNotEqualTo(first.documentId());
		assertThat(jdbc.queryForList("SELECT title FROM documents WHERE source = ?", String.class, source))
				.containsExactly("Bản mới");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM doc_chunks WHERE document_id = ?", Integer.class,
				first.documentId())).isZero();
	}

	@Test
	@SuppressWarnings("unchecked")
	void publish_thickBook_embedsInBatches_allChunksStored() {
		// Sách dày cả trăm đoạn: một request gửi hết thì vượt giới hạn token mỗi request của OpenAI.
		StringBuilder book = new StringBuilder();
		for (int i = 0; i < 150; i++) {
			book.append("## Chương ").append(i).append("\n\n").append("nội dung chương. ".repeat(20)).append("\n\n");
		}
		org.mockito.ArgumentCaptor<List<String>> batches = org.mockito.ArgumentCaptor.forClass(List.class);

		CorpusLoader.Published published = loader.publish(UUID.randomUUID() + "-sach.pdf", "Sách dày", book.toString());

		verify(embeddingModel, atLeastOnce()).embedForResponse(batches.capture());
		assertThat(published.chunkCount()).isEqualTo(150);
		assertThat(batches.getAllValues()).hasSizeGreaterThan(1)
				.allSatisfy(b -> assertThat(b.size()).isLessThanOrEqualTo(CorpusLoader.EMBED_BATCH));
		assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM doc_chunks WHERE document_id = ? AND embedding IS NOT NULL", Integer.class,
				published.documentId())).isEqualTo(150);
	}

	@Test
	void publish_embeddingFails_is502_andKeepsExistingDocument() {
		String source = UUID.randomUUID() + "-bai-test.pdf";
		loader.publish(source, "Bản đang dùng", MARKDOWN);
		when(embeddingModel.embedForResponse(anyList())).thenThrow(new RuntimeException("401 từ OpenAI"));

		assertThatThrownBy(() -> loader.publish(source, "Bản mới", MARKDOWN))
				.isInstanceOfSatisfying(ResponseStatusException.class,
						e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY));
		assertThat(jdbc.queryForList("SELECT title FROM documents WHERE source = ?", String.class, source))
				.containsExactly("Bản đang dùng");
	}
}

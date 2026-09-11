package com.fitness.assistant.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.fitness.support.PostgresIntegrationTest;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.Embedding;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Nạp corpus từ thư mục tạm, kiểm chunk gộp đúng và FTS không dấu tìm ra được. */
class CorpusLoaderIntegrationTest extends PostgresIntegrationTest {

	static final Path CORPUS = writeFixture();

	@DynamicPropertySource
	static void corpusPath(DynamicPropertyRegistry registry) {
		registry.add("app.corpus-path", CORPUS::toString);
	}

	@Autowired
	private CorpusLoader loader;
	@Autowired
	private JdbcTemplate jdbc;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	// eval-v1 dùng key OpenAI thật, nhưng test tự động thì không — vector[512] giả,
	// bậc 2 (§5.2) chỉ cần đúng shape để INSERT không lỗi, không cần đúng nghĩa ở đây.
	// KHÔNG toàn số 0: pgvector báo lỗi "zero vector" khi tính cosine distance —
	// container Postgres dùng chung giữa các test class, một hàng toàn 0 ở đây
	// làm hỏng test khác quét cả bảng doc_chunks (VectorRetrieverIntegrationTest).
	@BeforeEach
	void stubEmbeddings() {
		when(embeddingModel.embedForResponse(anyList())).thenAnswer(inv -> {
			List<String> texts = inv.getArgument(0);
			List<Embedding> embeddings = new ArrayList<>();
			for (int i = 0; i < texts.size(); i++) {
				float[] fake = new float[512];
				fake[0] = 1f;
				embeddings.add(new Embedding(fake, i));
			}
			return new EmbeddingResponse(embeddings);
		});
	}

	@Test
	void reload_isIdempotent_mergesShortSections_andFtsFindsUnaccented() {
		loader.reload();
		CorpusLoader.Result result = loader.reload();

		// 3 mục "##" nhưng "Đặc điểm:" quá ngắn → gộp vào mục trước → 2 chunk.
		assertThat(result).isEqualTo(new CorpusLoader.Result(1, 2));
		// count(*) toàn bảng thay vì lọc theo source: container Postgres dùng chung
		// giữa các test class (PostgresIntegrationTest), test khác cũng ghi vào
		// documents/doc_chunks — bảng này không theo userId nên không tự cô lập.
		assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM documents WHERE source = 'bai-test.md'", Integer.class)).isEqualTo(1);
		assertThat(jdbc.queryForObject(
				"SELECT license FROM documents WHERE source = 'bai-test.md'", String.class)).isEqualTo("unknown");

		// Hỏi không dấu, tài liệu có dấu; "&amp;" đã unescape.
		List<String> hits = jdbc.queryForList("""
				SELECT c.heading_path FROM doc_chunks c JOIN documents d ON d.id = c.document_id
				WHERE d.source = 'bai-test.md' AND c.ts @@ plainto_tsquery('simple', immutable_unaccent(?))
				""", String.class, "giam tai");
		assertThat(hits).containsExactly("Tuần giảm tải");
		assertThat(jdbc.queryForObject("""
				SELECT c.content FROM doc_chunks c JOIN documents d ON d.id = c.document_id
				WHERE d.source = 'bai-test.md' AND c.ord = 1
				""", String.class))
				.contains("strength & skill").contains("Đặc điểm:");
	}

	private static Path writeFixture() {
		try {
			Path dir = Files.createTempDirectory("fitness-corpus-test");
			Files.writeString(dir.resolve("bai-test.md"), """
					---
					title: Bài kiểm thử
					topic: programming
					---
					## Tuần giảm tải

					Giảm tải là tuần tập nhẹ để phục hồi sau một mesocycle. Volume giảm còn khoảng
					một nửa, intensity giữ 60-80% 1RM, RPE dưới 7. Mục đích là xoá mệt mỏi tích luỹ
					trước khi bước sang khối tiếp theo với mức tạ cao hơn.

					## Tuần chuyển tiếp

					Nghỉ ngơi cả thể chất lẫn tinh thần sau thi đấu. Duy trì strength &amp; skill,
					xử lý các vấn đề đau nhức còn tồn đọng để sẵn sàng cho macrocycle tiếp theo.
					Không ép tăng tải, không kiểm tra 1RM trong giai đoạn này.

					## Đặc điểm:

					RPE < 7
					""");
			return dir;
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}
}

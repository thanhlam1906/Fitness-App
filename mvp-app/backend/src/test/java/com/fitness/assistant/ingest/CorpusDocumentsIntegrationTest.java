package com.fitness.assistant.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

import com.fitness.auth.Role;
import com.fitness.support.FakeEmbeddings;
import com.fitness.support.PostgresIntegrationTest;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Tài liệu trong kho: đếm câu trả lời bị báo sai, chi tiết để admin quyết gỡ, và gỡ. */
class CorpusDocumentsIntegrationTest extends PostgresIntegrationTest {

	private static final String MARKDOWN = """
			## Giấc ngủ

			%s

			## Tuần giảm tải

			%s
			""".formatted("Ngủ đủ và đều giờ là yếu tố phục hồi rẻ nhất. ".repeat(6),
			"Sau vài tuần tăng tải liên tục, một tuần giảm khối lượng giúp cơ thể hồi lại. ".repeat(4));
	private static final String BASE = "/api/v1/admin/corpus/documents";

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	private CorpusLoader loader;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	@BeforeEach
	void stubEmbeddings() {
		when(embeddingModel.embedForResponse(anyList())).thenAnswer(inv -> FakeEmbeddings.of(inv.getArgument(0)));
	}

	@Test
	void wrongFeedback_onAnswerCitingDocument_isCountedOnce_andDetailed() {
		String source = UUID.randomUUID() + "-bai-5.pdf";
		CorpusLoader.Published doc = loader.publish(source, "Bài 5", MARKDOWN);
		List<UUID> chunkIds = jdbc.queryForList("SELECT id FROM doc_chunks WHERE document_id = ? ORDER BY ord",
				UUID.class, doc.documentId());
		UUID user = newAuthedUser(Role.USER).userId();
		UUID thread = UUID.randomUUID();
		message(user, thread, "USER", "Ngủ bao lâu là đủ?", List.of(), "2026-10-01T10:00:00Z");
		UUID wrong = message(user, thread, "ASSISTANT", "Ngủ đủ và đều giờ là yếu tố phục hồi rẻ nhất.",
				List.of(chunkIds.get(1)), "2026-10-01T10:00:05Z");
		feedback(user, wrong, true, null, "2026-10-01T10:01:00Z");
		feedback(user, wrong, true, "Tài liệu không nói vậy", "2026-10-01T10:02:00Z"); // bấm lại: vẫn là một câu
		UUID fine = message(user, thread, "ASSISTANT", "Câu khác.", List.of(chunkIds.get(0)), "2026-10-01T10:03:00Z");
		feedback(user, fine, false, null, "2026-10-01T10:04:00Z");
		UUID otherDoc = message(user, thread, "ASSISTANT", "Câu của tài liệu khác.", List.of(UUID.randomUUID()),
				"2026-10-01T10:05:00Z");
		feedback(user, otherDoc, true, null, "2026-10-01T10:06:00Z");
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();

		var rows = rest.exchange(BASE, HttpMethod.GET, new HttpEntity<>(admin), CorpusDocuments.DocumentRow[].class)
				.getBody();
		CorpusDocuments.DocumentRow row = Arrays.stream(rows).filter(r -> r.source().equals(source)).findFirst()
				.orElseThrow();
		assertThat(row.chunkCount()).isEqualTo(2);
		assertThat(row.wrongCount()).isEqualTo(1);

		var detail = rest.exchange(BASE + "/" + doc.documentId(), HttpMethod.GET, new HttpEntity<>(admin),
				CorpusDocuments.DocumentDetail.class).getBody();
		assertThat(detail.chunks()).extracting(CorpusDocuments.DocChunk::ord).containsExactly(0, 1);
		assertThat(detail.wrongAnswers()).singleElement().satisfies(w -> {
			assertThat(w.messageId()).isEqualTo(wrong);
			assertThat(w.question()).isEqualTo("Ngủ bao lâu là đủ?");
			assertThat(w.note()).isEqualTo("Tài liệu không nói vậy");
			assertThat(w.chunkOrds()).containsExactly(1);
		});
	}

	@Test
	void remove_deletesDocumentAndChunks_regularUserForbidden() {
		CorpusLoader.Published doc = loader.publish(UUID.randomUUID() + "-go.pdf", "Sẽ gỡ", MARKDOWN);
		String url = BASE + "/" + doc.documentId();

		var forbidden = rest.exchange(url, HttpMethod.DELETE, new HttpEntity<>(newAuthedUser(Role.USER).headers()),
				String.class);
		HttpHeaders admin = newAuthedUser(Role.ADMIN).headers();
		var removed = rest.exchange(url, HttpMethod.DELETE, new HttpEntity<>(admin), Void.class);

		assertThat(forbidden.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
		assertThat(removed.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM doc_chunks WHERE document_id = ?", Integer.class,
				doc.documentId())).isZero();
		assertThat(rest.exchange(url, HttpMethod.GET, new HttpEntity<>(admin), String.class).getStatusCode())
				.isEqualTo(HttpStatus.NOT_FOUND);
	}

	private UUID message(UUID user, UUID thread, String role, String content, List<UUID> chunkIds, String at) {
		String array = chunkIds.stream().map(UUID::toString).collect(Collectors.joining(",", "{", "}"));
		return jdbc.queryForObject("""
				INSERT INTO assistant_messages (user_id, thread_id, role, content, chunk_ids, created_at)
				VALUES (?, ?, ?, ?, ?::uuid[], ?::timestamptz) RETURNING id
				""", UUID.class, user, thread, role, content, array, at);
	}

	private void feedback(UUID user, UUID message, boolean wrong, String note, String at) {
		jdbc.update("""
				INSERT INTO cue_feedback (user_id, assistant_message_id, is_wrong, note, created_at)
				VALUES (?, ?, ?, ?, ?::timestamptz)
				""", user, message, wrong, note, at);
	}
}

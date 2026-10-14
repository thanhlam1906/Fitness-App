package com.fitness.assistant.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitness.assistant.dto.AskRequest;
import com.fitness.assistant.entity.AssistantMessage;
import com.fitness.assistant.repository.AssistantMessageRepository;
import com.fitness.auth.entity.Role;
import com.fitness.support.PostgresIntegrationTest;
import io.github.resilience4j.bulkhead.Bulkhead;
import io.github.resilience4j.bulkhead.BulkheadRegistry;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.web.server.ResponseStatusException;

/**
 * §4 (SafetyGate chặn trước, không tốn token) và §5.3/N3 (NumberGuard bỏ cả
 * câu khi bịa số) — 2 nhánh không được phép hỏng, test bằng ChatModel giả để
 * không tốn tiền API thật lúc chạy CI.
 */
class AssistantServiceIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private AssistantService assistantService;
	@Autowired
	private AssistantMessageRepository messages;
	@Autowired
	private JdbcTemplate jdbc;
	@MockitoBean
	private ChatModel chatModel;
	@MockitoBean
	private EmbeddingModel embeddingModel;
	@Autowired
	private CircuitBreakerRegistry circuitBreakers;
	@Autowired
	private BulkheadRegistry bulkheads;

	// Bậc 2 (§5.2): HybridRetriever gọi VectorRetriever gọi embeddingModel.embed()
	// cho mọi câu KHÔNG bị SafetyGate chặn. Test không cần đúng nghĩa embedding,
	// chỉ cần đúng shape (512 chiều, khớp cột vector(512)) để SQL không lỗi.
	@BeforeEach
	void stubEmbeddings() {
		when(embeddingModel.embed(anyString())).thenReturn(new float[512]);
	}

	@Test
	void ask_blockedQuestion_neverCallsTheModel() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		UUID threadId = UUID.randomUUID();

		AssistantService.Answer answer = assistantService.ask(userId, threadId, "tôi đang mang thai có tập được không");

		assertThat(answer.blocked()).isTrue();
		assertThat(answer.text()).isEqualTo(SafetyGate.REFUSAL_MESSAGE);
		// verify(never()) trên đúng .call(), không verifyNoInteractions(): ChatClient.Builder.build()
		// lúc khởi tạo bean đã tự đọc metadata (getDefaultOptions) trên mock, không liên quan gì
		// đến việc có gọi model để sinh câu trả lời hay không.
		verify(chatModel, never()).call(any(org.springframework.ai.chat.prompt.Prompt.class));
	}

	@Test
	void ask_answerWithInventedNumber_isDropped_notShownToUser() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		stubModelReply("Bạn nên tăng tải thêm 37.5kg mỗi tuần."); // 37.5 không có trong context nào

		AssistantService.Answer answer = assistantService.ask(userId, UUID.randomUUID(), "tôi nên tăng tải thế nào");

		assertThat(answer.guardResult()).isEqualTo("NUMBERS_UNGROUNDED");
		assertThat(answer.text()).doesNotContain("37.5");
	}

	@Test
	void ask_persistsBothUserAndAssistantMessages() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		stubModelReply("Giữ lưng thẳng khi đứng lên, không cong người.");
		UUID threadId = UUID.randomUUID();

		AssistantService.Answer answer = assistantService.ask(userId, threadId, "squat đúng kỹ thuật là thế nào");

		List<AssistantMessage> log = messages.findByUserIdAndThreadIdOrderByCreatedAtAsc(userId, threadId);
		assertThat(log).hasSize(2);
		assertThat(log.get(0).getRole()).isEqualTo("USER");
		assertThat(log.get(1).getRole()).isEqualTo("ASSISTANT");
		assertThat(log.get(1).getGuardResult()).isEqualTo("OK");
		// Nút "cái này sai" ở web trỏ tới đúng dòng câu trả lời đã lưu.
		assertThat(answer.messageId()).isEqualTo(log.get(1).getId());
	}

	@Test
	void ask_answerCitingChunk_persistsThatChunkId() {
		String content = "Ngủ trưa ngắn giúp hệ thần kinh hồi phục giữa hai buổi tập nặng trong ngày, "
				+ "nhất là khi buổi sáng đã tập chân và buổi chiều còn tập lưng.";
		UUID docId = jdbc.queryForObject(
				"INSERT INTO documents (title, source, license) VALUES (?, ?, 'unknown') RETURNING id",
				UUID.class, "Tài liệu kiểm thử chunk_ids", "test-" + UUID.randomUUID());
		String vector = "[1" + ",0".repeat(511) + "]";
		UUID chunkId = jdbc.queryForObject("""
				INSERT INTO doc_chunks (document_id, ord, heading_path, content, embedding)
				VALUES (?, 0, 'Ngủ trưa', ?, ?::vector) RETURNING id
				""", UUID.class, docId, content, vector);
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		stubModelReply("Ngủ trưa ngắn giúp hệ thần kinh hồi phục giữa hai buổi tập nặng trong ngày.");
		UUID threadId = UUID.randomUUID();

		// Hỏi không dấu: bộ lọc "khớp >= 50% số từ" của FtsRetriever so từ câu hỏi nguyên dạng với
		// nội dung đã bỏ dấu, nên câu có dấu bị loại hết. Test này kiểm chunk_ids, không kiểm retriever.
		assistantService.ask(userId, threadId, "ngu trua co giup hoi phuc khong");

		AssistantMessage saved = messages.findByUserIdAndThreadIdOrderByCreatedAtAsc(userId, threadId).get(1);
		assertThat(saved.getChunkIds()).contains(chunkId);
	}

	@Test
	void embeddingLoi_vanTraLoiBangTaiLieuTimTheoTuKhoa() {
		String content = "Giãn cơ tĩnh sau buổi tập giúp cơ thả lỏng, nhất là sau những bài squat nặng "
				+ "và bài kéo lưng làm cơ đùi sau căng cứng suốt buổi.";
		UUID docId = jdbc.queryForObject(
				"INSERT INTO documents (title, source, license) VALUES (?, ?, 'unknown') RETURNING id",
				UUID.class, "Tài liệu kiểm thử FTS dự phòng", "test-" + UUID.randomUUID());
		jdbc.update("INSERT INTO doc_chunks (document_id, ord, heading_path, content) VALUES (?, 0, 'Giãn cơ', ?)",
				docId, content);
		when(embeddingModel.embed(anyString())).thenThrow(new TransientAiException("HTTP 503 - giả"));
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		stubModelReply("Giãn cơ tĩnh sau buổi tập giúp cơ thả lỏng, nhất là sau những bài squat nặng.");

		// Hỏi không dấu, cùng lý do như ask_answerCitingChunk_persistsThatChunkId.
		AssistantService.Answer answer = assistantService.ask(userId, UUID.randomUUID(), "gian co tinh sau buoi tap");

		assertThat(answer.guardResult()).isEqualTo("OK");
		assertThat(answer.sourceTitles()).contains("Tài liệu kiểm thử FTS dự phòng");
	}

	/** Tìm theo nghĩa hỏng hẳn mà chat vẫn chạy: trợ lý phải trả lời tiếp bằng FTS, không 503 sau vài câu. */
	@Test
	void embeddingHongHan_chatVanChay_vanTraLoiMoiCau() {
		when(embeddingModel.embed(anyString())).thenThrow(new TransientAiException("HTTP 503 - giả"));
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		stubModelReply("Giữ lưng thẳng khi đứng lên, không cong người.");

		for (int i = 0; i < 6; i++) {
			assertThat(assistantService.ask(userId, UUID.randomUUID(), "squat đúng kỹ thuật là thế nào").guardResult())
					.isEqualTo("OK");
		}

		assertThat(circuitBreakers.circuitBreaker("openai-embedding").getState()).isEqualTo(CircuitBreaker.State.OPEN);
		assertThat(circuitBreakers.circuitBreaker("openai").getState()).isEqualTo(CircuitBreaker.State.CLOSED);
	}

	@Test
	void cauThu11TrongMotPhut_bi429_khongLuuCauHoi() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		UUID threadId = UUID.randomUUID();
		// Câu bị SafetyGate chặn: không gọi model nên khỏi stub, test nhanh.
		AskRequest request = new AskRequest("tôi đang mang thai có tập được không", threadId);
		for (int i = 0; i < 10; i++) {
			assistantService.ask(userId, request);
		}

		assertThatThrownBy(() -> assistantService.ask(userId, request))
				.isInstanceOfSatisfying(ResponseStatusException.class, e -> {
					assertThat(e.getStatusCode()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
					assertThat(e.getReason()).isEqualTo("Bạn hỏi nhanh quá, chờ một chút rồi hỏi tiếp.");
				});
		assertThat(messages.findByUserIdAndThreadIdOrderByCreatedAtAsc(userId, threadId))
				.filteredOn(m -> m.getRole().equals("USER")).hasSize(10);
	}

	@Test
	void openAiLoiLienTuc_breakerMo_tra503_khongGoiOpenAiNua() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		when(chatModel.call(any(org.springframework.ai.chat.prompt.Prompt.class)))
				.thenThrow(new TransientAiException("HTTP 503 - giả"));
		for (int i = 0; i < 5; i++) {
			assertThatThrownBy(() -> assistantService.ask(userId, UUID.randomUUID(), "squat đúng kỹ thuật là thế nào"))
					.isInstanceOfSatisfying(ResponseStatusException.class,
							e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
		}
		assertThat(circuitBreakers.circuitBreaker("openai").getState()).isEqualTo(CircuitBreaker.State.OPEN);
		clearInvocations(chatModel);

		assertThatThrownBy(() -> assistantService.ask(userId, UUID.randomUUID(), "squat đúng kỹ thuật là thế nào"))
				.isInstanceOfSatisfying(ResponseStatusException.class, e -> {
					assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
					assertThat(e.getReason()).isEqualTo(AssistantService.UNAVAILABLE_MESSAGE);
				});
		verify(chatModel, never()).call(any(org.springframework.ai.chat.prompt.Prompt.class));
	}

	@Test
	void du20CauDangChoOpenAi_cauThu21Tra503() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		Bulkhead bulkhead = bulkheads.bulkhead("assistant");
		for (int i = 0; i < 20; i++) {
			assertThat(bulkhead.tryAcquirePermission()).isTrue();
		}
		try {
			assertThatThrownBy(() -> assistantService.ask(userId, UUID.randomUUID(), "squat đúng kỹ thuật là thế nào"))
					.isInstanceOfSatisfying(ResponseStatusException.class,
							e -> assertThat(e.getStatusCode()).isEqualTo(HttpStatus.SERVICE_UNAVAILABLE));
			verify(chatModel, never()).call(any(org.springframework.ai.chat.prompt.Prompt.class));
		} finally {
			// Bulkhead sống suốt context dùng chung: trả chỗ để test khác không bị 503 oan.
			for (int i = 0; i < 20; i++) {
				bulkhead.onComplete();
			}
		}
	}

	/** Sai key hay hết quota là lỗi cấu hình: phải lộ ra, không được che thành "thử lại sau ít phút". */
	@Test
	void openAiLoi4xx_khongCheThanh503() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		when(chatModel.call(any(org.springframework.ai.chat.prompt.Prompt.class)))
				.thenThrow(new NonTransientAiException("HTTP 401 - giả"));

		assertThatThrownBy(() -> assistantService.ask(userId, UUID.randomUUID(), "squat đúng kỹ thuật là thế nào"))
				.isInstanceOf(NonTransientAiException.class);
	}

	private void stubModelReply(String text) {
		ChatResponse response = new ChatResponse(
				List.of(new Generation(new org.springframework.ai.chat.messages.AssistantMessage(text))));
		when(chatModel.call(any(org.springframework.ai.chat.prompt.Prompt.class))).thenReturn(response);
	}

	private void asUser(UUID userId) {
		Jwt jwt = Jwt.withTokenValue("test").header("alg", "none").subject(userId.toString())
				.claim("sub", userId.toString()).build();
		SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
	}
}

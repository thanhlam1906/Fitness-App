package com.fitness.assistant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitness.auth.Role;
import com.fitness.support.PostgresIntegrationTest;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

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
	@MockitoBean
	private ChatModel chatModel;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	// Bậc 2 (§5.2): HybridRetriever gọi VectorRetriever gọi embeddingModel.embed()
	// cho mọi câu KHÔNG bị SafetyGate chặn. Test không cần đúng nghĩa embedding,
	// chỉ cần đúng shape (512 chiều, khớp cột vector(512)) để SQL không lỗi.
	@BeforeEach
	void stubEmbeddings() {
		when(embeddingModel.embed(anyString())).thenReturn(new float[512]);
	}

	@Test
	void ask_blockedQuestion_neverCallsTheModel() {
		asUser(newAuthedUser(Role.USER).userId());
		UUID threadId = UUID.randomUUID();

		AssistantService.Answer answer = assistantService.ask(threadId, "tôi đang mang thai có tập được không");

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

		AssistantService.Answer answer = assistantService.ask(UUID.randomUUID(), "tôi nên tăng tải thế nào");

		assertThat(answer.guardResult()).isEqualTo("NUMBERS_UNGROUNDED");
		assertThat(answer.text()).doesNotContain("37.5");
	}

	@Test
	void ask_persistsBothUserAndAssistantMessages() {
		UUID userId = newAuthedUser(Role.USER).userId();
		asUser(userId);
		stubModelReply("Giữ lưng thẳng khi đứng lên, không cong người.");
		UUID threadId = UUID.randomUUID();

		assistantService.ask(threadId, "squat đúng kỹ thuật là thế nào");

		List<AssistantMessage> log = messages.findByUserIdAndThreadIdOrderByCreatedAtAsc(userId, threadId);
		assertThat(log).hasSize(2);
		assertThat(log.get(0).getRole()).isEqualTo("USER");
		assertThat(log.get(1).getRole()).isEqualTo("ASSISTANT");
		assertThat(log.get(1).getGuardResult()).isEqualTo("OK");
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

package com.fitness.assistant.service.retrieval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.fitness.support.PostgresIntegrationTest;
import io.github.resilience4j.circuitbreaker.CallNotPermittedException;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.retry.TransientAiException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

/** Breaker "openai-embedding" và "openai" (doc/design-chiu-loi-v1.md §4): mở sau chuỗi lỗi, chặn gọi tiếp, không kéo health xuống DOWN. */
class OpenAiCircuitBreakerIntegrationTest extends PostgresIntegrationTest {

	@Autowired
	private VectorRetriever vectorRetriever;
	@Autowired
	private CircuitBreakerRegistry circuitBreakers;
	@Autowired
	private TestRestTemplate rest;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	@Test
	void embeddingLoi5Lan_breakerMo_lanSauKhongGoiOpenAi() {
		when(embeddingModel.embed(anyString())).thenThrow(new TransientAiException("HTTP 503 - giả"));
		for (int i = 0; i < 5; i++) {
			assertThatThrownBy(() -> vectorRetriever.search("câu hỏi", 5)).isInstanceOf(TransientAiException.class);
		}
		assertThat(circuitBreakers.circuitBreaker("openai-embedding").getState()).isEqualTo(CircuitBreaker.State.OPEN);
		// Embedding hỏng không được kéo chat theo: hai breaker độc lập.
		assertThat(circuitBreakers.circuitBreaker("openai").getState()).isEqualTo(CircuitBreaker.State.CLOSED);
		clearInvocations(embeddingModel);

		assertThatThrownBy(() -> vectorRetriever.search("câu hỏi", 5)).isInstanceOf(CallNotPermittedException.class);
		verify(embeddingModel, never()).embed(anyString());
	}

	/** Hệ thống báo sập nhìn /actuator/health: OpenAI sập không được làm nó khởi động lại backend. */
	@Test
	void breakerMo_healthVanUp() {
		circuitBreakers.circuitBreaker("openai").transitionToOpenState();
		circuitBreakers.circuitBreaker("openai-embedding").transitionToOpenState();

		var resp = rest.getForEntity("/actuator/health", java.util.Map.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().get("status")).isEqualTo("UP");
	}
}

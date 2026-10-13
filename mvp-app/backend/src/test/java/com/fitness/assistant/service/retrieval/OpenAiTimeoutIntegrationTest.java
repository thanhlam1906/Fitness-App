package com.fitness.assistant.service.retrieval;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fitness.support.PostgresIntegrationTest;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.net.InetSocketAddress;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.ResourceAccessException;

/**
 * Kiểm cấu hình thật mà Spring AI dùng khi gọi OpenAI (doc/design-chiu-loi-v1.md §4.2): thử đúng 2 lần và
 * timeout đọc có tác dụng. Không mock EmbeddingModel: gọi qua đúng RestClient của Boot tới một server giả
 * trả lời chậm. read-timeout hạ xuống 500ms chỉ để test nhanh; số 20s thật nằm ở application.yml.
 */
@TestPropertySource(properties = "spring.http.client.read-timeout=500ms")
class OpenAiTimeoutIntegrationTest extends PostgresIntegrationTest {

	private static final AtomicInteger HITS = new AtomicInteger();
	private static final HttpServer SLOW = startSlowServer();

	private static HttpServer startSlowServer() {
		try {
			HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
			server.createContext("/", exchange -> {
				HITS.incrementAndGet();
				try {
					Thread.sleep(3000);
				} catch (InterruptedException e) {
					Thread.currentThread().interrupt();
				}
				exchange.sendResponseHeaders(500, -1);
				exchange.close();
			});
			// Mỗi request một luồng: luồng mặc định duy nhất sẽ bắt lần thử thứ hai chờ lần đầu ngủ xong.
			server.setExecutor(Executors.newCachedThreadPool());
			server.start();
			return server;
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
	}

	@DynamicPropertySource
	static void openAiBaseUrl(DynamicPropertyRegistry registry) {
		registry.add("spring.ai.openai.base-url", () -> "http://127.0.0.1:" + SLOW.getAddress().getPort());
	}

	@Autowired
	private EmbeddingModel embeddingModel;

	// Chưa cấu hình thì Spring AI thử 10 lần, chờ tới 3 phút mỗi lần: @Timeout cắt để test hỏng nhanh.
	@Test
	@Timeout(10)
	void openAiTreo_moiLanDungSauTimeout_thuDung2Lan() {
		long start = System.nanoTime();

		assertThatThrownBy(() -> embeddingModel.embed("câu hỏi")).isInstanceOf(ResourceAccessException.class);

		long ms = (System.nanoTime() - start) / 1_000_000;
		// Không có timeout thì một lần đã chờ đủ 3 giây. Có: 2 × 0,5 s + chờ 1 s giữa hai lần ≈ 2 s.
		assertThat(ms).isLessThan(3000);
		assertThat(HITS.get()).isEqualTo(2);
	}
}

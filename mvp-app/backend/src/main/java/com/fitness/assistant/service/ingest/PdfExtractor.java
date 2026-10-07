package com.fitness.assistant.service.ingest;

import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.io.InterruptedIOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Comparator;
import java.util.stream.Stream;
import org.opendataloader.pdf.api.Config;
import org.opendataloader.pdf.api.OpenDataLoaderPDF;
import org.opendataloader.pdf.hybrid.HybridConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * PDF → Markdown bằng OpenDataLoader chế độ hybrid (doc/design-nap-tai-lieu-v1.md §5–6). Thư viện
 * Java tự chia trang: trang dễ tự đọc, trang khó (bảng, ảnh quét) gửi sang pdf-hybrid (Docling).
 */
@Component
public class PdfExtractor {

	static final String HYBRID_DOWN = "Không kết nối được máy trích PDF. Bật bằng: "
			+ "docker compose -f mvp-app/docker-compose.yml --profile corpus up -d pdf-hybrid";
	// Đo 10-02 (task 0 của doc/ke-hoach-nap-tai-lieu-v1.md): "full" gửi cả trang biểu đồ sang
	// Docling, ra gấp ba dòng rác mà dấu tiếng Việt không đúng hơn.
	static final String HYBRID_MODE = HybridConfig.MODE_AUTO;

	/** Lý do lỗi đọc được, hiện nguyên văn ở dòng "Lỗi" của màn Kho kiến thức. */
	public static class ExtractionFailed extends RuntimeException {
		ExtractionFailed(String message, Throwable cause) {
			super(message, cause);
		}
	}

	private final String hybridUrl;
	private final Duration timeout;
	private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();

	public PdfExtractor(@Value("${app.pdf-hybrid-url}") String hybridUrl,
			@Value("${app.pdf-hybrid-timeout}") Duration timeout) {
		this.hybridUrl = hybridUrl;
		this.timeout = timeout;
	}

	public String extract(Path pdf) {
		// PDF toàn trang dễ thì thư viện không bao giờ gọi server, nên server chết cũng không lộ ra.
		// Hỏi thẳng /health trước: người dùng yêu cầu luôn trích bằng hybrid.
		checkHybridUp();
		Path out = null;
		try {
			out = Files.createTempDirectory("odl-out-");
			Config config = new Config();
			config.setOutputFolder(out.toString());
			config.setGenerateJSON(false);
			config.setGenerateMarkdown(true);
			config.setImageOutput(Config.IMAGE_OUTPUT_OFF);
			config.setHybrid(Config.HYBRID_DOCLING_FAST);
			HybridConfig hybrid = config.getHybridConfig();
			hybrid.setUrl(hybridUrl);
			hybrid.setMode(HYBRID_MODE);
			hybrid.setFallbackToJava(false);
			hybrid.setTimeoutMs(Math.toIntExact(timeout.toMillis()));
			OpenDataLoaderPDF.processFile(pdf.toString(), config);
			try (Stream<Path> files = Files.list(out)) {
				Path md = files.filter(f -> f.toString().endsWith(".md")).findFirst().orElse(null);
				return md == null ? "" : Files.readString(md);
			}
		} catch (IOException | RuntimeException e) {
			throw new ExtractionFailed(messageFor(e, timeout), e);
		} finally {
			deleteQuietly(out);
		}
	}

	static String messageFor(Throwable e, Duration timeout) {
		for (Throwable t = e; t != null; t = t.getCause()) {
			if (t instanceof InterruptedIOException) { // SocketTimeoutException là lớp con
				return "Trích quá " + timeout.toMinutes() + " phút. Thử tách PDF nhỏ hơn.";
			}
		}
		return "Máy trích PDF lỗi: " + e.getMessage();
	}

	private void checkHybridUp() {
		try {
			HttpRequest request = HttpRequest.newBuilder(URI.create(hybridUrl + "/health"))
					.timeout(Duration.ofSeconds(5)).GET().build();
			if (http.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() / 100 == 2) {
				return;
			}
		} catch (IOException e) {
			// không nối được: báo lỗi chung bên dưới
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
		throw new ExtractionFailed(HYBRID_DOWN, null);
	}

	private static void deleteQuietly(Path dir) {
		if (dir == null) {
			return;
		}
		try (Stream<Path> walk = Files.walk(dir)) {
			walk.sorted(Comparator.reverseOrder()).forEach(p -> p.toFile().delete());
		} catch (IOException ignored) {
			// thư mục tạm của hệ điều hành, sót lại không hại gì
		}
	}

	@PreDestroy
	void shutdown() {
		// Đóng pool HTTP của chế độ hybrid. Chỉ gọi khi tắt app: gọi sau từng file thì file sau
		// phải dựng lại pool.
		OpenDataLoaderPDF.shutdown();
	}
}

package com.fitness.assistant.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.io.IOException;
import java.net.SocketTimeoutException;
import java.nio.file.Path;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class PdfExtractorTest {

	@Test
	void extract_hybridServerDown_failsWithStartCommand_beforeTouchingTheFile() {
		PdfExtractor extractor = new PdfExtractor("http://127.0.0.1:1", Duration.ofMinutes(60));

		assertThatThrownBy(() -> extractor.extract(Path.of("khong-ton-tai.pdf")))
				.isInstanceOf(PdfExtractor.ExtractionFailed.class)
				.hasMessage(PdfExtractor.HYBRID_DOWN);
	}

	@Test
	void messageFor_timeoutAnywhereInCauseChain_saysMinutes() {
		Exception e = new RuntimeException(new IOException(new SocketTimeoutException("read timed out")));

		assertThat(PdfExtractor.messageFor(e, Duration.ofMinutes(60)))
				.isEqualTo("Trích quá 60 phút. Thử tách PDF nhỏ hơn.");
	}

	@Test
	void messageFor_otherError_keepsOriginalMessage() {
		assertThat(PdfExtractor.messageFor(new IllegalStateException("hỏng trang 3"), Duration.ofMinutes(60)))
				.isEqualTo("Máy trích PDF lỗi: hỏng trang 3");
	}
}

package com.fitness.assistant.ingest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.doReturn;
import static org.mockito.Mockito.when;

import com.fitness.auth.Role;
import com.fitness.support.FakeEmbeddings;
import com.fitness.support.PostgresIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Arrays;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;

/** Thả PDF → trích nền → chờ duyệt → vào kho / bỏ (doc/design-nap-tai-lieu-v1.md §3, §5). */
class CorpusAdminControllerIntegrationTest extends PostgresIntegrationTest {

	private static final byte[] PDF_BYTES = "%PDF-1.7\n%kiem thu\n".getBytes(StandardCharsets.US_ASCII);
	private static final String MARKDOWN = """
			# Bài thử nạp

			## Giấc ngủ

			%s

			## Tuần giảm tải

			%s
			""".formatted("Ngủ đủ và đều giờ là yếu tố phục hồi rẻ nhất. ".repeat(6),
			"Sau vài tuần tăng tải liên tục, một tuần giảm khối lượng giúp cơ thể hồi lại. ".repeat(4));
	private static final String BASE = "/api/v1/admin/corpus/uploads";

	@Autowired
	private TestRestTemplate rest;
	@Autowired
	private JdbcTemplate jdbc;
	@Autowired
	private CorpusUploadService service;
	@MockitoBean
	private PdfExtractor extractor;
	@MockitoBean
	private EmbeddingModel embeddingModel;

	@BeforeEach
	void stubEmbeddings() {
		when(embeddingModel.embedForResponse(anyList())).thenAnswer(inv -> FakeEmbeddings.of(inv.getArgument(0)));
	}

	@Test
	void regularUser_cannotUpload() {
		var resp = post(newAuthedUser(Role.USER).headers(), unique("a.pdf"), PDF_BYTES);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
	}

	@Test
	void notPdf_is400_andNothingQueued() {
		String name = unique("ghi-chu.docx");

		var resp = post(admin(), name, "hello".getBytes(StandardCharsets.UTF_8));

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
		assertThat(resp.getBody()).contains("không phải PDF");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM corpus_uploads WHERE file_name = ?", Integer.class, name))
				.isZero();
	}

	@Test
	void upload_extractsInBackground_thenReadyWithChunks_andTempPdfDeleted() throws Exception {
		AtomicReference<Path> seen = new AtomicReference<>();
		when(extractor.extract(any())).thenAnswer(inv -> {
			seen.set(inv.getArgument(0));
			return MARKDOWN;
		});
		HttpHeaders admin = admin();

		CorpusUploadService.UploadRow created = upload(admin, unique("bai-4.pdf"));

		assertThat(created.status()).isEqualTo("PROCESSING");
		assertThat(awaitDone(created.id())).isEqualTo("READY");
		var detail = rest.exchange(BASE + "/" + created.id(), HttpMethod.GET, new HttpEntity<>(admin),
				CorpusUploadService.UploadDetail.class).getBody();
		assertThat(detail.chunks()).extracting(CorpusUploadService.ChunkPreview::heading)
				.containsExactly("Giấc ngủ", "Tuần giảm tải");
		assertThat(detail.replaces()).isNull();
		assertThat(Files.exists(seen.get())).isFalse();
	}

	@Test
	void extractionFails_rowFailedWithReason_andTempPdfDeleted() throws Exception {
		AtomicReference<Path> seen = new AtomicReference<>();
		when(extractor.extract(any())).thenAnswer(inv -> {
			seen.set(inv.getArgument(0));
			throw new PdfExtractor.ExtractionFailed(PdfExtractor.HYBRID_DOWN, null);
		});

		CorpusUploadService.UploadRow created = upload(admin(), unique("scan.pdf"));

		assertThat(awaitDone(created.id())).isEqualTo("FAILED");
		assertThat(jdbc.queryForObject("SELECT error FROM corpus_uploads WHERE id = ?", String.class, created.id()))
				.isEqualTo(PdfExtractor.HYBRID_DOWN);
		assertThat(Files.exists(seen.get())).isFalse();
	}

	@Test
	void extractedNothing_failsWithNoText() throws Exception {
		when(extractor.extract(any())).thenReturn("  \n");

		CorpusUploadService.UploadRow created = upload(admin(), unique("trang-trang.pdf"));

		assertThat(awaitDone(created.id())).isEqualTo("FAILED");
		assertThat(jdbc.queryForObject("SELECT error FROM corpus_uploads WHERE id = ?", String.class, created.id()))
				.isEqualTo(CorpusUploadService.NO_TEXT);
	}

	@Test
	void publish_movesIntoDocumentsWithTitle_andRemovesUpload() throws Exception {
		when(extractor.extract(any())).thenReturn(MARKDOWN);
		HttpHeaders admin = admin();
		String name = unique("bai-4.pdf");
		UUID id = upload(admin, name).id();
		awaitDone(id);

		var resp = publish(admin, id, "Bài 4: Phục hồi", CorpusLoader.Published.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.OK);
		assertThat(resp.getBody().chunkCount()).isEqualTo(2);
		assertThat(jdbc.queryForObject("SELECT title FROM documents WHERE source = ?", String.class, name))
				.isEqualTo("Bài 4: Phục hồi");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM corpus_uploads WHERE id = ?", Integer.class, id)).isZero();
	}

	@Test
	void sameFileNameAgain_showsReplaces_thenPublishReplacesOldDocument() throws Exception {
		when(extractor.extract(any())).thenReturn(MARKDOWN);
		HttpHeaders admin = admin();
		String name = unique("dinh-duong.pdf");
		UUID first = upload(admin, name).id();
		awaitDone(first);
		publish(admin, first, "Bản cũ", CorpusLoader.Published.class);

		UUID second = upload(admin, name).id();
		awaitDone(second);
		var rows = rest.exchange(BASE, HttpMethod.GET, new HttpEntity<>(admin),
				CorpusUploadService.UploadRow[].class).getBody();
		CorpusUploadService.UploadRow row = Arrays.stream(rows).filter(r -> r.id().equals(second)).findFirst()
				.orElseThrow();
		assertThat(row.replaces().title()).isEqualTo("Bản cũ");
		assertThat(row.replaces().chunkCount()).isEqualTo(2);

		publish(admin, second, "Bản mới", CorpusLoader.Published.class);

		assertThat(jdbc.queryForList("SELECT title FROM documents WHERE source = ?", String.class, name))
				.containsExactly("Bản mới");
	}

	@Test
	void publish_notReady_is409_blankTitle_is400() throws Exception {
		HttpHeaders admin = admin();
		when(extractor.extract(any())).thenThrow(new PdfExtractor.ExtractionFailed("hỏng", null));
		UUID failed = upload(admin, unique("hong.pdf")).id();
		awaitDone(failed);
		// doReturn, không when(...): when() gọi thật extract() trên mock đang được dặn ném lỗi.
		doReturn(MARKDOWN).when(extractor).extract(any());
		UUID ready = upload(admin, unique("tot.pdf")).id();
		awaitDone(ready);

		assertThat(publish(admin, failed, "Tên", String.class).getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
		assertThat(publish(admin, ready, "  ", String.class).getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
	}

	@Test
	void publish_embeddingFails_is502_andUploadStaysReady() throws Exception {
		when(extractor.extract(any())).thenReturn(MARKDOWN);
		HttpHeaders admin = admin();
		UUID id = upload(admin, unique("bai-6.pdf")).id();
		awaitDone(id);
		when(embeddingModel.embedForResponse(anyList())).thenThrow(new RuntimeException("401"));

		var resp = publish(admin, id, "Bài 6", String.class);

		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
		assertThat(jdbc.queryForObject("SELECT status FROM corpus_uploads WHERE id = ?", String.class, id))
				.isEqualTo("READY");
	}

	@Test
	void discard_removesUpload() throws Exception {
		when(extractor.extract(any())).thenReturn(MARKDOWN);
		HttpHeaders admin = admin();
		UUID id = upload(admin, unique("bo.pdf")).id();
		awaitDone(id);

		var deleted = rest.exchange(BASE + "/" + id, HttpMethod.DELETE, new HttpEntity<>(admin), Void.class);

		assertThat(deleted.getStatusCode()).isEqualTo(HttpStatus.NO_CONTENT);
		assertThat(rest.exchange(BASE + "/" + id, HttpMethod.GET, new HttpEntity<>(admin), String.class)
				.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
	}

	@Test
	void restart_marksProcessingAsInterrupted() {
		UUID id = jdbc.queryForObject(
				"INSERT INTO corpus_uploads (file_name, status) VALUES (?, 'PROCESSING') RETURNING id",
				UUID.class, unique("dang-trich.pdf"));

		service.failInterrupted();

		assertThat(jdbc.queryForMap("SELECT status, error FROM corpus_uploads WHERE id = ?", id))
				.containsEntry("status", "FAILED")
				.containsEntry("error", CorpusUploadService.INTERRUPTED);
	}

	private HttpHeaders admin() {
		return newAuthedUser(Role.ADMIN).headers();
	}

	private static String unique(String name) {
		return UUID.randomUUID().toString().substring(0, 8) + "-" + name;
	}

	private ResponseEntity<String> post(HttpHeaders headers, String fileName, byte[] bytes) {
		return rest.exchange(BASE, HttpMethod.POST, multipart(headers, fileName, bytes), String.class);
	}

	private CorpusUploadService.UploadRow upload(HttpHeaders headers, String fileName) {
		var resp = rest.exchange(BASE, HttpMethod.POST, multipart(headers, fileName, PDF_BYTES),
				CorpusUploadService.UploadRow.class);
		assertThat(resp.getStatusCode()).isEqualTo(HttpStatus.ACCEPTED);
		return resp.getBody();
	}

	private <T> ResponseEntity<T> publish(HttpHeaders headers, UUID id, String title, Class<T> type) {
		return rest.exchange(BASE + "/" + id + "/publish", HttpMethod.POST,
				new HttpEntity<>(Map.of("title", title), headers), type);
	}

	/** Trích chạy ở luồng nền: chờ dòng rời PROCESSING, tối đa 5 s. */
	private String awaitDone(UUID id) throws InterruptedException {
		for (int i = 0; i < 50; i++) {
			String status = jdbc.queryForObject("SELECT status FROM corpus_uploads WHERE id = ?", String.class, id);
			if (!"PROCESSING".equals(status)) {
				return status;
			}
			Thread.sleep(100);
		}
		throw new AssertionError("Quá 5 s vẫn PROCESSING: " + id);
	}

	private static HttpEntity<MultiValueMap<String, Object>> multipart(HttpHeaders headers, String fileName, byte[] bytes) {
		MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
		body.add("file", new ByteArrayResource(bytes) {
			@Override
			public String getFilename() {
				return fileName;
			}
		});
		HttpHeaders merged = new HttpHeaders();
		merged.addAll(headers);
		merged.setContentType(MediaType.MULTIPART_FORM_DATA);
		return new HttpEntity<>(body, merged);
	}
}

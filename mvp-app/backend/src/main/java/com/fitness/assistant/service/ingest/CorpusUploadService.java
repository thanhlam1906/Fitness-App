package com.fitness.assistant.service.ingest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/**
 * Thả PDF → trích nền → chờ duyệt → vào kho (doc/design-nap-tai-lieu-v1.md §3, §5).
 * corpus_uploads chỉ giữ file CHƯA vào kho: duyệt hoặc bỏ thì xoá dòng.
 */
@Service
public class CorpusUploadService {

	static final String INTERRUPTED = "Bị gián đoạn khi máy chủ khởi động lại. Thả lại file.";
	static final String NO_TEXT = "Không trích được chữ nào từ file này.";
	private static final byte[] PDF_MAGIC = "%PDF-".getBytes(StandardCharsets.US_ASCII);
	private static final Logger log = LoggerFactory.getLogger(CorpusUploadService.class);
	private static final String SELECT_ROW = """
			SELECT u.id, u.file_name, u.status, u.error, u.created_at, u.markdown,
			       d.title AS doc_title, d.ingested_at AS doc_ingested_at,
			       (SELECT count(*) FROM doc_chunks c WHERE c.document_id = d.id) AS doc_chunks
			FROM corpus_uploads u LEFT JOIN documents d ON d.source = u.file_name
			""";

	public record Replaces(String title, Instant ingestedAt, int chunkCount) {
	}

	public record UploadRow(UUID id, String fileName, String status, String error, Instant createdAt,
			Replaces replaces) {
	}

	public record ChunkPreview(String heading, String content) {
	}

	public record UploadDetail(UUID id, String fileName, String status, String error, Instant createdAt,
			Replaces replaces, List<ChunkPreview> chunks) {
	}

	private final JdbcTemplate jdbc;
	private final PdfExtractor extractor;
	private final CorpusLoader loader;
	// Một luồng: processFile của OpenDataLoader không hứa an toàn khi chạy song song, pdf-hybrid cũng
	// xử lý tuần tự. File thả sau xếp hàng chờ.
	private final ExecutorService worker = Executors.newSingleThreadExecutor();
	private volatile boolean stopping;

	public CorpusUploadService(JdbcTemplate jdbc, PdfExtractor extractor, CorpusLoader loader) {
		this.jdbc = jdbc;
		this.extractor = extractor;
		this.loader = loader;
	}

	public UploadRow accept(MultipartFile file) {
		String fileName = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().strip();
		if (fileName.isEmpty()) {
			throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Thiếu tên file.");
		}
		Path pdf = saveIfPdf(file, fileName);
		try {
			UUID id = jdbc.queryForObject(
					"INSERT INTO corpus_uploads (file_name, status) VALUES (?, 'PROCESSING') RETURNING id",
					UUID.class, fileName);
			// Đọc dòng TRƯỚC khi giao việc: luồng nền có thể xong trước khi request này trả về.
			UploadRow created = row(id);
			worker.submit(() -> process(id, pdf));
			return created;
		} catch (RuntimeException e) {
			// Chưa giao được cho luồng nền thì không ai xoá file tạm nữa (spec §5: PDF chỉ nằm trên đĩa lúc trích).
			deleteQuietly(pdf);
			throw e;
		}
	}

	void process(UUID id, Path pdf) {
		try {
			String markdown = extractor.extract(pdf);
			if (CorpusLoader.chunk(markdown).isEmpty()) {
				fail(id, NO_TEXT);
			} else {
				jdbc.update("UPDATE corpus_uploads SET status = 'READY', markdown = ? WHERE id = ? AND status = 'PROCESSING'",
						markdown, id);
			}
		} catch (PdfExtractor.ExtractionFailed e) {
			log.warn("Trích PDF của file nạp {} lỗi", id, e);
			fail(id, e.getMessage());
		} catch (RuntimeException | Error e) {
			// Error (hết bộ nhớ với PDF lớn) cũng phải về FAILED: submit nuốt mất nó, dòng sẽ treo "Đang trích…".
			log.error("Xử lý file nạp {} lỗi", id, e);
			fail(id, "Máy trích PDF lỗi: " + e.getMessage());
		} finally {
			deleteQuietly(pdf);
		}
	}

	// @PostConstruct, không phải ApplicationReadyEvent: chạy trước khi web server nhận request, nên không
	// đánh nhầm FAILED một file vừa thả trong lúc app đang khởi động.
	@PostConstruct
	public void failInterrupted() {
		// Hàng đợi nằm trong bộ nhớ: khởi động lại là mất việc đang làm. Báo admin thả lại thay vì
		// để dòng "Đang trích…" treo mãi.
		jdbc.update("UPDATE corpus_uploads SET status = 'FAILED', error = ? WHERE status = 'PROCESSING'", INTERRUPTED);
	}

	public List<UploadRow> list() {
		return jdbc.query(SELECT_ROW + " ORDER BY u.created_at DESC", (rs, i) -> toRow(rs));
	}

	public UploadDetail detail(UUID id) {
		return jdbc.query(SELECT_ROW + " WHERE u.id = ?", (rs, i) -> {
			UploadRow r = toRow(rs);
			String markdown = rs.getString("markdown");
			List<ChunkPreview> chunks = "READY".equals(r.status()) && markdown != null
					? CorpusLoader.chunk(markdown).stream().map(c -> new ChunkPreview(c[0], c[1])).toList()
					: List.of();
			return new UploadDetail(r.id(), r.fileName(), r.status(), r.error(), r.createdAt(), r.replaces(), chunks);
		}, id).stream().findFirst().orElseThrow(CorpusUploadService::notFound);
	}

	@Transactional
	public CorpusLoader.Published publish(UUID id, String title) {
		// FOR UPDATE: bấm "Đưa vào trợ lý" hai lần liền thì lần sau chờ lần trước xong rồi thấy dòng
		// đã bị xoá → 404, không nạp trùng.
		Map<String, Object> upload = jdbc.queryForList(
				"SELECT file_name, status, markdown FROM corpus_uploads WHERE id = ? FOR UPDATE", id)
				.stream().findFirst().orElseThrow(CorpusUploadService::notFound);
		if (!"READY".equals(upload.get("status"))) {
			throw new ResponseStatusException(HttpStatus.CONFLICT, "File chưa trích xong hoặc đã lỗi, chưa đưa vào được.");
		}
		CorpusLoader.Published published = loader.publish(
				(String) upload.get("file_name"), title.strip(), (String) upload.get("markdown"));
		jdbc.update("DELETE FROM corpus_uploads WHERE id = ?", id);
		return published;
	}

	public void discard(UUID id) {
		// Dòng PROCESSING cũng xoá được: luồng nền cập nhật 0 dòng rồi thôi, PDF vẫn bị xoá ở finally.
		if (jdbc.update("DELETE FROM corpus_uploads WHERE id = ?", id) == 0) {
			throw notFound();
		}
	}

	private UploadRow row(UUID id) {
		return jdbc.query(SELECT_ROW + " WHERE u.id = ?", (rs, i) -> toRow(rs), id).get(0);
	}

	private void fail(UUID id, String error) {
		// Đang tắt app thì shutdownNow ngắt luồng nền: lỗi lúc này do bị ngắt (OkHttp báo như quá giờ), không
		// phải do file. Ghi đúng lý do để admin chỉ cần thả lại, không đi tách PDF.
		jdbc.update("UPDATE corpus_uploads SET status = 'FAILED', error = ? WHERE id = ? AND status = 'PROCESSING'",
				stopping ? INTERRUPTED : error, id);
	}

	private static Path saveIfPdf(MultipartFile file, String fileName) {
		Path pdf = null;
		try {
			// Tên file tạm ngẫu nhiên, không lấy tên người gửi: tên đó chỉ để hiện và làm source. Còn vì
			// client Java của OpenDataLoader trên Windows đọc sai tên có dấu ("Tổng" → "T?ng").
			pdf = Files.createTempFile("corpus-upload-", ".pdf");
			file.transferTo(pdf);
			byte[] head;
			try (InputStream in = Files.newInputStream(pdf)) {
				head = in.readNBytes(PDF_MAGIC.length);
			}
			if (!Arrays.equals(head, PDF_MAGIC)) {
				deleteQuietly(pdf);
				throw new ResponseStatusException(HttpStatus.BAD_REQUEST, fileName + ": không phải PDF, chỉ nhận file PDF.");
			}
			return pdf;
		} catch (IOException e) {
			deleteQuietly(pdf);
			throw new UncheckedIOException(e);
		}
	}

	private static void deleteQuietly(Path pdf) {
		if (pdf == null) {
			return;
		}
		try {
			Files.deleteIfExists(pdf);
		} catch (IOException e) {
			log.warn("Không xoá được PDF tạm {}", pdf, e);
		}
	}

	private static UploadRow toRow(ResultSet rs) throws SQLException {
		String docTitle = rs.getString("doc_title");
		Replaces replaces = docTitle == null ? null
				: new Replaces(docTitle, rs.getTimestamp("doc_ingested_at").toInstant(), rs.getInt("doc_chunks"));
		return new UploadRow(rs.getObject("id", UUID.class), rs.getString("file_name"), rs.getString("status"),
				rs.getString("error"), rs.getTimestamp("created_at").toInstant(), replaces);
	}

	private static ResponseStatusException notFound() {
		return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy file này.");
	}

	@PreDestroy
	void stop() {
		stopping = true;
		worker.shutdownNow();
	}
}

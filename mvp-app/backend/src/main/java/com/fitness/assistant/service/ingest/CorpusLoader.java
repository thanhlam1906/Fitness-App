package com.fitness.assistant.service.ingest;

import com.fitness.assistant.dto.PublishResponse;
import com.fitness.assistant.service.retrieval.EmbeddingFormat;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

/**
 * Đưa Markdown vào documents + doc_chunks cho trợ lý (doc/design-nap-tai-lieu-v1.md §5).
 *
 * Chunk = một mục mở bằng tiêu đề cấp 1–3. Mục quá ngắn gộp vào mục trước (mục đầu tiên thì gộp
 * vào mục sau), nếu không FTS trả về chunk chỉ có mỗi cái tiêu đề. Mục quá dài cắt theo đoạn văn.
 */
@Service
public class CorpusLoader {

	// ponytail: ngưỡng gộp/cắt cố định; tinh chỉnh khi eval (§11) cho thấy chunk quá nhỏ/quá to.
	// MAX theo đích "500-800 token" của concept-chatbot-v1.md §5.1 (~4 ký tự/token tiếng Việt).
	static final int MIN_CHUNK_CHARS = 200;
	static final int MAX_CHUNK_CHARS = 3200;
	// OpenDataLoader (--heading-hierarchy) trả #, ##, ### theo cấu trúc tài liệu; Docling chạy tay
	// trước đây trả toàn "##". Cấp 4 trở xuống là ý nhỏ, để nằm trong mục cha.
	private static final String HEADING = "(?m)^#{1,3} ";
	// OpenAI giới hạn tổng token mỗi request: sách dày vài trăm đoạn gửi một lần thì lỗi mãi.
	static final int EMBED_BATCH = 100;

	private final JdbcTemplate jdbc;
	private final EmbeddingModel embeddingModel;

	public CorpusLoader(JdbcTemplate jdbc, EmbeddingModel embeddingModel) {
		this.jdbc = jdbc;
		this.embeddingModel = embeddingModel;
	}

	/**
	 * Một tài liệu vào kho; cùng source đã có thì thay (xoá rồi chèn, cùng transaction). Embedding
	 * gọi TRƯỚC mọi lệnh ghi: OpenAI lỗi thì DB chưa bị đụng, bản cũ còn nguyên cho trợ lý dùng.
	 */
	@Transactional
	public PublishResponse publish(String source, String title, String markdown) {
		List<String[]> chunks = chunk(markdown);
		if (chunks.isEmpty()) {
			throw new IllegalStateException(source + ": không có mục tiêu đề nào");
		}
		List<float[]> vectors = new ArrayList<>();
		try {
			// Bậc 2 (§5.2): gọi theo lô, không phải N lời gọi rời cho từng đoạn.
			for (int from = 0; from < chunks.size(); from += EMBED_BATCH) {
				List<String> batch = chunks.subList(from, Math.min(chunks.size(), from + EMBED_BATCH)).stream()
						.map(c -> c[1]).toList();
				embeddingModel.embedForResponse(batch).getResults().forEach(r -> vectors.add(r.getOutput()));
			}
		} catch (RuntimeException e) {
			throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
					"Chưa nạp được (lỗi tạo embedding). Thử lại sau.", e);
		}

		jdbc.update("DELETE FROM documents WHERE source = ?", source);
		UUID docId = jdbc.queryForObject(
				"INSERT INTO documents (title, source, license) VALUES (?, ?, 'unknown') RETURNING id",
				UUID.class, title, source);
		for (int i = 0; i < chunks.size(); i++) {
			String vector = EmbeddingFormat.toVectorLiteral(vectors.get(i));
			jdbc.update("""
					INSERT INTO doc_chunks (document_id, ord, heading_path, content, embedding)
					VALUES (?, ?, ?, ?, ?::vector)
					""",
					docId, i, chunks.get(i)[0], chunks.get(i)[1], vector);
		}
		return new PublishResponse(docId, chunks.size());
	}

	/** Trả về [heading, content]; content gồm cả dòng heading để FTS khớp được tiêu đề. */
	static List<String[]> chunk(String body) {
		List<String[]> out = new ArrayList<>();
		String pending = null;
		for (String section : body.split(HEADING)) {
			String s = unescape(section).strip();
			if (s.isEmpty()) {
				continue;
			}
			String heading = s.lines().findFirst().orElse("");
			for (String part : splitIfTooLong(s, heading)) {
				if (pending != null) {
					part = pending + "\n\n" + part;
					pending = null;
				}
				// Mục ngắn gộp vào đoạn trước, nhưng không cho đoạn đó vượt MAX: trăm mục chỉ có tiêu đề
				// liền nhau (mục lục) gộp hết thì vượt giới hạn token của embedding.
				String[] prev = out.isEmpty() ? null : out.get(out.size() - 1);
				if (part.length() >= MIN_CHUNK_CHARS) {
					out.add(new String[] {heading, part});
				} else if (prev != null && prev[1].length() + 2 + part.length() <= MAX_CHUNK_CHARS) {
					prev[1] = prev[1] + "\n\n" + part;
				} else if (prev != null) {
					out.add(new String[] {heading, part});
				} else {
					pending = part;
				}
			}
		}
		if (pending != null) {
			out.add(new String[] {pending.lines().findFirst().orElse(""), pending});
		}
		return out;
	}

	/**
	 * Mục dài hơn MAX_CHUNK_CHARS (chương sách, không phải slide) thì cắt theo đoạn văn (dòng
	 * trống), không cắt giữa câu. Mỗi mảnh nhắc lại heading để vẫn tự đứng được khi FTS trả về
	 * riêng mảnh đó.
	 */
	private static List<String> splitIfTooLong(String section, String heading) {
		if (section.length() <= MAX_CHUNK_CHARS) {
			return List.of(section);
		}
		List<String> parts = new ArrayList<>();
		StringBuilder current = new StringBuilder(heading);
		for (String paragraph : section.split("\n\n+")) {
			String sep = "\n\n";
			for (String piece : fitToMax(paragraph)) {
				if (current.length() > heading.length() && current.length() + sep.length() + piece.length() > MAX_CHUNK_CHARS) {
					parts.add(current.toString());
					current = new StringBuilder(heading);
					sep = "\n\n";
				}
				current.append(sep).append(piece);
				sep = "\n"; // các dòng của cùng một đoạn văn vẫn liền nhau
			}
		}
		parts.add(current.toString());
		return parts;
	}

	/**
	 * Đoạn văn không có dòng trống mà dài quá MAX (bảng Markdown nhiều trang) thì cắt theo dòng; dòng
	 * vẫn quá dài thì cắt cứng. Nửa MAX để dòng heading nhắc lại ở đầu mảnh không đẩy mảnh vượt MAX.
	 */
	private static List<String> fitToMax(String paragraph) {
		if (paragraph.length() <= MAX_CHUNK_CHARS) {
			return List.of(paragraph);
		}
		int step = MAX_CHUNK_CHARS / 2;
		List<String> pieces = new ArrayList<>();
		for (String line : paragraph.split("\n")) {
			for (int i = 0; i < line.length(); i += step) {
				pieces.add(line.substring(i, Math.min(line.length(), i + step)));
			}
		}
		return pieces;
	}

	private static String unescape(String s) {
		return s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"");
	}
}

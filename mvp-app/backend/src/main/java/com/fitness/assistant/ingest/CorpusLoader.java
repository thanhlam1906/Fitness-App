package com.fitness.assistant.ingest;

import com.fitness.assistant.retrieval.EmbeddingFormat;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.embedding.EmbeddingResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Nạp content/corpus/*.md (Docling sinh, front-matter thêm tay) vào documents +
 * doc_chunks. Chạy bằng lệnh admin, không phải service — corpus đổi vài lần một
 * tháng (concept-chatbot-v1.md §7). Nạp lại theo source: xoá rồi chèn, idempotent.
 *
 * Chunk = một mục "## ". Docling xuất slide nên heading con ("Mục tiêu:", "Đặc điểm:")
 * cũng thành "##" → mục quá ngắn gộp vào mục trước, nếu không FTS trả về chunk
 * chỉ có mỗi cái tiêu đề.
 */
@Service
public class CorpusLoader {

	// ponytail: ngưỡng gộp/cắt cố định; tinh chỉnh khi eval (§11) cho thấy chunk quá nhỏ/quá to.
	// MAX theo đích "500-800 token" của concept-chatbot-v1.md §5.1 (~4 ký tự/token
	// tiếng Việt) — 3 tài liệu đầu (slide bài giảng, mục ngắn) chưa từng chạm
	// ngưỡng này nên chưa lộ ra, nhưng một cuốn sách với mục dài cả chương thì có.
	static final int MIN_CHUNK_CHARS = 200;
	static final int MAX_CHUNK_CHARS = 3200;

	private final JdbcTemplate jdbc;
	private final EmbeddingModel embeddingModel;
	private final Path corpusPath;

	public CorpusLoader(JdbcTemplate jdbc, EmbeddingModel embeddingModel, @Value("${app.corpus-path}") String corpusPath) {
		this.jdbc = jdbc;
		this.embeddingModel = embeddingModel;
		this.corpusPath = Path.of(corpusPath);
	}

	public record Result(int documents, int chunks) {
	}

	@Transactional
	public Result reload() {
		int documents = 0;
		int chunks = 0;
		try (Stream<Path> files = Files.list(corpusPath)) {
			for (Path file : files.filter(f -> f.toString().endsWith(".md")).sorted().toList()) {
				chunks += load(file);
				documents++;
			}
		} catch (IOException e) {
			throw new UncheckedIOException(e);
		}
		return new Result(documents, chunks);
	}

	private int load(Path file) throws IOException {
		String source = file.getFileName().toString();
		String text = Files.readString(file);
		Map<String, String> meta = frontMatter(text);
		String body = text.startsWith("---") ? text.substring(text.indexOf("\n---", 3) + 4) : text;
		List<String[]> chunks = chunk(body);
		if (chunks.isEmpty()) {
			throw new IllegalStateException(source + ": không có mục '## ' nào");
		}

		jdbc.update("DELETE FROM documents WHERE source = ?", source);
		UUID docId = jdbc.queryForObject(
				"INSERT INTO documents (title, source, topic, license) VALUES (?, ?, ?, ?) RETURNING id",
				UUID.class,
				meta.getOrDefault("title", chunks.get(0)[0]), source, meta.get("topic"),
				meta.getOrDefault("license", "unknown"));

		// Bậc 2 (§5.2): 1 lời gọi cho cả tài liệu (batch), không phải N lời gọi rời.
		EmbeddingResponse response = embeddingModel.embedForResponse(chunks.stream().map(c -> c[1]).toList());
		for (int i = 0; i < chunks.size(); i++) {
			String vector = EmbeddingFormat.toVectorLiteral(response.getResults().get(i).getOutput());
			jdbc.update("""
					INSERT INTO doc_chunks (document_id, ord, heading_path, content, embedding)
					VALUES (?, ?, ?, ?, ?::vector)
					""",
					docId, i, chunks.get(i)[0], chunks.get(i)[1], vector);
		}
		return chunks.size();
	}

	/** "key: value" giữa hai dòng "---" đầu file. Không có thì map rỗng. */
	static Map<String, String> frontMatter(String text) {
		Map<String, String> meta = new HashMap<>();
		if (!text.startsWith("---")) {
			return meta;
		}
		int end = text.indexOf("\n---", 3);
		for (String line : text.substring(3, end).split("\n")) {
			int colon = line.indexOf(':');
			if (colon > 0) {
				meta.put(line.substring(0, colon).trim(), line.substring(colon + 1).trim());
			}
		}
		return meta;
	}

	/** Trả về [heading, content]; content gồm cả dòng heading để FTS khớp được tiêu đề. */
	static List<String[]> chunk(String body) {
		List<String[]> out = new ArrayList<>();
		for (String section : body.split("(?m)^## ")) {
			String s = unescape(section).strip();
			if (s.isEmpty()) {
				continue;
			}
			String heading = s.lines().findFirst().orElse("");
			for (String part : splitIfTooLong(s, heading)) {
				if (!out.isEmpty() && part.length() < MIN_CHUNK_CHARS) {
					String[] prev = out.get(out.size() - 1);
					prev[1] = prev[1] + "\n\n" + part;
				} else {
					out.add(new String[] {heading, part});
				}
			}
		}
		return out;
	}

	/**
	 * Mục dài hơn MAX_CHUNK_CHARS (chương sách, không phải slide) thì cắt theo
	 * đoạn văn (dòng trống) — không cắt giữa câu. Mỗi mảnh nhắc lại heading để
	 * vẫn tự đứng được khi FTS trả về riêng mảnh đó, không kèm mảnh đầu.
	 */
	private static List<String> splitIfTooLong(String section, String heading) {
		if (section.length() <= MAX_CHUNK_CHARS) {
			return List.of(section);
		}
		List<String> parts = new ArrayList<>();
		StringBuilder current = new StringBuilder(heading);
		for (String paragraph : section.split("\n\n+")) {
			if (current.length() > heading.length() && current.length() + paragraph.length() > MAX_CHUNK_CHARS) {
				parts.add(current.toString());
				current = new StringBuilder(heading);
			}
			current.append("\n\n").append(paragraph);
		}
		parts.add(current.toString());
		return parts;
	}

	private static String unescape(String s) {
		return s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", "\"");
	}
}

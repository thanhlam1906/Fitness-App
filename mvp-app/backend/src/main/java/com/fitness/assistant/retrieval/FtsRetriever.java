package com.fitness.assistant.retrieval;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Bậc 1 (concept-chatbot-v1.md §5.1): full-text thuần, không embedding. Trả về
 * chunk cho câu hỏi nhóm A, hoặc rỗng nếu không có gì đủ liên quan — rỗng thì
 * AssistantService phải trả lời "không có trong tài liệu", không suy diễn (§8).
 *
 * plainto_tsquery AND toàn bộ từ trượt câu hỏi tự nhiên ("RPE là gì" không khớp
 * gì vì "là"/"gì" không có trong corpus). Chuyển sang OR thì lấy rác: câu hỏi
 * ngoài corpus vẫn ra kết quả nếu nó có một từ chung ("giảm" trong "giảm mỡ" ăn
 * theo "giảm tải"). Sửa: bỏ hư từ trước khi query, và loại kết quả chỉ khớp
 * dưới một nửa số từ nội dung (ts_rank thấp không tự nói lên điều đó — số từ
 * khớp mới nói).
 */
@Service
public class FtsRetriever {

	// ponytail: danh sách cứng, không phải bộ stopword đầy đủ tiếng Việt — đủ
	// cho câu hỏi kiểu "X là gì", "có nên Y không". Mở rộng khi eval (§11) chỉ
	// ra từ nào còn lọt.
	private static final Set<String> STOPWORDS = Set.of(
			"là", "gì", "có", "không", "nên", "thì", "và", "hay", "hoặc", "hoặc là",
			"của", "cho", "được", "bị", "ạ", "vậy", "à", "sao", "như", "thế", "nào",
			"mình", "tôi", "bạn", "mấy", "một", "các", "những", "để", "khi", "với");

	private static final Pattern WORD = Pattern.compile("\\p{L}+");

	private final JdbcTemplate jdbc;

	public FtsRetriever(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public record Chunk(UUID id, String documentTitle, String headingPath, String content) {
	}

	public List<Chunk> search(String question, int limit) {
		List<String> words = WORD.matcher(question.toLowerCase()).results()
				.map(m -> m.group())
				.filter(w -> !STOPWORDS.contains(w))
				.toList();
		if (words.isEmpty()) {
			return List.of();
		}
		String tsquery = String.join(" | ", words);
		int minMatches = Math.max(1, (words.size() + 1) / 2); // > 50%, làm tròn lên

		// Lấy dư (limit*3) vì lọc "khớp >= 50% số từ" chạy ở Java sau đó — ts_rank
		// không tự nói lên tỉ lệ khớp, phải đếm bằng tay.
		return jdbc.query("""
				SELECT c.id, d.title, c.heading_path, c.content
				FROM doc_chunks c
				JOIN documents d ON d.id = c.document_id
				WHERE c.ts @@ to_tsquery('simple', immutable_unaccent(?))
				ORDER BY ts_rank(c.ts, to_tsquery('simple', immutable_unaccent(?))) DESC
				LIMIT ?
				""",
				(rs, i) -> new Chunk(
						UUID.fromString(rs.getString("id")), rs.getString("title"),
						rs.getString("heading_path"), rs.getString("content")),
				tsquery, tsquery, limit * 3L)
				.stream()
				.filter(c -> countMatches(c.content(), words) >= minMatches)
				.limit(limit)
				.toList();
	}

	private long countMatches(String content, List<String> words) {
		String lower = immutableFold(content);
		return words.stream().filter(lower::contains).count();
	}

	// Java không có unaccent — chuẩn hoá bằng NFD + bỏ dấu, khớp cách Postgres unaccent làm.
	private static String immutableFold(String s) {
		String n = java.text.Normalizer.normalize(s.toLowerCase(), java.text.Normalizer.Form.NFD);
		return n.replaceAll("\\p{M}", "").replace("đ", "d");
	}
}

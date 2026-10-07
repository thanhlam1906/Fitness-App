package com.fitness.assistant.service.ingest;

import com.fitness.assistant.dto.DocChunkResponse;
import com.fitness.assistant.dto.DocumentDetailResponse;
import com.fitness.assistant.dto.DocumentRowResponse;
import com.fitness.assistant.dto.WrongAnswerResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Tài liệu trong kho kèm số câu trả lời bị báo sai; gỡ tài liệu (doc/design-nap-tai-lieu-v1.md §4–5). */
@Service
public class CorpusDocuments {

	// Câu trả lời m "bị báo sai" với một tài liệu: có góp ý is_wrong VÀ đã trích ít nhất một đoạn
	// của tài liệu đó. Đếm theo câu trả lời, không theo số lần bấm. %s = id tài liệu (cột hoặc ?).
	private static final String WRONG_FOR_DOC = """
			EXISTS (SELECT 1 FROM cue_feedback f WHERE f.assistant_message_id = m.id AND f.is_wrong)
			AND EXISTS (SELECT 1 FROM doc_chunks c WHERE c.document_id = %s AND c.id = ANY(m.chunk_ids))
			""";
	private static final String SELECT_DOC = """
			SELECT d.id, d.title, d.source, d.ingested_at,
			       (SELECT count(*) FROM doc_chunks c WHERE c.document_id = d.id) AS chunk_count,
			       (SELECT count(*) FROM assistant_messages m WHERE %s) AS wrong_count
			FROM documents d
			""".formatted(WRONG_FOR_DOC.formatted("d.id"));

	private final JdbcTemplate jdbc;

	public CorpusDocuments(JdbcTemplate jdbc) {
		this.jdbc = jdbc;
	}

	public List<DocumentRowResponse> list() {
		return jdbc.query(SELECT_DOC + " ORDER BY d.ingested_at DESC", (rs, i) -> toRow(rs));
	}

	public DocumentDetailResponse detail(UUID id) {
		DocumentRowResponse doc = jdbc.query(SELECT_DOC + " WHERE d.id = ?", (rs, i) -> toRow(rs), id).stream()
				.findFirst().orElseThrow(CorpusDocuments::notFound);
		List<DocChunkResponse> chunks = jdbc.query(
				"SELECT id, ord, heading_path, content FROM doc_chunks WHERE document_id = ? ORDER BY ord",
				(rs, i) -> new DocChunkResponse(rs.getObject("id", UUID.class), rs.getInt("ord"),
						rs.getString("heading_path"), rs.getString("content")),
				id);
		// Câu hỏi = tin USER ngay trước trong cùng thread. Không trả user id: admin cần biết tài liệu
		// sai ở đâu, không cần biết ai hỏi.
		List<WrongAnswerResponse> wrong = jdbc.query("""
				SELECT m.id, m.content, m.created_at,
				       (SELECT q.content FROM assistant_messages q
				         WHERE q.thread_id = m.thread_id AND q.user_id = m.user_id AND q.role = 'USER'
				           AND q.created_at < m.created_at
				         ORDER BY q.created_at DESC LIMIT 1) AS question,
				       (SELECT f.note FROM cue_feedback f WHERE f.assistant_message_id = m.id AND f.is_wrong
				         ORDER BY f.created_at DESC LIMIT 1) AS note,
				       ARRAY(SELECT c.ord FROM doc_chunks c WHERE c.document_id = ? AND c.id = ANY(m.chunk_ids)
				             ORDER BY c.ord) AS ords
				FROM assistant_messages m
				WHERE %s
				ORDER BY m.created_at DESC
				""".formatted(WRONG_FOR_DOC.formatted("?")),
				(rs, i) -> new WrongAnswerResponse(rs.getObject("id", UUID.class), rs.getString("question"),
						rs.getString("content"), rs.getString("note"), rs.getTimestamp("created_at").toInstant(),
						Arrays.asList((Integer[]) rs.getArray("ords").getArray())),
				id, id);
		return new DocumentDetailResponse(doc.id(), doc.title(), doc.source(), doc.ingestedAt(), doc.chunkCount(),
				doc.wrongCount(), chunks, wrong);
	}

	public void remove(UUID id) {
		// doc_chunks xoá theo (ON DELETE CASCADE, V6). id treo lại trong assistant_messages.chunk_ids vô
		// hại: mọi truy vấn ở đây đều JOIN doc_chunks.
		if (jdbc.update("DELETE FROM documents WHERE id = ?", id) == 0) {
			throw notFound();
		}
	}

	private static DocumentRowResponse toRow(ResultSet rs) throws SQLException {
		return new DocumentRowResponse(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("source"),
				rs.getTimestamp("ingested_at").toInstant(), rs.getInt("chunk_count"), rs.getInt("wrong_count"));
	}

	private static ResponseStatusException notFound() {
		return new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy tài liệu này.");
	}
}

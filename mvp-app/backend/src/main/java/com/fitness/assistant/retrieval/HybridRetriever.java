package com.fitness.assistant.retrieval;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Bậc 2 (concept-chatbot-v1.md §5.2): gộp FTS (bậc 1, khớp từ) và vector
 * (khớp nghĩa) bằng Reciprocal Rank Fusion — điểm mỗi chunk = tổng
 * 1/(k + hạng) trên từng danh sách nó xuất hiện, k=60 là hằng số RRF kinh
 * điển (không nhạy với giá trị chính xác, chỉ cần đủ lớn để hạng thấp không
 * lấn át hạng cao). Chunk chỉ 1 trong 2 nguồn tìm ra vẫn được tính điểm —
 * đó chính là lý do hybrid tốt hơn từng cái riêng.
 */
@Service
public class HybridRetriever {

	private static final int RRF_K = 60;

	private final FtsRetriever fts;
	private final VectorRetriever vector;

	public HybridRetriever(FtsRetriever fts, VectorRetriever vector) {
		this.fts = fts;
		this.vector = vector;
	}

	public List<FtsRetriever.Chunk> search(String question, int limit) {
		List<FtsRetriever.Chunk> ftsResults = fts.search(question, limit * 2);
		List<FtsRetriever.Chunk> vectorResults = vector.search(question, limit * 2);

		Map<UUID, FtsRetriever.Chunk> byId = new LinkedHashMap<>();
		Map<UUID, Double> scores = new LinkedHashMap<>();
		addRrfScores(ftsResults, byId, scores);
		addRrfScores(vectorResults, byId, scores);

		List<UUID> ranked = new ArrayList<>(scores.keySet());
		ranked.sort((a, b) -> Double.compare(scores.get(b), scores.get(a)));
		return ranked.stream().limit(limit).map(byId::get).toList();
	}

	private static void addRrfScores(
			List<FtsRetriever.Chunk> results, Map<UUID, FtsRetriever.Chunk> byId, Map<UUID, Double> scores) {
		for (int rank = 0; rank < results.size(); rank++) {
			FtsRetriever.Chunk chunk = results.get(rank);
			byId.putIfAbsent(chunk.id(), chunk);
			scores.merge(chunk.id(), 1.0 / (RRF_K + rank + 1), Double::sum);
		}
	}
}

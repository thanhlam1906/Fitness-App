package com.fitness.assistant.ingest;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * chunk() thuần, không cần Postgres — dành riêng cho hành vi cắt mục quá dài
 * (sách/giáo trình nhiều trang, khác 3 tài liệu slide đầu chưa từng chạm
 * ngưỡng này).
 */
class CorpusLoaderTest {

	@Test
	void chunk_splitsLongSection_byParagraph_keepingEachUnderMax() {
		String heading = "Chương 3";
		// Mỗi đoạn ~150 ký tự, 30 đoạn → ~4500 ký tự, vượt MAX_CHUNK_CHARS (3200).
		String paragraph = "x".repeat(140) + ".";
		String longSection = "## " + heading + "\n\n"
				+ String.join("\n\n", java.util.Collections.nCopies(30, paragraph));

		List<String[]> chunks = CorpusLoader.chunk(longSection);

		assertThat(chunks.size()).isGreaterThan(1);
		assertThat(chunks).allSatisfy(c -> assertThat(c[1].length()).isLessThanOrEqualTo(3200 + paragraph.length()));
		// Mỗi mảnh nhắc lại heading — tự đứng được khi FTS chỉ trả về đúng mảnh đó.
		assertThat(chunks).allSatisfy(c -> assertThat(c[1]).startsWith(heading));
		// Ghép lại đủ nội dung gốc, không rơi mất đoạn nào.
		long totalXs = chunks.stream().mapToLong(c -> c[1].chars().filter(ch -> ch == 'x').count()).sum();
		assertThat(totalXs).isEqualTo(30L * 140);
	}

	@Test
	void chunk_keepsShortSectionIntact_noSplitting() {
		String section = "## Mục ngắn\n\nMột đoạn văn bình thường, không cần cắt.";

		List<String[]> chunks = CorpusLoader.chunk(section);

		assertThat(chunks).hasSize(1);
		assertThat(chunks.get(0)[1]).contains("Một đoạn văn bình thường");
	}
}

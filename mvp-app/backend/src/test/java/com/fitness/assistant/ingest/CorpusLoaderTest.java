package com.fitness.assistant.ingest;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * chunk() thuần, không cần Postgres: cắt theo tiêu đề, gộp mục ngắn, cắt mục quá dài (sách/giáo
 * trình nhiều trang), và chịu được Markdown thật của OpenDataLoader.
 */
class CorpusLoaderTest {

	@Test
	void chunk_opensSectionAtHeadingLevels1To3_butNotLevel4() {
		String body = """
				# Tài liệu

				%s

				## Mục hai

				%s

				### Mục ba

				%s

				#### Ý nhỏ trong mục ba
				Dòng này vẫn thuộc mục ba.
				""".formatted("a".repeat(250), "b".repeat(250), "c".repeat(250));

		List<String[]> chunks = CorpusLoader.chunk(body);

		assertThat(chunks).extracting(c -> c[0]).containsExactly("Tài liệu", "Mục hai", "Mục ba");
		assertThat(chunks.get(2)[1]).contains("#### Ý nhỏ trong mục ba").contains("Dòng này vẫn thuộc mục ba.");
	}

	@Test
	void chunk_shortLeadingTitle_mergesIntoNextSection_notLeftAlone() {
		// Tên tài liệu đứng một mình ở đầu: chưa có mục trước để gộp vào. Để riêng thì FTS trả về
		// một chunk chỉ có cái tên.
		String body = "# Bài 4: Phục hồi\n\n## Giấc ngủ\n\n" + "d".repeat(250);

		List<String[]> chunks = CorpusLoader.chunk(body);

		assertThat(chunks).hasSize(1);
		assertThat(chunks.get(0)[0]).isEqualTo("Giấc ngủ");
		assertThat(chunks.get(0)[1]).startsWith("Bài 4: Phục hồi").contains("Giấc ngủ");
	}

	@Test
	void chunk_wholeDocumentShort_stillOneChunk() {
		List<String[]> chunks = CorpusLoader.chunk("# Ghi chú ngắn\n\nchỉ vài chữ");

		assertThat(chunks).hasSize(1);
		assertThat(chunks.get(0)[1]).contains("chỉ vài chữ");
	}

	@Test
	void chunk_realOpenDataLoaderOutput_everyChunkHasHeadingAndBody() throws IOException {
		String md = new String(getClass().getResourceAsStream("/corpus/odl-bai-3.md").readAllBytes(),
				StandardCharsets.UTF_8);

		List<String[]> chunks = CorpusLoader.chunk(md);

		assertThat(chunks.size()).isGreaterThan(1);
		assertThat(chunks).allSatisfy(c -> {
			assertThat(c[0]).isNotBlank();
			assertThat(c[1].length()).isGreaterThanOrEqualTo(CorpusLoader.MIN_CHUNK_CHARS);
		});
	}

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

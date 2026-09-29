package com.fitness.assistant;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.assistant.retrieval.FtsRetriever;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Test thuần cho AssistantService.classify — không cần Postgres/Spring, để kiểm nhanh khi sửa
 * chỗ này. Nguồn: người dùng báo "chatbot bịa nguồn" — hỏi lịch tập (trả lời bằng tool
 * getThisWeekSchedule) vẫn hiện "Nguồn: ..." của chunk tìm được song song, dù model không đọc nó.
 */
class AssistantServiceTest {

	private static FtsRetriever.Chunk chunk(String title) {
		return new FtsRetriever.Chunk(UUID.randomUUID(), title, "heading", "nội dung");
	}

	@Test
	void toolCalled_neverShowsSourceTitles_evenWhenChunksFound() {
		AssistantService.Classification c = AssistantService.classify(
				List.of("getThisWeekSchedule"), List.of(chunk("Bài 1: Tổng quan phương pháp")));

		assertThat(c.intent()).isEqualTo("B");
		assertThat(c.sourceTitles()).isEmpty();
	}

	@Test
	void knowledgeQuestion_withChunks_showsTheirTitles() {
		AssistantService.Classification c = AssistantService.classify(
				List.of(), List.of(chunk("Bài 1"), chunk("Bài 2"), chunk("Bài 1")));

		assertThat(c.intent()).isEqualTo("A");
		assertThat(c.sourceTitles()).containsExactly("Bài 1", "Bài 2"); // distinct, giữ thứ tự
	}

	@Test
	void noToolNoChunk_isUnknown_withoutSourceTitles() {
		AssistantService.Classification c = AssistantService.classify(List.of(), List.of());

		assertThat(c.intent()).isEqualTo("UNKNOWN");
		assertThat(c.sourceTitles()).isEmpty();
	}
}

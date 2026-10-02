package com.fitness.assistant;

import static org.assertj.core.api.Assertions.assertThat;

import com.fitness.assistant.retrieval.FtsRetriever;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

/**
 * Test thuần cho AssistantService.classify — không cần Postgres/Spring, để kiểm nhanh khi sửa
 * chỗ này. Nguồn: người dùng báo "chatbot bịa nguồn" — hỏi lịch tập (trả lời bằng tool
 * getSchedule) vẫn hiện "Nguồn: ..." của chunk tìm được song song, dù model không đọc nó.
 * Sau đó phát hiện thêm hai ca ngược nhau: câu "không có trong tài liệu" vẫn hiện nguồn, và câu
 * hỏi nửa tool nửa kiến thức thì mất hẳn nguồn dù có trích thật.
 *
 * Vòng review đầu (đếm từ rời, ngưỡng 3) bị chỉ ra là sai: tiếng Việt mỗi âm tiết một token, chunk
 * thật dài 200–3200 ký tự nên trùng ngẫu nhiên với từ phổ biến trong domain là chuyện thường — đo
 * trên corpus thật cho thấy câu trả lời thuần tool vẫn khớp 28–47/94 chunk. REAL_CHUNK dưới đây
 * chép nguyên một đoạn của content/corpus/bai-3.md để test bắt được đúng lỗi đó (chunk một câu
 * ngắn kiểu cũ không đủ dài để lộ ra).
 */
class AssistantServiceTest {

	// content/corpus/bai-3.md, mục "Cái nhìn tổng quan" — nguyên văn, không rút gọn.
	private static final String REAL_CONTENT = """
			Trong strength training, volume (tổng số reps), intensity (mức tạ/load) và effort \
			(sự cố gắng) đều liên quan tới nhau ảnh hưởng đến kích thích tập luyện. Mối tương \
			quan này giúp chúng ta hiểu được số reps một vận động viên có thể làm được ở một mức \
			intensity (% 1RM). Ví dụ: 5 reps ở 80% 1RM = RPE 7, 5 reps ở RPE 7 = 80% 1RM, 80% 1RM \
			to RPE 7 = 5 reps.""";
	private static final FtsRetriever.Chunk REAL_CHUNK = new FtsRetriever.Chunk(
			UUID.randomUUID(), "Bài 3: Theo dõi dữ liệu (data-driven) Volume và Intensity",
			"Cái nhìn tổng quan", REAL_CONTENT);

	private static FtsRetriever.Chunk chunk(String title, String content) {
		return new FtsRetriever.Chunk(UUID.randomUUID(), title, "heading", content);
	}

	@Test
	void toolAnswer_notCitingChunk_hasNoSourceTitles_evenThoughChunkWasFound() {
		// Đúng ca gốc: hỏi lịch tập, trả lời hoàn toàn bằng tool, chunk RPE tìm được không liên
		// quan gì tới câu trả lời — không được hiện "Nguồn", dù trùng vài âm tiết phổ biến
		// (buổi, tuần, tập...) với REAL_CHUNK.
		String answer = "Trong 4 tuần qua, bạn chưa bắt đầu buổi tập nào và không có khối lượng "
				+ "nâng nào được ghi nhận. RPE trung bình mỗi buổi không có dữ liệu.";

		AssistantService.Classification c =
				AssistantService.classify(answer, List.of("getProgressSummary"), List.of(REAL_CHUNK));

		assertThat(c.intent()).isEqualTo("B");
		assertThat(c.sourceTitles()).isEmpty();
	}

	@Test
	void knowledgeAnswer_sayingNoInfoInDocs_hasNoSourceTitles_evenThoughChunkWasFound() {
		// Model đã trả lời đúng "không có trong tài liệu" (§8) — cả cụm mẫu câu lẫn chủ đề đều
		// không phải chép lại từ REAL_CHUNK.
		String answer = "Không có thông tin trong tài liệu về số giờ ngủ cần thiết để phục hồi.";

		AssistantService.Classification c = AssistantService.classify(answer, List.of(), List.of(REAL_CHUNK));

		assertThat(c.intent()).isEqualTo("A");
		assertThat(c.sourceTitles()).isEmpty();
	}

	@Test
	void knowledgeAnswer_citingChunk_showsItsTitle() {
		// Chép lại đúng câu ví dụ của REAL_CHUNK — trích dẫn thật.
		String answer = "Theo tài liệu, ví dụ 5 reps ở 80% 1RM = RPE 7 minh hoạ cho mối quan hệ này.";

		AssistantService.Classification c = AssistantService.classify(answer, List.of(), List.of(REAL_CHUNK));

		assertThat(c.intent()).isEqualTo("A");
		assertThat(c.sourceTitles()).containsExactly("Bài 3: Theo dõi dữ liệu (data-driven) Volume và Intensity");
	}

	@Test
	void toolAnswer_alsoCitingChunk_stillShowsItsTitle() {
		// Câu hỏi nửa tool nửa kiến thức: có gọi tool NHƯNG câu trả lời cũng chép lại thật từ chunk.
		String answer = "Tuần này bạn có 3 buổi. Ngoài ra, ví dụ 5 reps ở 80% 1RM = RPE 7 minh hoạ "
				+ "mối quan hệ giữa intensity và RPE.";

		AssistantService.Classification c =
				AssistantService.classify(answer, List.of("getSchedule"), List.of(REAL_CHUNK));

		assertThat(c.intent()).isEqualTo("B");
		assertThat(c.sourceTitles()).containsExactly("Bài 3: Theo dõi dữ liệu (data-driven) Volume và Intensity");
	}

	@Test
	void distinctTitles_keptOnce_inFirstSeenOrder() {
		String answer = "Theo tài liệu, ví dụ 5 reps ở 80% 1RM = RPE 7 minh hoạ cho mối quan hệ này.";
		FtsRetriever.Chunk sameDocDifferentHeading = new FtsRetriever.Chunk(
				UUID.randomUUID(), REAL_CHUNK.documentTitle(), "heading khác", REAL_CONTENT);

		AssistantService.Classification c = AssistantService.classify(
				answer, List.of(), List.of(REAL_CHUNK, sameDocDifferentHeading, chunk("Bài khác", "nội dung khác")));

		assertThat(c.sourceTitles()).containsExactly(REAL_CHUNK.documentTitle());
	}

	@Test
	void shortAnswer_underShingleLength_isNeverCited() {
		AssistantService.Classification c = AssistantService.classify("RPE 7.", List.of(), List.of(REAL_CHUNK));

		assertThat(c.sourceTitles()).isEmpty();
	}

	@Test
	void noToolNoChunk_isUnknown_withoutSourceTitles() {
		AssistantService.Classification c = AssistantService.classify("Không rõ.", List.of(), List.of());

		assertThat(c.intent()).isEqualTo("UNKNOWN");
		assertThat(c.sourceTitles()).isEmpty();
	}

	@Test
	void dateAnchors_weekStartsMonday_monthsRollOverYear() {
		// Thứ 6 2/10/2026 — ca lỗi thật: model tự tính "tuần sau" ra 9/10–15/10.
		String friday = AssistantService.dateAnchors(LocalDate.of(2026, 10, 2));
		assertThat(friday).contains("hôm nay Thứ 6, 2/10/2026 = 2026-10-02")
				.contains("tuần này 2026-09-28 → 2026-10-04")
				.contains("tuần sau 2026-10-05 → 2026-10-11")
				.contains("tuần trước 2026-09-21 → 2026-09-27")
				.contains("tháng này 2026-10-01 → 2026-10-31");

		String sunday = AssistantService.dateAnchors(LocalDate.of(2026, 12, 6));
		assertThat(sunday).contains("Chủ nhật, 6/12/2026")
				.contains("tuần này 2026-11-30 → 2026-12-06")
				.contains("tháng sau 2027-01-01 → 2027-01-31");
	}
}

package com.fitness.assistant.service.tools;

import com.fitness.assistant.dto.ExerciseCardResponse;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

/**
 * Thu lại tên tool + kết quả JSON trong đúng một luồng xử lý — dùng cho 2 việc:
 * (1) NumberGuard soát số của câu trả lời B/C, không chỉ soát chunk RAG —
 * số do tool trả luôn đúng (đọc thẳng DB), nhưng LLM có thể thêm số KHÁC khi
 * diễn giải lại, đó là thứ NumberGuard phải bắt; (2) cột tools_called của
 * assistant_messages (§6, phục vụ eval §11).
 *
 * ThreadLocal, không @RequestScope: Tomcat xử lý một request trên một luồng,
 * nên ThreadLocal đủ cô lập giữa các câu hỏi đồng thời — và không cần proxy
 * scope, gọi trực tiếp được từ test mà không cần dựng request giả.
 * AssistantService PHẢI gọi {@link #clear()} ở finally — Tomcat tái dùng
 * luồng giữa các request, không dọn thì log của câu hỏi trước lẫn sang sau.
 *
 * Thẻ bài (design-thu-vien-bai-v1 §7): code thu các bài mà tool tra bài đã trả, model không tự viết thẻ.
 */
@Component
public class ToolCallLog {

	private final ThreadLocal<List<String>> toolNames = ThreadLocal.withInitial(ArrayList::new);
	private final ThreadLocal<List<String>> resultsAsText = ThreadLocal.withInitial(ArrayList::new);
	private final ThreadLocal<List<ExerciseCardResponse>> exerciseCards = ThreadLocal.withInitial(ArrayList::new);

	/** Nhiều bài hơn thế thì thẻ thành bức tường chữ trong khung chat. */
	public static final int MAX_EXERCISE_CARDS = 3;

	public void record(String toolName, Object result) {
		toolNames.get().add(toolName);
		resultsAsText.get().add(String.valueOf(result));
	}

	public void recordExerciseCards(List<ExerciseCardResponse> cards) {
		exerciseCards.get().addAll(cards);
	}

	/** Bỏ trùng theo slug (model có thể tra cùng bài hai lần), giữ thứ tự tool trả, tối đa {@link #MAX_EXERCISE_CARDS}. */
	public List<ExerciseCardResponse> exerciseCards() {
		Map<String, ExerciseCardResponse> bySlug = new LinkedHashMap<>();
		exerciseCards.get().forEach(card -> bySlug.putIfAbsent(card.slug(), card));
		return bySlug.values().stream().limit(MAX_EXERCISE_CARDS).toList();
	}

	public List<String> toolNames() {
		return List.copyOf(toolNames.get());
	}

	public String contextText() {
		return String.join("\n", resultsAsText.get());
	}

	public void clear() {
		toolNames.remove();
		resultsAsText.remove();
		exerciseCards.remove();
	}
}

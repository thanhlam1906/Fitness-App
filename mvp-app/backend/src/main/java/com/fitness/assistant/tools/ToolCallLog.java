package com.fitness.assistant.tools;

import java.util.ArrayList;
import java.util.List;
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
 */
@Component
public class ToolCallLog {

	private final ThreadLocal<List<String>> toolNames = ThreadLocal.withInitial(ArrayList::new);
	private final ThreadLocal<List<String>> resultsAsText = ThreadLocal.withInitial(ArrayList::new);

	public void record(String toolName, Object result) {
		toolNames.get().add(toolName);
		resultsAsText.get().add(String.valueOf(result));
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
	}
}

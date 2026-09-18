package com.fitness.assistant;

import com.fitness.assistant.retrieval.FtsRetriever;
import com.fitness.assistant.retrieval.HybridRetriever;
import com.fitness.assistant.tools.AssistantTools;
import com.fitness.assistant.tools.ToolCallLog;
import com.fitness.common.CurrentUser;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.stereotype.Service;

/**
 * Điều phối trợ lý — concept-chatbot-v1.md §4:
 * SafetyGate (nhóm D) → LLM + tool calling (nhóm B/C) + chunk hybrid FTS+vector
 * (nhóm A, §5.2) → sinh câu trả lời → NumberGuard → lưu assistant_messages.
 *
 * Không SSE ở Vòng 0: NumberGuard cần câu trả lời ĐẦY ĐỦ mới quyết được giữ
 * hay bỏ (§5.3, cùng triết lý "không tin thì bỏ cả câu" của
 * analyzer/advisor.py) — stream token thì phần đầu đã hiện ra trước khi guard
 * kịp chạy, vô hiệu hoá chính guard đó. Trả một lần, đơn giản hơn và đúng.
 */
@Service
public class AssistantService {

	// System prompt cố định đặt đầu — §10 lớp 2, gia cố cho SafetyGate (lớp 1),
	// không thay được lớp 1.
	private static final String SYSTEM_PROMPT = """
			Bạn là trợ lý tập luyện trong app, trả lời tiếng Việt, ngắn gọn, đi thẳng vào ý.

			Quy tắc bắt buộc, không được vi phạm:
			- Không chẩn đoán chấn thương/bệnh, không tư vấn liều thuốc hay thực phẩm chức năng,
			  không đánh giá form/kỹ thuật chỉ qua mô tả bằng chữ, không tư vấn cho thai kỳ hay bệnh nền.
			  Những câu hỏi này phải hướng người dùng tới chuyên gia y tế hoặc mục "Chấm form" (gửi clip).
			- Câu hỏi về lịch tập, tải, hay tiến bộ CỦA NGƯỜI DÙNG ĐANG HỎI: PHẢI gọi tool tương ứng để
			  lấy số liệu thật, không tự đoán hay suy luận số.
			- Câu hỏi kiến thức chung: CHỈ dùng thông tin trong phần "Tài liệu tham khảo" nếu được cung cấp.
			  Không có tài liệu liên quan thì nói rõ "không có trong tài liệu", không suy diễn. Tài liệu được
			  đưa vào KHÔNG có nghĩa là nó trả lời được câu hỏi — nếu đoạn trích không nói TRỰC TIẾP đến điều
			  đang hỏi (chỉ nhắc thoáng qua, hoặc là chủ đề gần chứ không phải câu trả lời), vẫn phải nói "không
			  có trong tài liệu". Không được lấp khoảng trống bằng kiến thức chung của bạn dù bạn biết đáp án.
			- Không tự thêm bất kỳ con số nào ngoài số có trong kết quả tool hoặc tài liệu tham khảo.
			- Trả lời bằng CHỮ THƯỜNG THUẦN, không dùng markdown (không **, không #, không gạch đầu dòng -) —
			  giao diện hiển thị nguyên văn, không render markdown.
			""";

	private static final String FALLBACK_UNGROUNDED =
			"Mình chưa đủ tự tin về số liệu ở câu trả lời này nên không đưa ra để tránh sai. "
			+ "Bạn hỏi lại cụ thể hơn được không?";

	private final ChatClient chatClient;
	private final SafetyGate safetyGate;
	private final HybridRetriever retriever;
	private final ToolCallLog toolCallLog;
	private final NumberGuard numberGuard;
	private final AssistantMessageRepository messages;
	private final CurrentUser currentUser;

	public AssistantService(
			ChatClient.Builder chatClientBuilder, SafetyGate safetyGate, HybridRetriever retriever,
			AssistantTools assistantTools, ToolCallLog toolCallLog, NumberGuard numberGuard,
			AssistantMessageRepository messages, CurrentUser currentUser) {
		this.chatClient = chatClientBuilder.defaultSystem(SYSTEM_PROMPT).defaultTools(assistantTools).build();
		this.safetyGate = safetyGate;
		this.retriever = retriever;
		this.toolCallLog = toolCallLog;
		this.numberGuard = numberGuard;
		this.messages = messages;
		this.currentUser = currentUser;
	}

	public record Answer(
			String text, boolean blocked, List<String> sourceTitles, List<String> toolsCalled, String guardResult) {
	}

	public Answer ask(UUID threadId, String question) {
		UUID userId = currentUser.id();
		messages.save(new AssistantMessage(userId, threadId, "USER", question));

		if (safetyGate.isBlocked(question)) {
			return persistAndReturn(userId, threadId, SafetyGate.REFUSAL_MESSAGE, true, "D_BLOCKED", List.of(),
					List.of(), "BLOCKED_D");
		}

		toolCallLog.clear();
		try {
			List<FtsRetriever.Chunk> chunks = retriever.search(question, 5);
			String knowledgeContext = chunks.stream()
					.map(c -> "[%s — %s]\n%s".formatted(c.documentTitle(), c.headingPath(), c.content()))
					.collect(Collectors.joining("\n\n"));

			// eval-v1 A08/A10/A12 (eval/report-v1.md): không chunk nào thì gửi thẳng
			// câu hỏi trần, model không có tín hiệu là ĐÃ tìm và không thấy gì — nó
			// im lặng dùng kiến thức nền của chính nó để trả lời (đúng nội dung
			// nhưng vi phạm §8: không trích được thì phải nói "không có", không
			// suy diễn). Phải nói RÕ trong chính message này, không dựa vào system
			// prompt chung chung — model nhỏ theo tín hiệu gần hơn tín hiệu xa.
			String userPrompt = knowledgeContext.isBlank()
					? question + "\n\n---\n(Đã tìm trong kho tài liệu nhưng KHÔNG có mục nào liên quan đến câu "
							+ "hỏi này. Nếu đây là câu hỏi kiến thức chung — không phải hỏi lịch/tải/tiến bộ của "
							+ "người dùng — bắt buộc trả lời đúng dạng \"Không có thông tin trong tài liệu về "
							+ "[chủ đề]\", KHÔNG dùng kiến thức có sẵn của bạn để tự trả lời, kể cả khi bạn biết "
							+ "đáp án.)"
					: question + "\n\n---\nTài liệu tham khảo (chỉ dùng đúng nội dung này, trích nguồn nếu trả lời "
							+ "dựa vào đây):\n" + knowledgeContext;

			String answer = chatClient.prompt().user(userPrompt).call().content();
			if (answer == null) {
				answer = "";
			}

			// Số hợp lệ đến từ 3 nguồn: chunk RAG, kết quả tool (đã đúng vì đọc thẳng DB),
			// và số chính người dùng gõ ra (vd "4 tuần" phản chiếu lại trong câu trả lời).
			String groundingContext = knowledgeContext + "\n" + toolCallLog.contextText() + "\n" + question;
			boolean grounded = numberGuard.isGrounded(answer, groundingContext);

			List<String> toolsCalled = toolCallLog.toolNames();
			List<String> sourceTitles = chunks.stream().map(FtsRetriever.Chunk::documentTitle).distinct().toList();
			String intent = !toolsCalled.isEmpty() ? "B" : !chunks.isEmpty() ? "A" : "UNKNOWN";

			if (!grounded) {
				return persistAndReturn(userId, threadId, FALLBACK_UNGROUNDED, false, intent, sourceTitles,
						toolsCalled, "NUMBERS_UNGROUNDED");
			}
			return persistAndReturn(userId, threadId, answer, false, intent, sourceTitles, toolsCalled, "OK");
		} finally {
			toolCallLog.clear();
		}
	}

	private Answer persistAndReturn(
			UUID userId, UUID threadId, String text, boolean blocked, String intent, List<String> sourceTitles,
			List<String> toolsCalled, String guardResult) {
		AssistantMessage assistantMessage = new AssistantMessage(userId, threadId, "ASSISTANT", text);
		assistantMessage.tagAssistantMetadata(intent, null, toolsCalled.toArray(String[]::new), guardResult);
		messages.save(assistantMessage);
		return new Answer(text, blocked, sourceTitles, toolsCalled, guardResult);
	}
}

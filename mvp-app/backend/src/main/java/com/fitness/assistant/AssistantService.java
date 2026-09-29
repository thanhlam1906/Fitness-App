package com.fitness.assistant;

import com.fitness.assistant.retrieval.FtsRetriever;
import com.fitness.assistant.retrieval.HybridRetriever;
import com.fitness.assistant.tools.AssistantTools;
import com.fitness.assistant.tools.ToolCallLog;
import com.fitness.common.CurrentUser;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
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
			Classification classification = classify(answer, toolsCalled, chunks);

			if (!grounded) {
				// Câu dự phòng không dựa vào tài liệu nào (thay hẳn câu trả lời của model) — kèm
				// "Nguồn" ở đây cũng là bịa nguồn, dù intent vẫn ghi log đúng là A.
				return persistAndReturn(userId, threadId, FALLBACK_UNGROUNDED, false, classification.intent(),
						List.of(), toolsCalled, "NUMBERS_UNGROUNDED");
			}
			return persistAndReturn(userId, threadId, answer, false, classification.intent(),
					classification.sourceTitles(), toolsCalled, "OK");
		} finally {
			toolCallLog.clear();
		}
	}

	record Classification(String intent, List<String> sourceTitles) {
	}

	private static final Pattern TOKEN = Pattern.compile("[\\p{L}\\p{N}]+");
	// Tiếng Việt: mỗi âm tiết là một token rời (không ghép từ như tiếng Anh), nên đếm SỐ TỪ RỜI
	// trùng giữa câu trả lời và chunk gần như vô dụng — đo trên 94 chunk thật của corpus
	// (content/corpus/*.md) và 44 câu trả lời eval thật (eval/report-v3-hybrid.md, review vòng 2):
	// câu trả lời thuần tool ("Trong 4 tuần qua, bạn chưa bắt đầu buổi tập nào...") trùng ngưỡng 3
	// từ rời với 28–47/94 chunk chỉ vì âm tiết phổ biến trong domain (buổi, tuần, khối, lượng, kg…)
	// không nằm trong STOPWORDS (STOPWORDS lọc cho CÂU HỎI, không lọc được từ vựng câu trả lời).
	// Trích dẫn thật luôn CHÉP NGUYÊN một cụm liên tiếp từ chunk; trùng ngẫu nhiên thì không — nên
	// so cụm SHINGLE âm tiết liền nhau (giữ cả hư từ, vì thứ tự mới là tín hiệu phân biệt).
	// ponytail: SHINGLE=4, MIN_SHARED_SHINGLES=2 đo trên cùng bộ 44 câu ở trên — không sai dương
	// tính ở mọi câu B/UNKNOWN/từ chối, không sót câu A nào trích thật. Tinh khi có eval lớn hơn.
	private static final int SHINGLE = 4;
	private static final int MIN_SHARED_SHINGLES = 2;

	/**
	 * intent chỉ để ghi log (đã có gọi tool hay không, có chunk hay không). sourceTitles quyết theo
	 * một tín hiệu khác, không phụ thuộc intent: chunk có được trích trong CÂU TRẢ LỜI hay không.
	 *
	 * Trước đây gắn sourceTitles thẳng theo chunk retriever tìm được (thấy nếu không gọi tool),
	 * dẫn tới hai lỗi ngược nhau: (1) câu trả lời hoàn toàn bằng tool nhưng retriever tình cờ tìm
	 * ra chunk gần nghĩa vẫn hiện "Nguồn" — bịa nguồn; (2) câu trả lời NỬA bằng tool NỬA bằng tài
	 * liệu (hỏi lịch kèm hỏi kiến thức) thì mất hẳn nguồn vì có gọi tool. Xem chunk có được CHÉP
	 * LẠI trong câu trả lời hay không (so cụm âm tiết liền nhau) sửa đúng cả hai, bất kể có tool.
	 *
	 * Package-private để test thuần, không cần Spring/DB.
	 */
	static Classification classify(String answer, List<String> toolsCalled, List<FtsRetriever.Chunk> chunks) {
		String intent = !toolsCalled.isEmpty() ? "B" : !chunks.isEmpty() ? "A" : "UNKNOWN";
		Set<String> answerShingles = shingles(answer);
		List<String> sourceTitles = chunks.stream()
				.filter(c -> isCited(answerShingles, c))
				.map(FtsRetriever.Chunk::documentTitle)
				.distinct()
				.toList();
		return new Classification(intent, sourceTitles);
	}

	private static boolean isCited(Set<String> answerShingles, FtsRetriever.Chunk chunk) {
		Set<String> chunkShingles = shingles(chunk.content());
		return answerShingles.stream().filter(chunkShingles::contains).count() >= MIN_SHARED_SHINGLES;
	}

	private static Set<String> shingles(String text) {
		List<String> words = TOKEN.matcher(text.toLowerCase()).results().map(m -> m.group()).toList();
		if (words.size() < SHINGLE) {
			return Set.of(); // câu ngắn hơn một cụm: không đủ để so, coi như không trích gì
		}
		return IntStream.rangeClosed(0, words.size() - SHINGLE)
				.mapToObj(i -> String.join(" ", words.subList(i, i + SHINGLE)))
				.collect(Collectors.toSet());
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

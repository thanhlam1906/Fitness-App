package com.fitness.assistant;

import java.text.Normalizer;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Nhóm D — chặn cứng, concept-chatbot-v1.md §10. Chạy TRƯỚC mọi lời gọi LLM,
 * không tốn token. Danh sách từ khoá bắt nhầm đôi khi — chấp nhận được, vì
 * hướng chặn nhầm là hướng an toàn (§4).
 *
 * "Lớp 1 là lớp duy nhất thật sự chặn." System prompt chỉ là gia cố, không
 * thay được lớp này.
 */
@Component
public class SafetyGate {

	// ponytail: danh sách cứng, không phải NLP phân loại ý định — đúng chủ đích
	// của §4 ("không dựa vào việc model tự biết điều"). Mở rộng khi review thực tế
	// (C2 — PM có tham vấn pháp lý) chỉ ra cụm còn lọt.
	private static final List<Pattern> BLOCKED = List.of(
			// chẩn đoán / triệu chứng bệnh lý
			pattern("bi (gi|sao|benh|chan thuong) (o|khi|luc|ma)?"),
			pattern("(dau|nhuc) .*(dau goi|vai|lung|co|khop|got|cang chan)"),
			pattern("chan thuong .*(gi|the nao|ra sao)"),
			// thuốc / TPCN — liều lượng
			pattern("(uong|dung|lieu) .*(thuoc|tpcn|thuc pham chuc nang|steroid|whey|creatine|bcaa)"),
			// thai kỳ / bệnh nền / rối loạn ăn uống
			pattern("(mang thai|thai ky|dang bau)"),
			pattern("(tieu duong|huyet ap|tim mach|roi loan an uong|biếng ăn|an vo do)"),
			// đánh giá form bằng chữ — mâu thuẫn TN2, đánh giá form bắt buộc qua video
			pattern("(minh|toi) (squat|deadlift|bench|tap) .*(sai|dung) (o dau|cho nao|the nao)"),
			pattern("xem (ho|giup) .*(form|tu the) .*(dung|sai|the nao)"),
			// mức calo mục tiêu thấp bất thường — Đợt 9, giữ chỗ
			pattern("an duoi \\d{3,4} ?(cal|calo|kcal)"));

	public boolean isBlocked(String question) {
		String normalized = fold(question);
		return BLOCKED.stream().anyMatch(p -> p.matcher(normalized).find());
	}

	/**
	 * Câu trả lời mặc định — hướng tới chuyên gia, không phải "tôi không thể trả lời"
	 * cụt lủn (§10, lớp 3).
	 */
	public static final String REFUSAL_MESSAGE =
			"Mình không đủ thẩm quyền để trả lời câu này — nó liên quan đến chẩn đoán, thuốc/TPCN, "
			+ "hoặc đánh giá form chỉ qua mô tả bằng chữ. Bạn nên hỏi bác sĩ hoặc huấn luyện viên trực tiếp. "
			+ "Nếu muốn kiểm tra kỹ thuật, hãy gửi clip qua mục Chấm form.";

	private static Pattern pattern(String regexOnFoldedText) {
		return Pattern.compile(regexOnFoldedText);
	}

	/** Bỏ dấu + thường hoá, khớp cách immutable_unaccent xử lý phía Postgres. */
	static String fold(String s) {
		String n = Normalizer.normalize(s.toLowerCase(), Normalizer.Form.NFD);
		return n.replaceAll("\\p{M}", "").replace("đ", "d");
	}
}

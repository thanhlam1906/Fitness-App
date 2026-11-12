package com.fitness.assistant.service;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/**
 * Hậu kiểm: mọi số trong câu trả lời phải có mặt trong context đã gửi cho
 * LLM. Không đạt → bỏ CẢ câu, không sửa từng số — port thẳng nguyên tắc từ
 * {@code analyzer/src/analyzer/advisor.py:numbers_are_grounded} (N3: KHÔNG
 * con số nào đi ra từ LLM mà không kiểm được).
 *
 * "Sửa từng số là bắt đầu tin một phần vào output của LLM." — advisor.py.
 * Nguyên văn giữ lại ở đây, không viết lại.
 */
@Component
public class NumberGuard {

	private static final Pattern NUMBER = Pattern.compile("\\d+(?:[.,]\\d+)?");

	public boolean isGrounded(String answer, String context) {
		return extractNumbers(context).containsAll(extractNumbers(answer));
	}

	private static Set<String> extractNumbers(String text) {
		Set<String> numbers = new java.util.HashSet<>();
		Matcher m = NUMBER.matcher(text == null ? "" : text);
		while (m.find()) {
			// "2026-10-05" tách ra "05", người đọc viết "5/10": cùng một số, so như nhau.
			// Tool trả BigDecimal "42.50", người Việt viết "42,5": cũng cùng một số (NF14 staging 11-10).
			String number = m.group().replaceFirst("^0+(?=\\d)", "");
			// Chỉ 1-2 chữ số sau dấu mới chắc là thập phân ("42,5", "42.50" như cột tải scale 2). Nhóm 3 chữ số
			// có thể là phân cách nghìn ("2.000 kcal"): đổi thì thành "2" và khớp nhầm ngày, số hiệp.
			if (number.matches("\\d+[.,]\\d{1,2}")) {
				number = number.replace(',', '.').replaceFirst("\\.?0+$", "");
			}
			numbers.add(number);
		}
		return numbers;
	}
}

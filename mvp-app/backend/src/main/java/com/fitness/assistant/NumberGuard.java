package com.fitness.assistant;

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
			numbers.add(m.group());
		}
		return numbers;
	}
}

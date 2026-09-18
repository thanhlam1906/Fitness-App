package com.fitness.assistant;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class NumberGuardTest {

	private final NumberGuard guard = new NumberGuard();

	@Test
	void grounded_whenEveryNumberInAnswerAppearsInContext() {
		String context = "RPE 8 nghĩa là còn 2 rep nữa. Tải tăng 2.5kg từ tuần trước.";
		String answer = "Bạn đang ở RPE 8, còn khoảng 2 rep là thất bại. Tải tuần này tăng 2.5kg.";

		assertThat(guard.isGrounded(answer, context)).isTrue();
	}

	@Test
	void notGrounded_whenAnswerInventsANumberNotInContext() {
		String context = "RPE 8 nghĩa là còn 2 rep nữa.";
		String answer = "RPE 8 nghĩa là bạn đã hoàn thành 95% khả năng."; // 95 không có trong context

		assertThat(guard.isGrounded(answer, context)).isFalse();
	}

	@Test
	void notGrounded_whenAnswerHasNumbersButContextIsEmpty() {
		assertThat(guard.isGrounded("Bạn nên tăng 5kg mỗi tuần.", "")).isFalse();
	}

	@Test
	void grounded_whenAnswerHasNoNumbers() {
		assertThat(guard.isGrounded("Giữ lưng thẳng khi đứng lên.", "")).isTrue();
	}
}

package com.fitness.assistant.service;

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

	@Test
	void leadingZerosIgnored_isoDateGroundsDayWrittenWithoutZero() {
		assertThat(guard.isGrounded("Chương trình kết thúc ngày 9/11/2026.", "programEnd=2026-11-09")).isTrue();
		assertThat(guard.isGrounded("Nghỉ 0.5 phút.", "nghỉ 5 phút")).isFalse(); // 0.5 không thành 5
	}

	/** Kết quả tool là BigDecimal "42.50", người Việt viết "42,5": cùng một giá trị, so như nhau. */
	@Test
	void decimalWrittenVietnameseStyle_groundedByBigDecimalFromTool() {
		String toolResult = "deltaKg=2.50, loadBeforeKg=40.00, loadNowKg=42.50";
		assertThat(guard.isGrounded("Tăng 2,5 kg, từ 40 kg lên 42,5 kg.", toolResult)).isTrue();
		assertThat(guard.isGrounded("Tăng 2.5 kg lên 42.5kg.", toolResult)).isTrue();
	}

	@Test
	void decimalNormalizing_doesNotMakeDifferentValuesEqual() {
		String toolResult = "loadNowKg=42.50";
		assertThat(guard.isGrounded("Mức tạ là 47,5 kg.", toolResult)).isFalse();
		assertThat(guard.isGrounded("Mức tạ là 4,25 kg.", toolResult)).isFalse();
		assertThat(guard.isGrounded("Mức tạ là 425 kg.", toolResult)).isFalse();
		assertThat(guard.isGrounded("Mức tạ là 42 kg.", toolResult)).isFalse();
		assertThat(guard.isGrounded("Làm 10 rep.", "1.0")).isFalse(); // bỏ số 0 sau dấu thập phân, không bỏ số 0 của số nguyên
		// Dấu chấm phân cách nghìn kiểu Việt không phải dấu thập phân.
		assertThat(guard.isGrounded("Bạn cần 2.000 kcal.", "ngày 2026-11-02, 2 hiệp")).isFalse();
		assertThat(guard.isGrounded("Đốt 2.500 kcal.", "deltaKg=2.50")).isFalse();
		assertThat(guard.isGrounded("Làm 10 rep.", "đi 10.000 bước")).isFalse();
	}
}

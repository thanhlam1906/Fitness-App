package com.fitness.program.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Ưu tiên 2. Ngưỡng 70% là số khởi điểm tự chốt (ke-hoach-chi-tiet-chuc-nang
 * §9 giao cho HLV+PM, nay không còn HLV ngoài) — chỉnh khi có dữ liệu thật
 * từ tester.
 */
public class CompletionRateRule implements ProgressionRule {

	// ponytail: ngưỡng tạm, chưa hiệu chỉnh trên dữ liệu người dùng thật.
	private static final double MIN_COMPLETION_RATE = 0.70;

	@Override
	public Optional<LoadDecisionResult> evaluate(ProgressionSignal signal) {
		if (signal.completionRate() >= MIN_COMPLETION_RATE) {
			return Optional.empty();
		}
		return Optional.of(new LoadDecisionResult(
				Direction.HOLD, null, "LOW_COMPLETION_RATE",
				Map.of("completion_rate", signal.completionRate(), "threshold", MIN_COMPLETION_RATE),
				"Tỉ lệ hoàn thành buổi tập tuần trước thấp → giữ nguyên tải"));
	}
}

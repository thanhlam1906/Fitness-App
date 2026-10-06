package com.fitness.program.service.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Ưu tiên 2. Ngưỡng mặc định 70% là số khởi điểm tự chốt (ke-hoach-chi-tiet-chuc-nang
 * §9 giao cho HLV+PM, nay không còn HLV ngoài) — admin chỉnh theo template.
 */
public class CompletionRateRule implements ProgressionRule {

	// Mặc định 70% là số khởi điểm tự chốt, chưa hiệu chỉnh trên dữ liệu thật; admin chỉnh theo template.
	private final double minCompletionRate;

	public CompletionRateRule() {
		this(ProgressionConfig.DEFAULT.minCompletionPct() / 100.0);
	}

	public CompletionRateRule(double minCompletionRate) {
		this.minCompletionRate = minCompletionRate;
	}

	@Override
	public Optional<LoadDecisionResult> evaluate(ProgressionSignal signal) {
		if (signal.completionRate() >= minCompletionRate) {
			return Optional.empty();
		}
		return Optional.of(new LoadDecisionResult(
				Direction.HOLD, null, "LOW_COMPLETION_RATE",
				Map.of("completion_rate", signal.completionRate(), "threshold", minCompletionRate),
				"Tỉ lệ hoàn thành buổi tập tuần trước thấp → giữ nguyên tải"));
	}
}

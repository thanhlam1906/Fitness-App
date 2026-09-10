package com.fitness.program.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Ưu tiên 3 — kế hoạch chức năng §5.4: "RPE thấp hơn target 2 buổi liên tiếp
 * → tăng thêm 1 bước ngoài double progression; RPE cao hơn target +1 → giữ tải".
 * rpeBelowTargetStreak null (thiếu RPE) → không chạy rule này, rơi xuống
 * DoubleProgressionRule.
 */
public class RpeRule implements ProgressionRule {

	private static final int STREAK_THRESHOLD = 2;

	@Override
	public Optional<LoadDecisionResult> evaluate(ProgressionSignal signal) {
		if (signal.rpeBelowTargetStreak() != null && signal.rpeBelowTargetStreak() >= STREAK_THRESHOLD) {
			return Optional.of(new LoadDecisionResult(
					Direction.UP, signal.incrementKg(), "RPE_BELOW_TARGET_STREAK",
					Map.of("streak", signal.rpeBelowTargetStreak()),
					"RPE thấp hơn mục tiêu 2 buổi liên tiếp → tăng thêm tải"));
		}
		if (signal.rpeAboveTargetPlusOne()) {
			return Optional.of(new LoadDecisionResult(
					Direction.HOLD, null, "RPE_ABOVE_TARGET",
					Map.of(), "RPE cao hơn mục tiêu → giữ nguyên tải"));
		}
		return Optional.empty();
	}
}

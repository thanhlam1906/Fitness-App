package com.fitness.program.service.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Ưu tiên 3 — kế hoạch chức năng §5.4: "RPE thấp hơn target 2 buổi liên tiếp
 * → tăng thêm 1 bước ngoài double progression; RPE cao hơn target +1 → giữ tải".
 * rpeBelowTargetStreak null (thiếu RPE) → không chạy rule này, rơi xuống
 * DoubleProgressionRule.
 */
public class RpeRule implements ProgressionRule {

	private final int streakThreshold;
	// targetRpe và rpeOver chỉ để ghi vào ruleParams: cả hai quyết định đều phụ thuộc số của template, nên
	// dòng load_decisions phải giải thích được kể cả khi admin sửa template sau đó.
	private final double targetRpe;
	private final double rpeOver;

	public RpeRule() {
		this(ProgressionConfig.DEFAULT.rpeLowStreak(), ProgressionConfig.DEFAULT.targetRpe(),
				ProgressionConfig.DEFAULT.rpeOver());
	}

	public RpeRule(int streakThreshold, double targetRpe, double rpeOver) {
		this.streakThreshold = streakThreshold;
		this.targetRpe = targetRpe;
		this.rpeOver = rpeOver;
	}

	@Override
	public Optional<LoadDecisionResult> evaluate(ProgressionSignal signal) {
		if (signal.rpeBelowTargetStreak() != null && signal.rpeBelowTargetStreak() >= streakThreshold) {
			return Optional.of(new LoadDecisionResult(
					Direction.UP, signal.incrementKg(), "RPE_BELOW_TARGET_STREAK",
					Map.of("streak", signal.rpeBelowTargetStreak(), "threshold", streakThreshold,
						"target_rpe", targetRpe),
					"RPE thấp hơn mục tiêu " + streakThreshold + " buổi liên tiếp → tăng thêm tải"));
		}
		// "Vượt mục tiêu bao nhiêu" (rpe_over) đã được tính sẵn vào cờ này lúc gộp signal.
		if (signal.rpeAboveTargetPlusOne()) {
			return Optional.of(new LoadDecisionResult(
					Direction.HOLD, null, "RPE_ABOVE_TARGET",
					Map.of("target_rpe", targetRpe, "rpe_over", rpeOver), "RPE cao hơn mục tiêu → giữ nguyên tải"));
		}
		return Optional.empty();
	}
}

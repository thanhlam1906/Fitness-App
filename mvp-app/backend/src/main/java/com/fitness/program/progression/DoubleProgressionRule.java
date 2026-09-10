package com.fitness.program.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Rule CUỐI — luôn trả quyết định, không bao giờ rỗng. kế hoạch chức năng
 * §5.4: "Double progression, mọi set đủ rep → tăng tải theo bước chuẩn" và
 * "≥2 set trượt rep mục tiêu → không tăng tải; lặp 2 tuần → giảm 1 bước".
 */
public class DoubleProgressionRule implements ProgressionRule {

	private static final int MISSED_SETS_FOR_DELOAD_ELIGIBLE = 2;
	private static final int STREAK_FOR_DELOAD = 2;
	private static final double ROUND_STEP_KG = 2.5;

	@Override
	public Optional<LoadDecisionResult> evaluate(ProgressionSignal signal) {
		if (signal.setsMetTarget() == signal.setsTotal()) {
			return Optional.of(new LoadDecisionResult(
					Direction.UP, signal.incrementKg(), "DOUBLE_PROGRESSION_ALL_REPS_MET",
					Map.of("sets_met", signal.setsMetTarget(), "sets_total", signal.setsTotal(),
							"increment", signal.incrementKg()),
					"Đủ rep mọi set tuần trước → tăng tải"));
		}

		int missed = signal.setsTotal() - signal.setsMetTarget();
		boolean eligibleForDeload = missed >= MISSED_SETS_FOR_DELOAD_ELIGIBLE
				&& signal.consecutiveFailStreak() >= STREAK_FOR_DELOAD;

		if (eligibleForDeload) {
			double delta = LoadRounding.deloadDelta(signal.currentLoadKg(), signal.deloadPct(), ROUND_STEP_KG);
			return Optional.of(new LoadDecisionResult(
					Direction.DOWN, delta, "REPEATED_REP_FAILURE",
					Map.of("missed_sets", missed, "consecutive_weeks", signal.consecutiveFailStreak()),
					"Trượt rep mục tiêu nhiều tuần liên tiếp → giảm tải"));
		}

		return Optional.of(new LoadDecisionResult(
				Direction.HOLD, null, "SETS_MISSED_TARGET",
				Map.of("sets_met", signal.setsMetTarget(), "sets_total", signal.setsTotal()),
				"Chưa đủ rep mọi set tuần trước → giữ nguyên tải"));
	}
}

package com.fitness.program.service.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Rule CUỐI — luôn trả quyết định, không bao giờ rỗng. kế hoạch chức năng
 * §5.4: "Double progression, mọi set đủ rep → tăng tải theo bước chuẩn" và
 * "≥2 set trượt rep mục tiêu → không tăng tải; lặp 2 tuần → giảm 1 bước".
 */
public class DoubleProgressionRule implements ProgressionRule {

	private final int missedSetsForDeload;
	private final int streakForDeload;

	public DoubleProgressionRule() {
		this(ProgressionConfig.DEFAULT.missedSetsToDeload(), ProgressionConfig.DEFAULT.failStreakToDeload());
	}

	public DoubleProgressionRule(int missedSetsForDeload, int streakForDeload) {
		this.missedSetsForDeload = missedSetsForDeload;
		this.streakForDeload = streakForDeload;
	}

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
		boolean eligibleForDeload = missed >= missedSetsForDeload
				&& signal.consecutiveFailStreak() >= streakForDeload;

		if (eligibleForDeload) {
			double delta = LoadRounding.deloadDelta(signal.currentLoadKg(), signal.deloadPct(), signal.incrementKg());
			return Optional.of(new LoadDecisionResult(
					Direction.DOWN, delta, "REPEATED_REP_FAILURE",
					Map.of("missed_sets", missed, "consecutive_weeks", signal.consecutiveFailStreak(),
							"missed_sets_threshold", missedSetsForDeload, "streak_threshold", streakForDeload),
					"Trượt rep mục tiêu nhiều tuần liên tiếp → giảm tải"));
		}

		return Optional.of(new LoadDecisionResult(
				Direction.HOLD, null, "SETS_MISSED_TARGET",
				Map.of("sets_met", signal.setsMetTarget(), "sets_total", signal.setsTotal(),
						"missed_sets_threshold", missedSetsForDeload, "streak_threshold", streakForDeload),
				"Chưa đủ rep mọi set tuần trước → giữ nguyên tải"));
	}
}

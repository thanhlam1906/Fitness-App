package com.fitness.program.progression;

import java.util.Map;
import java.util.Optional;

/**
 * Ưu tiên cao nhất — kế hoạch chức năng §5.4: "Báo đau → Luôn giảm tải hoặc
 * thay bài tuần kế; đau lặp lại tuần 2 → thay bài tương đương".
 */
public class PainRule implements ProgressionRule {

	private static final double ROUND_STEP_KG = 2.5;

	@Override
	public Optional<LoadDecisionResult> evaluate(ProgressionSignal signal) {
		if (!signal.painReported()) {
			return Optional.empty();
		}
		if (signal.painRepeatedFromLastWeek()) {
			return Optional.of(new LoadDecisionResult(
					Direction.SUBSTITUTE, null, "PAIN_REPEATED",
					Map.of(), "Báo đau lặp lại tuần thứ hai → đề xuất bài thay thế"));
		}
		double delta = LoadRounding.deloadDelta(signal.currentLoadKg(), signal.deloadPct(), ROUND_STEP_KG);
		return Optional.of(new LoadDecisionResult(
				Direction.DOWN, delta, "PAIN_REPORTED",
				Map.of("deload_pct", signal.deloadPct(), "from_kg", signal.currentLoadKg()),
				"Có báo đau tuần trước → giảm tải"));
	}
}

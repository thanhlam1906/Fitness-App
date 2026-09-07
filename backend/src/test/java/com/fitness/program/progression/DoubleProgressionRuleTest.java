package com.fitness.program.progression;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class DoubleProgressionRuleTest {

	private final DoubleProgressionRule rule = new DoubleProgressionRule();

	private static ProgressionSignal signal(int setsMet, int setsTotal, int failStreak) {
		return new ProgressionSignal(false, false, 1.0, null, false, setsMet, setsTotal, failStreak, 60.0, 2.5, 10.0);
	}

	@Test
	void neverEmpty_isTheFallbackRule() {
		// rule cuối cùng, luôn phải trả quyết định — engine dựa vào bất biến này
		assertThat(rule.evaluate(signal(5, 5, 0))).isPresent();
		assertThat(rule.evaluate(signal(0, 5, 0))).isPresent();
	}

	@Test
	void allSetsMetTarget_increasesLoadByStandardIncrement() {
		LoadDecisionResult r = rule.evaluate(signal(5, 5, 0)).orElseThrow();

		assertThat(r.direction()).isEqualTo(Direction.UP);
		assertThat(r.deltaKg()).isEqualTo(2.5);
		assertThat(r.ruleId()).isEqualTo("DOUBLE_PROGRESSION_ALL_REPS_MET");
	}

	@Test
	void oneSetMissed_noFailStreak_holdsLoad_notDown() {
		LoadDecisionResult r = rule.evaluate(signal(4, 5, 0)).orElseThrow();

		assertThat(r.direction()).isEqualTo(Direction.HOLD);
	}

	@Test
	void twoOrMoreSetsMissed_firstOccurrence_holdsLoad_noDeloadYet() {
		// ≥2 set trượt lần đầu (streak<2) → chỉ giữ tải, chưa giảm
		LoadDecisionResult r = rule.evaluate(signal(3, 5, 1)).orElseThrow();

		assertThat(r.direction()).isEqualTo(Direction.HOLD);
		assertThat(r.ruleId()).isEqualTo("SETS_MISSED_TARGET");
	}

	@Test
	void twoOrMoreSetsMissed_repeatedTwoWeeksRunning_deloadsByPct() {
		LoadDecisionResult r = rule.evaluate(signal(3, 5, 2)).orElseThrow();

		assertThat(r.direction()).isEqualTo(Direction.DOWN);
		assertThat(r.deltaKg()).isEqualTo(-7.5);   // 60 * 0.9 = 54 → làm tròn xuống 2.5 = 52.5
		assertThat(r.ruleId()).isEqualTo("REPEATED_REP_FAILURE");
	}
}

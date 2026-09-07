package com.fitness.program.progression;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class RpeRuleTest {

	private final RpeRule rule = new RpeRule();

	private static ProgressionSignal signal(Integer belowStreak, boolean abovePlusOne) {
		return new ProgressionSignal(false, false, 1.0, belowStreak, abovePlusOne, 5, 5, 0, 60.0, 2.5, 10.0);
	}

	@Test
	void doesNotFire_whenNoRpeData() {
		// kế hoạch chức năng §5.3: thiếu RPE → chỉ chạy double progression
		assertThat(rule.evaluate(signal(null, false))).isEmpty();
	}

	@Test
	void doesNotFire_whenBelowTargetOnlyOneSession() {
		assertThat(rule.evaluate(signal(1, false))).isEmpty();
	}

	@Test
	void fires_whenRpeBelowTargetTwoSessionsInARow_increasesLoadOneExtraStep() {
		Optional<LoadDecisionResult> result = rule.evaluate(signal(2, false));

		assertThat(result).isPresent();
		LoadDecisionResult r = result.get();
		assertThat(r.direction()).isEqualTo(Direction.UP);
		assertThat(r.deltaKg()).isEqualTo(2.5);
		assertThat(r.ruleId()).isEqualTo("RPE_BELOW_TARGET_STREAK");
	}

	@Test
	void fires_whenRpeAboveTargetPlusOne_holdsLoad() {
		Optional<LoadDecisionResult> result = rule.evaluate(signal(null, true));

		assertThat(result).isPresent();
		LoadDecisionResult r = result.get();
		assertThat(r.direction()).isEqualTo(Direction.HOLD);
		assertThat(r.ruleId()).isEqualTo("RPE_ABOVE_TARGET");
	}
}

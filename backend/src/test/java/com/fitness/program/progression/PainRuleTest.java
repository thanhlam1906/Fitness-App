package com.fitness.program.progression;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class PainRuleTest {

	private final PainRule rule = new PainRule();

	private static ProgressionSignal signal(boolean pain, boolean repeated) {
		return new ProgressionSignal(pain, repeated, 1.0, null, false, 5, 5, 0, 60.0, 2.5, 10.0);
	}

	@Test
	void doesNotFire_whenNoPainReported() {
		Optional<LoadDecisionResult> result = rule.evaluate(signal(false, false));
		assertThat(result).isEmpty();
	}

	@Test
	void painReported_notRepeated_reducesLoadByDeloadPct_roundedDownTo2point5() {
		// 60.0 * (1 - 10%) = 54.0 → làm tròn xuống bội 2.5 = 52.5 → delta = -7.5
		Optional<LoadDecisionResult> result = rule.evaluate(signal(true, false));

		assertThat(result).isPresent();
		LoadDecisionResult r = result.get();
		assertThat(r.direction()).isEqualTo(Direction.DOWN);
		assertThat(r.deltaKg()).isEqualTo(-7.5);
		assertThat(r.ruleId()).isEqualTo("PAIN_REPORTED");
	}

	@Test
	void painRepeatedFromLastWeek_substitutesExerciseInstead() {
		Optional<LoadDecisionResult> result = rule.evaluate(signal(true, true));

		assertThat(result).isPresent();
		LoadDecisionResult r = result.get();
		assertThat(r.direction()).isEqualTo(Direction.SUBSTITUTE);
		assertThat(r.deltaKg()).isNull();
		assertThat(r.ruleId()).isEqualTo("PAIN_REPEATED");
	}
}

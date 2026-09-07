package com.fitness.program.progression;

import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

class CompletionRateRuleTest {

	private final CompletionRateRule rule = new CompletionRateRule();

	private static ProgressionSignal signalWithCompletion(double rate) {
		return new ProgressionSignal(false, false, rate, null, false, 5, 5, 0, 60.0, 2.5, 10.0);
	}

	@Test
	void fires_whenCompletionRateBelow70Percent() {
		Optional<LoadDecisionResult> result = rule.evaluate(signalWithCompletion(0.5));

		assertThat(result).isPresent();
		LoadDecisionResult r = result.get();
		assertThat(r.direction()).isEqualTo(Direction.HOLD);
		assertThat(r.deltaKg()).isNull();
		assertThat(r.ruleId()).isEqualTo("LOW_COMPLETION_RATE");
	}

	@Test
	void doesNotFire_whenCompletionRateAtOrAboveThreshold() {
		assertThat(rule.evaluate(signalWithCompletion(0.70))).isEmpty();
		assertThat(rule.evaluate(signalWithCompletion(0.8))).isEmpty();
	}

	@Test
	void fires_justBelowThreshold() {
		assertThat(rule.evaluate(signalWithCompletion(0.69))).isPresent();
	}
}

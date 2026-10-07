package com.fitness.program.service.progression;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Optional;
import org.junit.jupiter.api.Test;

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

	@Test
	void nguongTuTemplate_3BuoiMoiTang() {
		RpeRule custom = new RpeRule(3, 7.0, 1.5);
		assertThat(custom.evaluate(signal(2, false))).isEmpty();
		LoadDecisionResult r = custom.evaluate(signal(3, false)).orElseThrow();
		assertThat(r.ruleParams()).containsEntry("threshold", 3);
		assertThat(r.messageVi()).contains("3 buổi");
		// Mục tiêu RPE của template cũng phải nằm trong lý do, để giải thích được sau khi admin sửa template.
		assertThat(r.ruleParams()).containsEntry("streak", 3).containsEntry("target_rpe", 7.0);
	}

	@Test
	void rpeCaoHonMucTieu_luuNguongCuaTemplate() {
		RpeRule custom = new RpeRule(3, 7.0, 1.5);
		LoadDecisionResult r = custom.evaluate(signal(null, true)).orElseThrow();
		assertThat(r.ruleParams()).containsEntry("target_rpe", 7.0).containsEntry("rpe_over", 1.5);
	}
}

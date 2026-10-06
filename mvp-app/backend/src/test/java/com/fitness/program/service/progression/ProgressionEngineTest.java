package com.fitness.program.service.progression;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

/**
 * Kiểm tra THỨ TỰ ưu tiên — rule đầu tiên khớp thắng và dừng, không cộng dồn.
 * ke-hoach-chi-tiet-chuc-nang-v1.md §5.4: Báo đau > Tỉ lệ hoàn thành > RPE > Set trượt rep.
 */
class ProgressionEngineTest {

	private final ProgressionEngine engine = new ProgressionEngine();

	@Test
	void painTakesPriorityOverEverythingElse() {
		// đau tuần này VÀ set cũng trượt VÀ completion rate thấp — đau vẫn thắng
		ProgressionSignal signal = new ProgressionSignal(
				true, false, 0.3, null, false, 1, 5, 3, 60.0, 2.5, 10.0);

		LoadDecisionResult result = engine.decide(signal);

		assertThat(result.ruleId()).isEqualTo("PAIN_REPORTED");
		assertThat(result.direction()).isEqualTo(Direction.DOWN);
	}

	@Test
	void completionRateCheckedBeforeRpe() {
		// completion rate thấp VÀ RPE cũng báo tăng — completion rate thắng trước
		ProgressionSignal signal = new ProgressionSignal(
				false, false, 0.4, 3, false, 5, 5, 0, 60.0, 2.5, 10.0);

		LoadDecisionResult result = engine.decide(signal);

		assertThat(result.ruleId()).isEqualTo("LOW_COMPLETION_RATE");
	}

	@Test
	void fallsThroughToDoubleProgression_whenNothingElseFires() {
		ProgressionSignal signal = new ProgressionSignal(
				false, false, 1.0, null, false, 5, 5, 0, 60.0, 2.5, 10.0);

		LoadDecisionResult result = engine.decide(signal);

		assertThat(result.ruleId()).isEqualTo("DOUBLE_PROGRESSION_ALL_REPS_MET");
		assertThat(result.direction()).isEqualTo(Direction.UP);
	}

	@Test
	void engineDungTuConfig_doiNguongHoanThanh() {
		// 2/3 set = 67%: mặc định 70% thì giữ ở quy tắc 2; hạ ngưỡng 60% thì rơi xuống quy tắc 4.
		ProgressionSignal s = new ProgressionSignal(false, false, 2.0 / 3, null, false, 2, 3, 1, 60.0, 2.5, 10.0);
		ProgressionConfig low = new ProgressionConfig(8, 2, 1, 60, 2, 2, 10, java.util.Map.of());

		assertThat(engine.decide(s).ruleId()).isEqualTo("LOW_COMPLETION_RATE");
		assertThat(new ProgressionEngine(low).decide(s).ruleId()).isEqualTo("SETS_MISSED_TARGET");
	}
}

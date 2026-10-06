package com.fitness.program.service.progression;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Arrays;
import java.util.List;
import org.junit.jupiter.api.Test;

class ProgressionSignalsTest {

	private static ProgressionSignal build(List<Integer> reps, Double rpe, int failBefore, int lowBefore) {
		return ProgressionSignals.build(3, 6, 8, reps, rpe, false, false, failBefore, lowBefore, 60, 2.5,
				ProgressionConfig.DEFAULT);
	}

	@Test
	void duRepMoiSet() {
		ProgressionSignal s = build(List.of(8, 8, 8), 8.0, 0, 0);
		assertThat(s.setsMetTarget()).isEqualTo(3);
		assertThat(s.completionRate()).isEqualTo(1.0);
		assertThat(s.consecutiveFailStreak()).isZero();
		assertThat(s.rpeBelowTargetStreak()).isZero();
		assertThat(s.rpeAboveTargetPlusOne()).isFalse();
	}

	@Test
	void mot_setDuoiSan_laHutRep_congChuoi() {
		ProgressionSignal s = build(List.of(8, 7, 5), null, 1, 0);
		assertThat(s.setsMetTarget()).isEqualTo(1);
		assertThat(s.completionRate()).isEqualTo(2.0 / 3);
		assertThat(s.consecutiveFailStreak()).isEqualTo(2);
		assertThat(s.rpeBelowTargetStreak()).isNull(); // thiếu RPE: null, không phải 0
	}

	@Test
	void setBoHoacThieuSet_laHutRep() {
		assertThat(build(Arrays.asList(8, null, 8), null, 0, 0).consecutiveFailStreak()).isEqualTo(1);
		assertThat(build(List.of(8, 8), null, 0, 0).consecutiveFailStreak()).isEqualTo(1);
	}

	@Test
	void rpe_thapHon_congChuoi_caoHonQuaRpeOver_laVuot() {
		assertThat(build(List.of(8, 8, 8), 6.0, 1, 1).rpeBelowTargetStreak()).isEqualTo(2);
		assertThat(build(List.of(8, 8, 8), 9.0, 0, 0).rpeAboveTargetPlusOne()).isFalse(); // 9 = 8 + 1, chưa vượt
		assertThat(build(List.of(8, 8, 8), 9.5, 0, 0).rpeAboveTargetPlusOne()).isTrue();
		ProgressionConfig over2 = new ProgressionConfig(8, 2, 2, 70, 2, 2, 10, java.util.Map.of());
		assertThat(ProgressionSignals.build(3, 6, 8, List.of(8, 8, 8), 9.5, false, false, 0, 0, 60, 2.5, over2)
				.rpeAboveTargetPlusOne()).isFalse();
	}

	@Test
	void dauLapLai_chiKhiBuoiTruocCungDau() {
		ProgressionSignal s = ProgressionSignals.build(3, 6, 8, List.of(8, 8, 8), null, true, true, 0, 0, 60, 2.5,
				ProgressionConfig.DEFAULT);
		assertThat(s.painReported()).isTrue();
		assertThat(s.painRepeatedFromLastWeek()).isTrue();
		assertThat(s.deloadPct()).isEqualTo(10);
	}
}

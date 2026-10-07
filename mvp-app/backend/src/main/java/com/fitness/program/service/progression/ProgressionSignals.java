package com.fitness.program.service.progression;

import java.util.List;

/**
 * Gộp kết quả MỘT buổi của một bài thành ProgressionSignal. Hàm thuần, không DB: đường thật
 * (ProgressionApplicationService) và "Thử quy tắc" của admin cùng gọi, nên admin thấy đúng điều
 * người tập sẽ nhận.
 *
 * "Đủ rep" so với trần (repsMax); "hụt rep thật" so với sàn (repsMin) — dùng trần thì double
 * progression đang leo từ sàn lên trần bị tính nhầm là trượt và deload oan. Set bỏ (null) hoặc
 * thiếu set cũng là hụt rep thật.
 */
public final class ProgressionSignals {

	private ProgressionSignals() {
	}

	public static ProgressionSignal build(
			int setsTotal, int repsMin, int repsMax, List<Integer> reps, Double lastSetRpe,
			boolean pain, boolean painBefore, int failStreakBefore, int rpeLowStreakBefore,
			double loadKg, double incrementKg, ProgressionConfig config) {
		int setsMetTarget = (int) reps.stream().filter(r -> r != null && r >= repsMax).count();
		int setsCompleted = (int) reps.stream().filter(r -> r != null && r >= repsMin).count();
		boolean trueFail = reps.stream().anyMatch(r -> r == null || r < repsMin) || reps.size() < setsTotal;
		int failStreak = trueFail ? failStreakBefore + 1 : 0;

		// Thiếu RPE: null, không phải 0 — RpeRule bỏ qua, chuỗi cũ giữ nguyên.
		Integer rpeLowStreak = lastSetRpe == null
				? null
				: (lastSetRpe < config.targetRpe() ? rpeLowStreakBefore + 1 : 0);
		boolean rpeAbove = lastSetRpe != null && lastSetRpe > config.targetRpe() + config.rpeOver();
		double completionRate = setsTotal == 0 ? 1.0 : (double) setsCompleted / setsTotal;

		return new ProgressionSignal(
				pain, pain && painBefore, completionRate, rpeLowStreak, rpeAbove, setsMetTarget, setsTotal,
				failStreak, loadKg, incrementKg, config.deloadPct());
	}

}

package com.fitness.program.service.progression;

/** Deload luôn làm tròn XUỐNG bội của step (content-seed-v1.md §5.2: bội 2.5 kg). */
final class LoadRounding {
	private static final double STANDARD_STEP_KG = 2.5;

	private LoadRounding() {
	}

	static double roundDownToStep(double value, double step) {
		return Math.floor(value / step) * step;
	}

	/**
	 * Delta âm sau khi cắt deloadPct% và làm tròn xuống. Bài tăng từng nấc nhỏ hơn 2.5 kg
	 * (tạ đơn nhẹ, đẩy vai 1.25) làm tròn theo nấc của chính bài: bội 2.5 đưa tạ 2 kg về 0.
	 * Dùng bởi PainRule và DoubleProgressionRule.
	 */
	static double deloadDelta(double currentLoadKg, double deloadPct, double incrementKg) {
		double step = incrementKg > 0 ? Math.min(STANDARD_STEP_KG, incrementKg) : STANDARD_STEP_KG;
		double newLoad = roundDownToStep(currentLoadKg * (1 - deloadPct / 100.0), step);
		return newLoad - currentLoadKg;
	}
}

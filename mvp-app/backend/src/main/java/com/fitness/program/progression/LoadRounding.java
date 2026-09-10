package com.fitness.program.progression;

/** Deload luôn làm tròn XUỐNG bội của step (content-seed-v1.md §5.2: bội 2.5 kg). */
final class LoadRounding {
	private LoadRounding() {
	}

	static double roundDownToStep(double value, double step) {
		return Math.floor(value / step) * step;
	}

	/** Delta âm sau khi cắt deloadPct% và làm tròn xuống bội step. Dùng bởi PainRule và DoubleProgressionRule. */
	static double deloadDelta(double currentLoadKg, double deloadPct, double step) {
		double newLoad = roundDownToStep(currentLoadKg * (1 - deloadPct / 100.0), step);
		return newLoad - currentLoadKg;
	}
}

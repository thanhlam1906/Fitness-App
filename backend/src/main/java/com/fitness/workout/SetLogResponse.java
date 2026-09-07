package com.fitness.workout;

import java.math.BigDecimal;
import java.util.UUID;

public record SetLogResponse(
		UUID id,
		UUID exerciseId,
		int setIndex,
		Short targetReps,
		Short reps,
		BigDecimal loadKg,
		Short rpe,
		boolean skipped,
		String skipReason) {

	static SetLogResponse from(SetLog s) {
		return new SetLogResponse(
				s.getId(), s.getExerciseId(), s.getSetIndex(), s.getTargetReps(), s.getReps(),
				s.getLoadKg(), s.getRpe(), s.isSkipped(), s.getSkipReason());
	}
}

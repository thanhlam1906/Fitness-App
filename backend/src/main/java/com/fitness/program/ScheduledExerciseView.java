package com.fitness.program;

import java.math.BigDecimal;
import java.util.UUID;

public record ScheduledExerciseView(
		UUID id,
		String exerciseSlug,
		String exerciseName,
		int orderIndex,
		int targetSets,
		int targetReps,
		BigDecimal targetLoadKg,
		Integer restSeconds,
		String loadChangeReason) {
}

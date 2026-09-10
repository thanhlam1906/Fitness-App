package com.fitness.program;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ScheduledWorkoutView(
		UUID id,
		LocalDate scheduledOn,
		int weekIndex,
		String label,
		String status,
		List<ScheduledExerciseView> exercises) {
}

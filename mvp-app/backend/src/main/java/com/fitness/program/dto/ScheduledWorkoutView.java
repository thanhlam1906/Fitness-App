package com.fitness.program.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ScheduledWorkoutView(
		UUID id,
		LocalDate scheduledOn,
		int weekIndex,
		String label,
		String status,
		/** Có workout_session IN_PROGRESS: màn Chương trình không sửa, không dời buổi này. */
		boolean inProgress,
		List<ScheduledExerciseView> exercises) {
}

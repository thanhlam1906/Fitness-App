package com.fitness.program;

import java.time.LocalDate;
import java.util.List;

/** Kết quả của ScheduleGenerator — ánh xạ vào scheduled_workouts khi persist. */
public record GeneratedWorkout(LocalDate scheduledOn, int weekIndex, String label, List<GeneratedExercise> exercises) {
}

package com.fitness.program;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/** Màn "Lịch riêng" — người dùng tự chọn thứ tập, bài tập và set/rep/tạ. */
public record CreateCustomProgramRequest(
		LocalDate startDate,
		@Min(1) @Max(12) Integer weeksToGenerate,
		@NotEmpty @Valid List<CustomDay> days) {

	public record CustomDay(
			@NotNull @Min(1) @Max(7) Integer dayOfWeek,
			String label,
			@NotEmpty @Valid List<CustomExercise> exercises) {
	}

	public record CustomExercise(
			@NotNull UUID exerciseId,
			@NotNull @Min(1) @Max(20) Integer sets,
			@NotNull @Min(1) @Max(100) Integer repsMin,
			@NotNull @Min(1) @Max(100) Integer repsMax,
			Double loadKg,
			Integer restSeconds) {
	}
}

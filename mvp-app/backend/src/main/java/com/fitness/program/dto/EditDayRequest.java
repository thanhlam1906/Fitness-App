package com.fitness.program.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/** Sửa một loại buổi cho mọi buổi mở cùng nhãn — doc/design-chuong-trinh-v1.md §4.1. */
public record EditDayRequest(
		@NotBlank String label,
		List<UUID> remove,
		List<@Valid ExerciseTargetRequest> update,
		List<@Valid ExerciseTargetRequest> add) {

	public record ExerciseTargetRequest(
			@NotNull UUID exerciseId,
			@NotNull @Min(1) @Max(20) Integer targetSets,
			@NotNull @Min(1) @Max(100) Integer targetReps,
			@NotNull @Min(1) @Max(100) Integer targetRepsMax,
			BigDecimal targetLoadKg) {
	}
}

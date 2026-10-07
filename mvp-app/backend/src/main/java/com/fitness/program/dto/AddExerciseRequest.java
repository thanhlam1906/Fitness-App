package com.fitness.program.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

public record AddExerciseRequest(
		@NotNull UUID exerciseId,
		@NotNull @Min(1) @Max(20) Integer targetSets,
		@NotNull @Min(1) @Max(100) Integer targetReps,
		@NotNull @Min(1) @Max(100) Integer targetRepsMax,
		BigDecimal targetLoadKg,
		Integer restSeconds) {
}

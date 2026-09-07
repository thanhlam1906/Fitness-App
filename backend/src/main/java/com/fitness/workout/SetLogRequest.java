package com.fitness.workout;

import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * §5.1 concept-frontend-v1.md: log ngay sau mỗi set, không giữ ở state cục
 * bộ. Cùng (exerciseId, setIndex) log lại là ghi đè — UNIQUE constraint ở DB.
 */
public record SetLogRequest(
		@NotNull UUID exerciseId,
		short setIndex,
		Short targetReps,
		Short reps,
		BigDecimal loadKg,
		Short rpe,
		boolean skipped,
		String skipReason) {
}

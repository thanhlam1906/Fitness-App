package com.fitness.review.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ChangeExerciseRequest(@NotNull UUID exerciseId) {
}

package com.fitness.workout;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/** scheduledWorkoutId null = tập ngoài lịch (V1__init.sql). */
public record StartSessionRequest(@NotNull UUID userId, UUID scheduledWorkoutId) {
}

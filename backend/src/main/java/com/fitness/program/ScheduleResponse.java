package com.fitness.program;

import java.util.List;
import java.util.UUID;

public record ScheduleResponse(UUID programId, List<ScheduledWorkoutView> workouts) {
}

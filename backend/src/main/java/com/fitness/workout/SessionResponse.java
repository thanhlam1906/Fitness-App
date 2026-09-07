package com.fitness.workout;

import java.util.UUID;

public record SessionResponse(UUID id, UUID userId, UUID scheduledWorkoutId, String status) {

	static SessionResponse from(WorkoutSession s) {
		return new SessionResponse(s.getId(), s.getUserId(), s.getScheduledWorkoutId(), s.getStatus());
	}
}

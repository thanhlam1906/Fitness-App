package com.fitness.workout;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * §5.1 concept-frontend-v1.md: "buổi tập đang dở là dữ liệu server". Trả kèm
 * các set đã log để mở lại tab (hoặc máy khác) là thấy đúng chỗ đang dở, không
 * cần state cục bộ.
 */
public record SessionResponse(
		UUID id, UUID userId, UUID scheduledWorkoutId, String status,
		Instant startedAt, Instant finishedAt, Short sessionRpe, List<SetLogResponse> sets) {

	static SessionResponse from(WorkoutSession s, List<SetLog> sets) {
		return new SessionResponse(
				s.getId(), s.getUserId(), s.getScheduledWorkoutId(), s.getStatus(),
				s.getStartedAt(), s.getFinishedAt(), s.getSessionRpe(),
				sets.stream().map(SetLogResponse::from).toList());
	}
}

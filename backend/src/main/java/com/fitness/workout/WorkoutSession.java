package com.fitness.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Bảng workout_sessions, V1__init.sql — một buổi tập đã bắt đầu. scheduledWorkoutId null = tập ngoài lịch. */
@Entity
@Table(name = "workout_sessions")
public class WorkoutSession {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "scheduled_workout_id")
	private UUID scheduledWorkoutId;

	@Column(name = "started_at", nullable = false, updatable = false)
	private Instant startedAt = Instant.now();

	@Column(name = "finished_at")
	private Instant finishedAt;

	@Column(nullable = false)
	private String status = "IN_PROGRESS";

	protected WorkoutSession() {
	}

	public WorkoutSession(UUID userId, UUID scheduledWorkoutId) {
		this.userId = userId;
		this.scheduledWorkoutId = scheduledWorkoutId;
	}

	public void finish() {
		this.finishedAt = Instant.now();
		this.status = "DONE";
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getScheduledWorkoutId() {
		return scheduledWorkoutId;
	}

	public String getStatus() {
		return status;
	}
}

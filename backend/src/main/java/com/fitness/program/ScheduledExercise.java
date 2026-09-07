package com.fitness.program;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.util.UUID;

/** Bảng scheduled_exercises, V1__init.sql — một bài trong một ScheduledWorkout. */
@Entity
@Table(name = "scheduled_exercises")
public class ScheduledExercise {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "scheduled_workout_id", nullable = false)
	private UUID scheduledWorkoutId;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(name = "order_index", nullable = false)
	private short orderIndex;

	@Column(name = "target_sets", nullable = false)
	private short targetSets;

	@Column(name = "target_reps", nullable = false)
	private short targetReps;

	@Column(name = "target_load_kg", precision = 6, scale = 2)
	private BigDecimal targetLoadKg;

	@Column(name = "rest_seconds")
	private Short restSeconds;

	@Column(name = "substituted_from")
	private UUID substitutedFrom;

	protected ScheduledExercise() {
	}

	public ScheduledExercise(UUID scheduledWorkoutId, UUID exerciseId, short orderIndex, short targetSets,
			short targetReps, BigDecimal targetLoadKg, Short restSeconds) {
		this.scheduledWorkoutId = scheduledWorkoutId;
		this.exerciseId = exerciseId;
		this.orderIndex = orderIndex;
		this.targetSets = targetSets;
		this.targetReps = targetReps;
		this.targetLoadKg = targetLoadKg;
		this.restSeconds = restSeconds;
	}

	public UUID getId() {
		return id;
	}
}

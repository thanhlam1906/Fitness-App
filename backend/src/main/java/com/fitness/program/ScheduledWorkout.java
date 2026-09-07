package com.fitness.program;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/** Bảng scheduled_workouts, V1__init.sql — một buổi tập sinh ra từ ScheduleGenerator. */
@Entity
@Table(name = "scheduled_workouts")
public class ScheduledWorkout {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "program_id", nullable = false)
	private UUID programId;

	@Column(name = "scheduled_on", nullable = false)
	private LocalDate scheduledOn;

	@Column(name = "week_index", nullable = false)
	private short weekIndex;

	@Column
	private String label;

	@Column(nullable = false)
	private String status = "PLANNED";

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected ScheduledWorkout() {
	}

	public ScheduledWorkout(UUID programId, LocalDate scheduledOn, short weekIndex, String label) {
		this.programId = programId;
		this.scheduledOn = scheduledOn;
		this.weekIndex = weekIndex;
		this.label = label;
	}

	public UUID getId() {
		return id;
	}

	public LocalDate getScheduledOn() {
		return scheduledOn;
	}
}

package com.fitness.program.progression;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/**
 * Bảng exercise_progression_state, V2__progression_state.sql. Streak (RPE
 * thấp liên tiếp, trượt rep liên tiếp, có đau lần trước) phải bền qua nhiều
 * buổi — ProgressionSignalBuilder đọc/ghi bảng này mỗi khi một buổi kết thúc.
 */
@Entity
@Table(name = "exercise_progression_state")
public class ExerciseProgressionState {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "program_id", nullable = false)
	private UUID programId;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(name = "consecutive_fail_streak", nullable = false)
	private short consecutiveFailStreak;

	@Column(name = "rpe_below_target_streak", nullable = false)
	private short rpeBelowTargetStreak;

	@Column(name = "last_pain_reported", nullable = false)
	private boolean lastPainReported;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = Instant.now();

	protected ExerciseProgressionState() {
	}

	public ExerciseProgressionState(UUID userId, UUID programId, UUID exerciseId) {
		this.userId = userId;
		this.programId = programId;
		this.exerciseId = exerciseId;
	}

	public short getConsecutiveFailStreak() {
		return consecutiveFailStreak;
	}

	public short getRpeBelowTargetStreak() {
		return rpeBelowTargetStreak;
	}

	public boolean isLastPainReported() {
		return lastPainReported;
	}

	public void update(short consecutiveFailStreak, short rpeBelowTargetStreak, boolean lastPainReported) {
		this.consecutiveFailStreak = consecutiveFailStreak;
		this.rpeBelowTargetStreak = rpeBelowTargetStreak;
		this.lastPainReported = lastPainReported;
		this.updatedAt = Instant.now();
	}
}

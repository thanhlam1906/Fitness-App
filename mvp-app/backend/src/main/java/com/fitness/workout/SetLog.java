package com.fitness.workout;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Bảng set_logs, V1__init.sql. ke-hoach-chi-tiet-chuc-nang-v1.md §5.3: RPE
 * hỏi mềm — null hợp lệ, không phải 0. UNIQUE(session_id, exercise_id,
 * set_index) — log lại cùng set là ghi đè (upsert), không phải lỗi trùng.
 */
@Entity
@Table(name = "set_logs")
public class SetLog {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "session_id", nullable = false)
	private UUID sessionId;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(name = "set_index", nullable = false)
	private short setIndex;

	@Column(name = "target_reps")
	private Short targetReps;

	@Column
	private Short reps;

	@Column(name = "load_kg", precision = 6, scale = 2)
	private BigDecimal loadKg;

	@Column
	private Short rpe;

	@Column(nullable = false)
	private boolean skipped;

	@Column(name = "skip_reason")
	private String skipReason;

	@Column(name = "logged_at", nullable = false)
	private Instant loggedAt = Instant.now();

	protected SetLog() {
	}

	public SetLog(UUID sessionId, UUID exerciseId, short setIndex) {
		this.sessionId = sessionId;
		this.exerciseId = exerciseId;
		this.setIndex = setIndex;
	}

	public void apply(Short targetReps, Short reps, BigDecimal loadKg, Short rpe, boolean skipped, String skipReason) {
		this.targetReps = targetReps;
		this.reps = reps;
		this.loadKg = loadKg;
		this.rpe = rpe;
		this.skipped = skipped;
		this.skipReason = skipReason;
		this.loggedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public UUID getSessionId() {
		return sessionId;
	}

	public UUID getExerciseId() {
		return exerciseId;
	}

	public int getSetIndex() {
		return setIndex;
	}

	public Short getTargetReps() {
		return targetReps;
	}

	public Short getReps() {
		return reps;
	}

	public BigDecimal getLoadKg() {
		return loadKg;
	}

	public Short getRpe() {
		return rpe;
	}

	public boolean isSkipped() {
		return skipped;
	}

	public String getSkipReason() {
		return skipReason;
	}
}

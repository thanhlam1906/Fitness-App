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

	@Column(name = "target_reps_max", nullable = false)
	private short targetRepsMax;

	@Column(name = "target_load_kg", precision = 6, scale = 2)
	private BigDecimal targetLoadKg;

	@Column(name = "rest_seconds")
	private Short restSeconds;

	@Column(name = "substituted_from")
	private UUID substitutedFrom;

	protected ScheduledExercise() {
	}

	public ScheduledExercise(UUID scheduledWorkoutId, UUID exerciseId, short orderIndex, short targetSets,
			short targetReps, short targetRepsMax, BigDecimal targetLoadKg, Short restSeconds) {
		this.scheduledWorkoutId = scheduledWorkoutId;
		this.exerciseId = exerciseId;
		this.orderIndex = orderIndex;
		this.targetSets = targetSets;
		this.targetReps = targetReps;
		this.targetRepsMax = targetRepsMax;
		this.targetLoadKg = targetLoadKg;
		this.restSeconds = restSeconds;
	}

	public UUID getId() {
		return id;
	}

	public UUID getScheduledWorkoutId() {
		return scheduledWorkoutId;
	}

	public UUID getExerciseId() {
		return exerciseId;
	}

	public int getOrderIndex() {
		return orderIndex;
	}

	public int getTargetSets() {
		return targetSets;
	}

	public int getTargetReps() {
		return targetReps;
	}

	public int getTargetRepsMax() {
		return targetRepsMax;
	}

	public BigDecimal getTargetLoadKg() {
		return targetLoadKg;
	}

	public Short getRestSeconds() {
		return restSeconds;
	}

	public UUID getSubstitutedFrom() {
		return substitutedFrom;
	}

	/** Progression đợt sau ghi tải mới vào ScheduledExercise của tuần kế tiếp — chưa tồn tại tuần đã tập xong. */
	public void updateTargetLoad(BigDecimal targetLoadKg) {
		this.targetLoadKg = targetLoadKg;
	}

	/**
	 * Màn "Lịch riêng" — người dùng tự đặt lại set/rep/tạ/nghỉ của ĐÚNG buổi
	 * đang mở. Thay cả 5 field một lượt: tạ và nghỉ vốn nullable, nên "gửi null
	 * là giữ nguyên hay là xoá" sẽ không phân biệt được nếu nhận từng field lẻ.
	 */
	public void updateTargets(int targetSets, int targetReps, int targetRepsMax,
			BigDecimal targetLoadKg, Integer restSeconds) {
		this.targetSets = (short) targetSets;
		this.targetReps = (short) targetReps;
		this.targetRepsMax = (short) targetRepsMax;
		this.targetLoadKg = targetLoadKg;
		this.restSeconds = restSeconds == null ? null : restSeconds.shortValue();
	}

	/**
	 * §5.5 — thay bài khi thiếu thiết bị. Set/rep giữ nguyên; tải bỏ trống vì
	 * mức tạ của bài cũ không chuyển được sang bài mới (khác đòn bẩy, khác thiết
	 * bị). substituted_from giữ vết bài gốc, thay lần hai vẫn trỏ về bài gốc đầu.
	 */
	public void substituteWith(UUID newExerciseId) {
		if (this.substitutedFrom == null) {
			this.substitutedFrom = this.exerciseId;
		}
		this.exerciseId = newExerciseId;
		this.targetLoadKg = null;
	}
}

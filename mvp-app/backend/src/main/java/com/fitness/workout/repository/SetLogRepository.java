package com.fitness.workout.repository;

import com.fitness.workout.entity.SetLog;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface SetLogRepository extends JpaRepository<SetLog, UUID> {

	Optional<SetLog> findBySessionIdAndExerciseIdAndSetIndex(UUID sessionId, UUID exerciseId, short setIndex);

	List<SetLog> findBySessionId(UUID sessionId);

	/**
	 * Tonnage (kg nâng, không tính set bỏ qua) của các buổi bắt đầu trong [from, to), dùng cho
	 * cả trợ lý (§9 nhóm B3) và màn Tiến bộ (ProgressService). Join ad-hoc qua session_id vì
	 * set_logs không map quan hệ tới WorkoutSession, chỉ có session_id.
	 */
	@Query("select coalesce(sum(coalesce(s.loadKg, 0) * coalesce(s.reps, 0)), 0) "
			+ "from SetLog s join WorkoutSession ws on ws.id = s.sessionId "
			+ "where ws.userId = :userId and ws.startedAt >= :from and ws.startedAt < :to and s.skipped = false")
	BigDecimal tonnageBetween(UUID userId, Instant from, Instant to);

	/**
	 * Trang "Buổi tập" của admin (doc/design-trang-buoi-tap-v1.md §3): mọi set của buổi bắt đầu từ
	 * `from`. Cột: userId, templateId, exerciseId, skipped, skipReason, reps, rpe, sàn rep.
	 * Sàn lấy từ scheduled_exercises vì set_logs.target_reps là TRẦN (web gửi targetRepsMax).
	 * Subquery min() thay join để một bài lặp hai lần trong buổi không nhân đôi set.
	 */
	@Query("select ws.userId, p.templateId, s.exerciseId, s.skipped, s.skipReason, s.reps, s.rpe, "
			+ "(select min(se.targetReps) from ScheduledExercise se "
			+ "  where se.scheduledWorkoutId = ws.scheduledWorkoutId and se.exerciseId = s.exerciseId) "
			+ "from SetLog s join WorkoutSession ws on ws.id = s.sessionId "
			+ "left join ScheduledWorkout sw on sw.id = ws.scheduledWorkoutId "
			+ "left join Program p on p.id = sw.programId "
			+ "where ws.startedAt >= :from")
	List<Object[]> insightRowsSince(Instant from);
}

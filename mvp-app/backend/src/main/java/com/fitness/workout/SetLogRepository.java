package com.fitness.workout;

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
	 * Tonnage (kg nâng, không tính set bỏ qua) từ ngày `since` — ProgressSummaryTool
	 * §9 nhóm B3. Join ad-hoc qua session_id, cùng kiểu với
	 * ScheduledWorkoutRepository.scheduleStatsPerUser — set_logs không map
	 * quan hệ tới WorkoutSession, chỉ có session_id.
	 */
	@Query("select coalesce(sum(coalesce(s.loadKg, 0) * coalesce(s.reps, 0)), 0) "
			+ "from SetLog s join WorkoutSession ws on ws.id = s.sessionId "
			+ "where ws.userId = :userId and ws.startedAt >= :since and s.skipped = false")
	BigDecimal totalTonnageSince(UUID userId, Instant since);
}

package com.fitness.workout.repository;

import com.fitness.workout.entity.PainReport;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface PainReportRepository extends JpaRepository<PainReport, UUID> {

	List<PainReport> findBySessionId(UUID sessionId);

	/**
	 * Trang "Buổi tập" của admin: một dòng cho mỗi (lần báo đau, set trong buổi đó), service gộp lại.
	 * Cột: painId, userId, templateId, bodyArea, severity, exerciseId (null khi buổi chưa ghi set nào).
	 */
	@Query("select pr.id, ws.userId, p.templateId, pr.bodyArea, pr.severity, s.exerciseId "
			+ "from PainReport pr join WorkoutSession ws on ws.id = pr.sessionId "
			+ "left join ScheduledWorkout sw on sw.id = ws.scheduledWorkoutId "
			+ "left join Program p on p.id = sw.programId "
			+ "left join SetLog s on s.sessionId = pr.sessionId "
			+ "where ws.startedAt >= :from")
	List<Object[]> insightRowsSince(Instant from);
}

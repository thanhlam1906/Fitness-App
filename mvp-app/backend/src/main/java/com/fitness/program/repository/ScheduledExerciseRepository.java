package com.fitness.program.repository;

import com.fitness.program.entity.ScheduledExercise;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ScheduledExerciseRepository extends JpaRepository<ScheduledExercise, UUID> {

	List<ScheduledExercise> findByScheduledWorkoutId(UUID scheduledWorkoutId);

	/** Trợ lý (explainLoadChange): mức tạ của một bài qua từng buổi trong lịch. Cột: scheduledOn, targetLoadKg. */
	@Query("select sw.scheduledOn, se.targetLoadKg "
			+ "from ScheduledExercise se join ScheduledWorkout sw on sw.id = se.scheduledWorkoutId "
			+ "where sw.programId = :programId and se.exerciseId = :exerciseId "
			// Dời lịch có thể để buổi vừa tập và một buổi chưa tập cùng ngày: buổi đã tập mang mức tạ trước khi đổi.
			+ "order by sw.scheduledOn, case when sw.status = 'DONE' then 0 else 1 end")
	List<Object[]> loadsByDate(UUID programId, UUID exerciseId);

	/**
	 * Trang "Buổi tập" của admin: mọi bài trong lịch các ngày [from, to].
	 * Cột: userId, templateId, exerciseId, substitutedFrom.
	 */
	@Query("select p.userId, p.templateId, se.exerciseId, se.substitutedFrom "
			+ "from ScheduledExercise se join ScheduledWorkout sw on sw.id = se.scheduledWorkoutId "
			+ "join Program p on p.id = sw.programId "
			+ "where sw.scheduledOn between :from and :to")
	List<Object[]> insightRowsBetween(LocalDate from, LocalDate to);
}

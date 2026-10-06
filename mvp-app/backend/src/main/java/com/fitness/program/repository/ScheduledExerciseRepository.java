package com.fitness.program.repository;

import com.fitness.program.entity.ScheduledExercise;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ScheduledExerciseRepository extends JpaRepository<ScheduledExercise, UUID> {

	List<ScheduledExercise> findByScheduledWorkoutId(UUID scheduledWorkoutId);

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

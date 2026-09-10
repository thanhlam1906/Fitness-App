package com.fitness.program;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduledExerciseRepository extends JpaRepository<ScheduledExercise, UUID> {

	List<ScheduledExercise> findByScheduledWorkoutId(UUID scheduledWorkoutId);
}

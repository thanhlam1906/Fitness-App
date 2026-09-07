package com.fitness.program;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduledWorkoutRepository extends JpaRepository<ScheduledWorkout, UUID> {

	List<ScheduledWorkout> findByProgramIdOrderByScheduledOn(UUID programId);
}

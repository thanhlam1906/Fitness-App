package com.fitness.program.progression;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseProgressionStateRepository extends JpaRepository<ExerciseProgressionState, UUID> {

	Optional<ExerciseProgressionState> findByUserIdAndProgramIdAndExerciseId(
			UUID userId, UUID programId, UUID exerciseId);
}

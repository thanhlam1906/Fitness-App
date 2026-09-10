package com.fitness.program;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LoadDecisionRepository extends JpaRepository<LoadDecision, UUID> {

	List<LoadDecision> findByProgramIdAndExerciseId(UUID programId, UUID exerciseId);

	List<LoadDecision> findByProgramId(UUID programId);
}

package com.fitness.content;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormCheckRepository extends JpaRepository<FormCheck, UUID> {

	List<FormCheck> findByExerciseId(UUID exerciseId);

	Optional<FormCheck> findByExerciseIdAndCode(UUID exerciseId, String code);
}

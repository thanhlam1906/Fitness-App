package com.fitness.content;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface FormCheckRepository extends JpaRepository<FormCheck, UUID> {

	List<FormCheck> findByExerciseId(UUID exerciseId);

	Optional<FormCheck> findByExerciseIdAndCode(UUID exerciseId, String code);

	long countByExerciseIdAndActiveTrue(UUID exerciseId);

	/** Số mục kiểm mỗi bài cho màn 7 và màn 12 — một query, không phải 40. */
	@Query("select c.exerciseId, count(c) from FormCheck c where c.active = true group by c.exerciseId")
	List<Object[]> countActivePerExercise();
}

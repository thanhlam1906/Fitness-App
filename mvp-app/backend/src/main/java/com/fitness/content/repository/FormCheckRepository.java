package com.fitness.content.repository;

import com.fitness.content.entity.FormCheck;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FormCheckRepository extends JpaRepository<FormCheck, UUID> {

	List<FormCheck> findByExerciseId(UUID exerciseId);

	List<FormCheck> findByExerciseIdAndActiveTrueOrderByPriority(UUID exerciseId);

	/** Khớp đang bật của mọi bài, một query cho danh sách ~20 bài. */
	List<FormCheck> findByActiveTrue();

	Optional<FormCheck> findByExerciseIdAndCode(UUID exerciseId, String code);
}

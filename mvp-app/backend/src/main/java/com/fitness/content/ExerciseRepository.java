package com.fitness.content;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ExerciseRepository extends JpaRepository<Exercise, UUID> {

	List<Exercise> findBySlugIn(List<String> slugs);

	Optional<Exercise> findBySlug(String slug);
}

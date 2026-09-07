package com.fitness.content;

import java.util.List;
import java.util.UUID;

public record ExerciseResponse(
		UUID id,
		String slug,
		String nameEn,
		String nameVi,
		List<String> muscleGroups,
		List<String> equipment,
		String description,
		boolean analyzable,
		boolean active) {

	static ExerciseResponse from(Exercise e) {
		return new ExerciseResponse(
				e.getId(), e.getSlug(), e.getNameEn(), e.getNameVi(),
				List.of(e.getMuscleGroups()), List.of(e.getEquipment()),
				e.getDescription(), e.isAnalyzable(), e.isActive());
	}
}

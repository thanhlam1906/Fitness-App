package com.fitness.content;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * `formCheckCount` cho màn 7 ("3 mục kiểm") và cột trái màn 12; `updatedAt`
 * cho dòng "sửa lúc ..." — cả hai đã nằm sẵn trong DB, chỉ chưa trả ra.
 */
public record ExerciseResponse(
		UUID id,
		String slug,
		String nameEn,
		String nameVi,
		List<String> muscleGroups,
		List<String> equipment,
		String description,
		String filmingGuide,
		boolean analyzable,
		boolean active,
		long formCheckCount,
		Instant updatedAt) {

	static ExerciseResponse from(Exercise e, long formCheckCount) {
		return new ExerciseResponse(
				e.getId(), e.getSlug(), e.getNameEn(), e.getNameVi(),
				List.of(e.getMuscleGroups()), List.of(e.getEquipment()),
				e.getDescription(), e.getFilmingGuide(), e.isAnalyzable(), e.isActive(),
				formCheckCount, e.getUpdatedAt());
	}
}

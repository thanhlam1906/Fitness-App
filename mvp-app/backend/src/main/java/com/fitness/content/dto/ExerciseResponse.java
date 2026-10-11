package com.fitness.content.dto;

import com.fitness.content.entity.Exercise;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * `formCheckCount` cho màn 7 ("3 mục kiểm") và cột trái màn 12; `updatedAt`
 * cho dòng "sửa lúc ..." — cả hai đã nằm sẵn trong DB, chỉ chưa trả ra.
 * `checkViews`: các góc có khớp đang bật, theo thứ tự camera hướng dẫn.
 * `hasStillImage`/`hasAnimatedImage`: cột trái màn 12 ghi "chưa có ảnh", form admin hiện ảnh đang có.
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
		List<String> checkViews,
		boolean hasStillImage,
		boolean hasAnimatedImage,
		Instant updatedAt) {

	/** imageKinds: các loại ảnh đang có của bài ("STILL", "ANIMATED"), từ ExerciseImageService.kindsBySlug. */
	public static ExerciseResponse from(Exercise e, long formCheckCount, List<String> checkViews, Set<String> imageKinds) {
		return new ExerciseResponse(
				e.getId(), e.getSlug(), e.getNameEn(), e.getNameVi(),
				List.of(e.getMuscleGroups()), List.of(e.getEquipment()),
				e.getDescription(), e.getFilmingGuide(), e.isAnalyzable(), e.isActive(),
				formCheckCount, checkViews, imageKinds.contains("STILL"), imageKinds.contains("ANIMATED"),
				e.getUpdatedAt());
	}
}

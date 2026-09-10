package com.fitness.content;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** slug chỉ dùng khi tạo mới (POST) — bỏ qua khi sửa (PUT), slug không đổi sau khi tạo. */
public record ExerciseRequest(
		String slug,
		@NotBlank String nameEn,
		String nameVi,
		List<String> muscleGroups,
		List<String> equipment,
		String description,
		String filmingGuide,
		boolean analyzable,
		boolean active) {
}

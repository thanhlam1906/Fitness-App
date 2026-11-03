package com.fitness.content.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * slug chỉ dùng khi tạo mới (POST) — bỏ qua khi sửa (PUT), slug không đổi sau khi tạo.
 * analyzable máy tự tính từ khớp cần kiểm (FormCheckService), không nhận từ request.
 * stepsVi, mistakesVi: null khi sửa là giữ nguyên giá trị cũ, khi tạo là danh sách rỗng.
 */
public record ExerciseRequest(
		String slug,
		@NotBlank String nameEn,
		String nameVi,
		List<String> muscleGroups,
		List<String> equipment,
		String description,
		String filmingGuide,
		boolean active,
		@Size(max = 30) List<@Size(max = 500) String> stepsVi,
		@Size(max = 30) List<@Size(max = 500) String> mistakesVi) {
}

package com.fitness.assistant.dto;

import com.fitness.content.entity.Exercise;
import java.util.List;

/**
 * Thẻ bài trong câu trả lời của trợ lý (design-thu-vien-bai-v1 §7.2). Đọc thẳng từ DB, không do model viết:
 * cả nội dung thẻ lẫn danh sách thẻ do code thu từ kết quả tool. Ảnh lấy qua exerciseImageUrl(slug, ...).
 */
public record ExerciseCardResponse(
		String slug, String nameEn, List<String> muscleGroups, List<String> equipment, List<String> stepsVi,
		List<String> mistakesVi) {

	public static ExerciseCardResponse from(Exercise e) {
		return new ExerciseCardResponse(e.getSlug(), e.getNameEn(), List.of(e.getMuscleGroups()),
				List.of(e.getEquipment()), List.of(e.getStepsVi()), List.of(e.getMistakesVi()));
	}
}

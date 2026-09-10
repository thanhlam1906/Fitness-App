package com.fitness.program;

import java.util.List;
import java.util.UUID;

/**
 * §5.1 ke-hoach-chi-tiet-chuc-nang-v1.md: "Người dùng xem cấu trúc rồi xác
 * nhận" — nên candidate mang theo cả cấu trúc chu kỳ, không chỉ tên. Màn chọn
 * chương trình cũng lấy danh sách bài cần mức tạ khởi điểm từ đây, thay vì
 * bắt người dùng gõ tay slug.
 */
public record TemplateCandidate(
		UUID id,
		String slug,
		String name,
		String methodology,
		short sessionsMin,
		short sessionsMax,
		List<String> requiredEquipment,
		List<CycleDayView> days) {

	public record CycleDayView(int order, String label, List<CycleExerciseView> exercises) {
	}

	/** needsLoad = bài dùng thiết bị (bodyweight có equipment rỗng → tăng tiến bằng rep, không nhập tạ). */
	public record CycleExerciseView(
			String slug, String name, int sets, int repsMin, int repsMax, int restSec, boolean needsLoad) {
	}
}

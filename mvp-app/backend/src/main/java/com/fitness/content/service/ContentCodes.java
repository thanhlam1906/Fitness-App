package com.fitness.content.service;

import java.util.Set;

/**
 * Mã nhóm cơ và thiết bị hợp lệ. Trùng MUSCLE_OPTIONS ở web (src/lib/muscles.ts) và EQUIPMENT_OPTIONS
 * (features/profile/types): admin chọn bằng nút bấm, người tập khai thiết bị trong đúng 4 loại này.
 * Server vẫn kiểm vì form cũ gõ tay từng lưu được mã sai, và request có thể không đi qua web.
 * Set.of(...).contains(null) ném NullPointerException: nơi lọc phải loại null trước (thành lỗi 400, không 500).
 */
final class ContentCodes {

	static final Set<String> MUSCLES = Set.of(
			"QUADS", "HAMSTRINGS", "GLUTES", "CORE", "LOWER_BACK", "UPPER_BACK",
			"LATS", "CHEST", "SHOULDERS", "TRICEPS", "BICEPS");

	static final Set<String> EQUIPMENT = Set.of("BARBELL_RACK", "DUMBBELL", "KETTLEBELL", "BENCH");

	private ContentCodes() {
	}
}

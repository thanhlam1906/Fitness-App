package com.fitness.content.service;

import java.util.Set;

/**
 * Mã nhóm cơ và thiết bị hợp lệ. MUSCLES trùng MUSCLE_OPTIONS ở web (src/lib/muscles.ts): admin chọn bằng nút bấm.
 * EQUIPMENT rộng hơn EQUIPMENT_OPTIONS của hồ sơ (features/profile/types, 4 loại người tập khai):
 * thư viện bài có thêm cáp, máy, dây kháng lực, bóng, nên không còn trùng nhau.
 * Server vẫn kiểm vì form cũ gõ tay từng lưu được mã sai, và request có thể không đi qua web.
 * Set.of(...).contains(null) ném NullPointerException: nơi lọc phải loại null trước (thành lỗi 400, không 500).
 */
final class ContentCodes {

	static final Set<String> MUSCLES = Set.of(
			"QUADS", "HAMSTRINGS", "GLUTES", "CORE", "LOWER_BACK", "UPPER_BACK",
			"LATS", "CHEST", "SHOULDERS", "TRICEPS", "BICEPS",
			"CALVES", "FOREARMS", "ADDUCTORS", "ABDUCTORS", "CARDIO");

	static final Set<String> EQUIPMENT = Set.of(
			"BARBELL_RACK", "DUMBBELL", "KETTLEBELL", "BENCH",
			"CABLE", "MACHINE", "BAND", "BALL", "OTHER");

	private ContentCodes() {
	}
}

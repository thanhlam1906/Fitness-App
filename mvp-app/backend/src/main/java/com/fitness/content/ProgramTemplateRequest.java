package com.fitness.content;

import jakarta.validation.constraints.NotBlank;
import java.util.List;

/** slug chỉ dùng khi tạo mới (POST) — bỏ qua khi sửa (PUT). weekStructure/progression là JSON thô, xem F4. */
public record ProgramTemplateRequest(
		String slug,
		@NotBlank String name,
		String methodology,
		short sessionsMin,
		short sessionsMax,
		List<String> requiredEquipment,
		@NotBlank String weekStructure,
		@NotBlank String progression,
		boolean active) {
}

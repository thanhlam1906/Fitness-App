package com.fitness.content;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.util.List;

/** code chỉ dùng khi tạo mới (POST) — bỏ qua khi sửa (PUT). thresholds là JSON thô, xem F4. */
public record FormCheckRequest(
		String code,
		@NotBlank String metric,
		List<String> validViewpoints,
		@NotBlank String thresholds,
		@NotNull BigDecimal confidenceMin,
		String cuePassVi,
		String cueWarnVi,
		@NotBlank String cueFailVi,
		short priority,
		boolean active) {
}

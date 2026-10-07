package com.fitness.content.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Một khớp cần kiểm admin khai báo (doc/design-cham-form-nguong-v1.md §2). `from`/`to` là độ,
 * null = không giới hạn phía đó. Mã mục máy tự sinh từ view, measure, moment.
 */
public record FormCheckRequest(
		@NotBlank String view,
		@NotBlank String measure,
		@NotBlank String moment,
		Integer from,
		Integer to,
		@NotNull @Min(0) Integer warn,
		@NotBlank String nameVi,
		@NotBlank String cueFailVi) {
}

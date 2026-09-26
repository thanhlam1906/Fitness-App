package com.fitness.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Năm sinh, giới tính không nằm ở đây: hỏi ở bước BODY của onboarding (PATCH /me/profile). */
public record RegisterRequest(
		@NotBlank @Email String email,
		@NotBlank @Size(min = 8) String password,
		@NotBlank @Size(min = 2, max = 100) String fullName,
		// Client đã bỏ khoảng trắng, dấu chấm; server chỉ nhận dạng gọn để dữ liệu thống nhất.
		@NotBlank @Pattern(regexp = "^(0|\\+84)\\d{9}$") String phone) {
}

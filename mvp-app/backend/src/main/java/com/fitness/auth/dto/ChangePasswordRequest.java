package com.fitness.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** PUT /me/password — luật mật khẩu mới giống đăng ký (RegisterRequest). */
public record ChangePasswordRequest(
		@NotBlank String currentPassword,
		@NotBlank @Size(min = 8) String newPassword) {
}

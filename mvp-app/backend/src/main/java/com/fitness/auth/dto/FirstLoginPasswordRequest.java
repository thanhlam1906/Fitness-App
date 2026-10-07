package com.fitness.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * POST /auth/change-password — người dùng mật khẩu tạm chưa có token (login không cấp), nên
 * xác minh bằng email + mật khẩu tạm như lúc đăng nhập.
 */
public record FirstLoginPasswordRequest(
		@NotBlank String email,
		@NotBlank String currentPassword,
		@NotBlank @Size(min = 8) String newPassword) {
}

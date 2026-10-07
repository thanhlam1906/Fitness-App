package com.fitness.admin.dto;

import com.fitness.auth.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/** Admin tạo tài khoản. SĐT không bắt buộc (null); có thì cùng regex với RegisterRequest. */
public record AdminUserCreateRequest(
		@NotBlank @Size(min = 2, max = 100) String fullName,
		@NotBlank @Email String email,
		@Pattern(regexp = "^(0|\\+84)\\d{9}$") String phone,
		@NotNull Role role) {
}

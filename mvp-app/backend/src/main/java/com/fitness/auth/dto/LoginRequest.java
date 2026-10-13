package com.fitness.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Email thành tên bộ đếm rate limit và nằm trong RAM tới lượt xoá mỗi giờ (AuthService.loginKey), nên
 * phải có trần độ dài. 254 là độ dài email tối đa theo RFC 5321.
 */
public record LoginRequest(@NotBlank @Size(max = 254) String email, @NotBlank String password) {
}

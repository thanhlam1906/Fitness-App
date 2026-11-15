package com.fitness.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** ID token Google mà app Android nhận từ nút đăng nhập native (web gửi access token qua SocialLoginRequest). */
public record GoogleIdTokenRequest(@NotBlank @Size(max = 4096) String idToken) {
}

package com.fitness.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Access token Google/Facebook web nhận từ cửa sổ đăng nhập của họ. */
public record SocialLoginRequest(@NotBlank @Size(max = 4096) String accessToken) {
}

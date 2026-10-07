package com.fitness.auth.dto;

import com.fitness.auth.entity.Role;
import java.util.UUID;

public record TokenResponse(String accessToken, String refreshToken, UUID userId, Role role) {
}

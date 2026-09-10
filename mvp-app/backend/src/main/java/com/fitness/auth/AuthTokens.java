package com.fitness.auth;

import java.util.UUID;

public record AuthTokens(String accessToken, String refreshToken, UUID userId, Role role) {
}

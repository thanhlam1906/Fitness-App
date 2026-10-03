package com.fitness.admin.dto;

import java.time.Instant;
import java.util.UUID;

public record AdminUserRowResponse(
		UUID id, String email, String role, boolean active, Instant createdAt, Instant lastActivityAt,
		String programName, Short weekIndex, Short totalWeeks,
		long sessionCount, long clipCount, Integer adherencePct) {
}

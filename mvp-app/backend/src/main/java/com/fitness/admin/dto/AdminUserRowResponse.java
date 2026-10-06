package com.fitness.admin.dto;

import com.fitness.admin.repository.AdminUserQueryRepository.UserRow;
import java.time.Instant;
import java.util.UUID;

/** Một dòng màn admin Người dùng. `status`: TRAINING | NOT_STARTED | IDLE | LOCKED (spec §5.2). */
public record AdminUserRowResponse(
		UUID id, String email, String fullName, String role, boolean active, String status,
		Instant createdAt, Instant lastActivityAt, String programName, Short weekIndex, Short totalWeeks,
		long sessionCount, long clipCount, Integer adherencePct) {

	public static AdminUserRowResponse from(UserRow r) {
		return new AdminUserRowResponse(
				r.id(), r.email(), r.fullName(), r.role(), r.active(), r.status(), r.createdAt(),
				r.lastActivityAt(), r.programName(), r.weekIndex(), r.totalWeeks(),
				r.sessionCount(), r.clipCount(), r.adherencePct());
	}
}

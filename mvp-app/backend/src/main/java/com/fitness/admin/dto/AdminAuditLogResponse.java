package com.fitness.admin.dto;

import com.fitness.admin.entity.AdminAuditLog;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/** `targetId` null = tài khoản đã bị xoá; web không tạo link tới hồ sơ. */
public record AdminAuditLogResponse(
		UUID id, String actorEmail, UUID targetId, String targetEmail, String action,
		Map<String, Object> detail, String reason, Instant createdAt) {

	public static AdminAuditLogResponse from(AdminAuditLog log) {
		return new AdminAuditLogResponse(log.getId(), log.getActorEmail(), log.getTargetId(), log.getTargetEmail(),
				log.getAction(), log.getDetail(), log.getReason(), log.getCreatedAt());
	}
}

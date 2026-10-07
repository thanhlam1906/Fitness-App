package com.fitness.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Bảng admin_audit_log, V15__user_management.sql. Chỉ thêm, không sửa, không xoá. */
@Entity
@Table(name = "admin_audit_log")
public class AdminAuditLog {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "actor_id")
	private UUID actorId;

	@Column(name = "actor_email", nullable = false)
	private String actorEmail;

	@Column(name = "target_id")
	private UUID targetId;

	@Column(name = "target_email", nullable = false)
	private String targetEmail;

	@Column(nullable = false)
	private String action;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private Map<String, Object> detail;

	private String reason;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected AdminAuditLog() {
	}

	public AdminAuditLog(UUID actorId, String actorEmail, UUID targetId, String targetEmail, String action,
			Map<String, Object> detail, String reason) {
		this.actorId = actorId;
		this.actorEmail = actorEmail;
		this.targetId = targetId;
		this.targetEmail = targetEmail;
		this.action = action;
		this.detail = detail;
		this.reason = reason;
	}

	public UUID getId() {
		return id;
	}

	public String getActorEmail() {
		return actorEmail;
	}

	public UUID getTargetId() {
		return targetId;
	}

	public String getTargetEmail() {
		return targetEmail;
	}

	public String getAction() {
		return action;
	}

	public Map<String, Object> getDetail() {
		return detail;
	}

	public String getReason() {
		return reason;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}
}

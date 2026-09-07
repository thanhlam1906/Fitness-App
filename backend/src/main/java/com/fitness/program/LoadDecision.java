package com.fitness.program;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Bảng load_decisions, V1__init.sql — BẮT BUỘC LOG mọi thay đổi tải, lý do
 * cấu trúc (ruleId + ruleParams) để hiển thị và để debug. ruleParams giữ raw
 * JSON text như các cột jsonb khác trong codebase này.
 */
@Entity
@Table(name = "load_decisions")
public class LoadDecision {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "program_id", nullable = false)
	private UUID programId;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(name = "effective_from", nullable = false)
	private LocalDate effectiveFrom;

	@Column(nullable = false)
	private String direction;

	@Column(name = "delta_kg", precision = 6, scale = 2)
	private BigDecimal deltaKg;

	@Column(name = "rule_id", nullable = false)
	private String ruleId;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(name = "rule_params", columnDefinition = "jsonb", nullable = false)
	private String ruleParams;

	@Column(name = "message_vi", nullable = false)
	private String messageVi;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected LoadDecision() {
	}

	public LoadDecision(
			UUID userId, UUID programId, UUID exerciseId, LocalDate effectiveFrom, String direction,
			BigDecimal deltaKg, String ruleId, String ruleParams, String messageVi) {
		this.userId = userId;
		this.programId = programId;
		this.exerciseId = exerciseId;
		this.effectiveFrom = effectiveFrom;
		this.direction = direction;
		this.deltaKg = deltaKg;
		this.ruleId = ruleId;
		this.ruleParams = ruleParams;
		this.messageVi = messageVi;
	}

	public UUID getId() {
		return id;
	}

	public UUID getExerciseId() {
		return exerciseId;
	}

	public LocalDate getEffectiveFrom() {
		return effectiveFrom;
	}

	public String getDirection() {
		return direction;
	}

	public BigDecimal getDeltaKg() {
		return deltaKg;
	}

	public String getMessageVi() {
		return messageVi;
	}
}

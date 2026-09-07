package com.fitness.program;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/** Bảng programs, V1__init.sql. Chỉ 1 dòng status=ACTIVE mỗi user (unique index ở DB). */
@Entity
@Table(name = "programs")
public class Program {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "template_id", nullable = false)
	private UUID templateId;

	// {"<slug>": <kg>} — mức tạ khởi điểm từng bài, raw JSON text.
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", nullable = false)
	private String params;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "rest_days", columnDefinition = "smallint[]", nullable = false)
	private Short[] restDays = new Short[0];

	@Column(name = "start_date", nullable = false)
	private LocalDate startDate;

	@Column(nullable = false)
	private String status;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected Program() {
	}

	public Program(UUID userId, UUID templateId, String params, Short[] restDays, LocalDate startDate) {
		this.userId = userId;
		this.templateId = templateId;
		this.params = params;
		this.restDays = restDays;
		this.startDate = startDate;
		this.status = "ACTIVE";
	}

	public UUID getId() {
		return id;
	}

	public UUID getUserId() {
		return userId;
	}

	public UUID getTemplateId() {
		return templateId;
	}

	public String getStatus() {
		return status;
	}

	public void archive() {
		this.status = "ARCHIVED";
	}
}

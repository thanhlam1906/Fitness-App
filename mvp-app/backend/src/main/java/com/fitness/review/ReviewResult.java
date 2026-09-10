package com.fitness.review;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Bảng review_results, V1__init.sql. Analyzer ghi, backend chỉ đọc.
 * cue_text_vi là BẢN SAO tại thời điểm chấm — không join lại form_checks, vì
 * HLV sửa ngưỡng và text liên tục, kết quả cũ phải giữ nguyên câu đã nói.
 */
@Entity
@Table(name = "review_results")
public class ReviewResult {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "request_id", nullable = false)
	private UUID requestId;

	@Column(name = "form_check_id", nullable = false)
	private UUID formCheckId;

	@Column(nullable = false)
	private String verdict;

	@Column(precision = 3, scale = 2)
	private BigDecimal confidence;

	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb")
	private String measured;

	@Column(name = "cue_text_vi")
	private String cueTextVi;

	@Column(name = "is_primary", nullable = false)
	private boolean primary;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected ReviewResult() {
	}

	public UUID getId() {
		return id;
	}

	public UUID getFormCheckId() {
		return formCheckId;
	}

	public String getVerdict() {
		return verdict;
	}

	public BigDecimal getConfidence() {
		return confidence;
	}

	public String getMeasured() {
		return measured;
	}

	public String getCueTextVi() {
		return cueTextVi;
	}

	public boolean isPrimary() {
		return primary;
	}
}

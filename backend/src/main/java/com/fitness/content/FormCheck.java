package com.fitness.content;

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
 * Bảng form_checks, V1__init.sql. P7 ke-hoach-ky-thuat-v1.md: ngưỡng + text +
 * góc hợp lệ sống ở đây, admin sửa được không cần deploy. Công thức đo (metric)
 * chỉ là tên tham chiếu — code tính nằm ở analyzer, ngoài repo này.
 */
@Entity
@Table(name = "form_checks")
public class FormCheck {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	@Column(nullable = false)
	private String code;

	@Column(nullable = false)
	private String metric;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "valid_viewpoints", columnDefinition = "text[]", nullable = false)
	private String[] validViewpoints;

	// {"pass_below": 1.10, "warn_below": 1.30} hoặc {"pass_between": [10, 55]} — raw JSON text.
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", nullable = false)
	private String thresholds;

	@Column(name = "confidence_min", nullable = false, precision = 3, scale = 2)
	private BigDecimal confidenceMin;

	@Column(name = "cue_pass_vi")
	private String cuePassVi;

	@Column(name = "cue_warn_vi")
	private String cueWarnVi;

	@Column(name = "cue_fail_vi", nullable = false)
	private String cueFailVi;

	@Column(nullable = false)
	private short priority;

	@Column(name = "is_active", nullable = false)
	private boolean active = true;

	@Column(name = "updated_at", nullable = false)
	private Instant updatedAt = Instant.now();

	protected FormCheck() {
	}

	public FormCheck(
			UUID exerciseId, String code, String metric, String[] validViewpoints,
			String thresholds, BigDecimal confidenceMin, String cuePassVi, String cueWarnVi,
			String cueFailVi, short priority) {
		this.exerciseId = exerciseId;
		this.code = code;
		this.metric = metric;
		this.validViewpoints = validViewpoints;
		this.thresholds = thresholds;
		this.confidenceMin = confidenceMin;
		this.cuePassVi = cuePassVi;
		this.cueWarnVi = cueWarnVi;
		this.cueFailVi = cueFailVi;
		this.priority = priority;
	}

	public void update(
			String metric, String[] validViewpoints, String thresholds, BigDecimal confidenceMin,
			String cuePassVi, String cueWarnVi, String cueFailVi, short priority, boolean active) {
		this.metric = metric;
		this.validViewpoints = validViewpoints;
		this.thresholds = thresholds;
		this.confidenceMin = confidenceMin;
		this.cuePassVi = cuePassVi;
		this.cueWarnVi = cueWarnVi;
		this.cueFailVi = cueFailVi;
		this.priority = priority;
		this.active = active;
		this.updatedAt = Instant.now();
	}

	public UUID getId() {
		return id;
	}

	public UUID getExerciseId() {
		return exerciseId;
	}

	public String getCode() {
		return code;
	}

	public String getMetric() {
		return metric;
	}

	public String[] getValidViewpoints() {
		return validViewpoints;
	}

	public String getThresholds() {
		return thresholds;
	}

	public BigDecimal getConfidenceMin() {
		return confidenceMin;
	}

	public String getCuePassVi() {
		return cuePassVi;
	}

	public String getCueWarnVi() {
		return cueWarnVi;
	}

	public String getCueFailVi() {
		return cueFailVi;
	}

	public short getPriority() {
		return priority;
	}

	public boolean isActive() {
		return active;
	}
}

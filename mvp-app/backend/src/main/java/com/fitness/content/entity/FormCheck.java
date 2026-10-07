package com.fitness.content.entity;

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
 * Bảng form_checks: một khớp cần kiểm của bài (doc/design-cham-form-nguong-v1.md §2). Admin sửa
 * trên web, có hiệu lực ngay, không deploy. Cách đo nằm ở analyzer; ở đây chỉ có khoá số đo
 * (`metric`), góc quay, lúc đo, ngưỡng và câu nhắc. cue_pass_vi, cue_warn_vi còn trong bảng
 * nhưng không dùng nữa.
 */
@Entity
@Table(name = "form_checks")
public class FormCheck {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "exercise_id", nullable = false)
	private UUID exerciseId;

	// góc-số đo-lúc, máy tự sinh: UNIQUE (exercise_id, code) chặn khai báo trùng một khớp.
	@Column(nullable = false)
	private String code;

	@Column(nullable = false)
	private String metric;

	@JdbcTypeCode(SqlTypes.ARRAY)
	@Column(name = "valid_viewpoints", columnDefinition = "text[]", nullable = false)
	private String[] validViewpoints;

	@Column
	private String moment;

	// {"from": 80 | null, "to": 110 | null, "warn": 10} — raw JSON text như các cột jsonb khác.
	@JdbcTypeCode(SqlTypes.JSON)
	@Column(columnDefinition = "jsonb", nullable = false)
	private String thresholds;

	@Column(name = "confidence_min", nullable = false, precision = 3, scale = 2)
	private BigDecimal confidenceMin = new BigDecimal("0.70");

	@Column(name = "name_vi")
	private String nameVi;

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

	/** Gọi update(...) ngay sau đó để điền ngưỡng và chữ trước khi lưu. */
	public FormCheck(UUID exerciseId, String code, String metric, String view, String moment) {
		this.exerciseId = exerciseId;
		this.code = code;
		this.metric = metric;
		this.validViewpoints = new String[] {view};
		this.moment = moment;
	}

	/** Sửa ngưỡng, chữ, thứ tự; cũng là cách bật lại một khớp đã tắt cùng mã. */
	public void update(String thresholds, String nameVi, String cueFailVi, short priority) {
		this.thresholds = thresholds;
		this.nameVi = nameVi;
		this.cueFailVi = cueFailVi;
		this.priority = priority;
		this.active = true;
		this.updatedAt = Instant.now();
	}

	public void deactivate() {
		this.active = false;
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

	public String getView() {
		return validViewpoints.length > 0 ? validViewpoints[0] : null;
	}

	public String getMoment() {
		return moment;
	}

	public String getThresholds() {
		return thresholds;
	}

	public String getNameVi() {
		return nameVi;
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

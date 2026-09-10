package com.fitness.profile;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Bảng body_metrics, V1__init.sql. Một dòng mỗi ngày đo (UNIQUE user_id,
 * measured_on) — A3 nhập tay, màn Cài đặt cập nhật cân nặng theo thời gian.
 */
@Entity
@Table(name = "body_metrics")
public class BodyMetric {

	@Id
	@GeneratedValue
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(name = "height_cm", precision = 5, scale = 1)
	private BigDecimal heightCm;

	@Column(name = "weight_kg", precision = 5, scale = 2)
	private BigDecimal weightKg;

	@Column(name = "measured_on", nullable = false)
	private LocalDate measuredOn;

	@Column(name = "created_at", nullable = false, updatable = false)
	private Instant createdAt = Instant.now();

	protected BodyMetric() {
	}

	public BodyMetric(UUID userId, LocalDate measuredOn) {
		this.userId = userId;
		this.measuredOn = measuredOn;
	}

	public void apply(BigDecimal heightCm, BigDecimal weightKg) {
		if (heightCm != null) {
			this.heightCm = heightCm;
		}
		if (weightKg != null) {
			this.weightKg = weightKg;
		}
	}

	public BigDecimal getHeightCm() {
		return heightCm;
	}

	public BigDecimal getWeightKg() {
		return weightKg;
	}

	public LocalDate getMeasuredOn() {
		return measuredOn;
	}
}
